import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { calculateLessonScore, getLatestLessonTrend, type AnalysisReport, type ProfileRecord } from '@/lib/dashboardData';
import { captureRouteException } from '@/lib/sentryRoute';

const MONITORING_OWNER_EMAIL = 'ryan@alignedu.net';

type MonitoringReadiness = {
  key: string;
  label: string;
  healthy: boolean;
  detail: string;
};

type MonitoringSeriesPoint = {
  date: string;
  label: string;
  lessons: number;
  observations: number;
  averageScore: number;
};

type MonitoringActivityRow = {
  id: string;
  name: string;
  role: string;
  lessons: number;
  adminObservations: number;
  averageScore: number;
  trend: number;
  latestSubmittedAt: string | null;
};

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server configuration error: Supabase service credentials are not set.');
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

function parseWindowDays(value: string | null) {
  const parsed = Number(value);
  return parsed === 14 || parsed === 30 ? parsed : 7;
}

function buildDateKeys(days: number) {
  const now = new Date();
  const keys: string[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setHours(12, 0, 0, 0);
    day.setDate(now.getDate() - offset);
    keys.push(day.toISOString().slice(0, 10));
  }

  return keys;
}

function isAdminObservation(report: AnalysisReport) {
  const text = `${report.result || ''}\n${report.analysis_result || ''}`.toLowerCase();
  return text.includes('admin observation') || text.includes('submitted by:');
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function formatCompactDate(dateKey: string) {
  const parsed = new Date(`${dateKey}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? dateKey
    : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildReadiness(): MonitoringReadiness[] {
  const sentryConfigured = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN);
  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const publicSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const serviceSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return [
    {
      key: 'sentry',
      label: 'Sentry Monitoring',
      healthy: sentryConfigured,
      detail: sentryConfigured ? 'Error capture is configured for browser and server monitoring.' : 'Sentry DSN is missing.',
    },
    {
      key: 'openai',
      label: 'OpenAI Runtime',
      healthy: openAiConfigured,
      detail: openAiConfigured ? 'Lesson analysis runtime is configured.' : 'OPENAI_API_KEY is missing.',
    },
    {
      key: 'supabase-public',
      label: 'Supabase Public Auth',
      healthy: publicSupabaseConfigured,
      detail: publicSupabaseConfigured ? 'Browser authentication can initialize cleanly.' : 'Public Supabase env vars are incomplete.',
    },
    {
      key: 'supabase-service',
      label: 'Supabase Service Access',
      healthy: serviceSupabaseConfigured,
      detail: serviceSupabaseConfigured ? 'Protected dashboard routes can query secure app data.' : 'SUPABASE_SERVICE_ROLE_KEY is missing.',
    },
  ];
}

export async function GET(request: NextRequest) {
  const days = parseWindowDays(request.nextUrl.searchParams.get('days'));
  let sentryUser: { id?: string | null; email?: string | null; role?: string | null } | null = null;

  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await serverSupabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    sentryUser = {
      id: user.id,
      email: user.email ?? null,
      role: null,
    };

    const { data: callerProfile, error: callerProfileError } = await serverSupabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', user.id)
      .maybeSingle();

    if (callerProfileError) {
      return NextResponse.json({ success: false, error: callerProfileError.message }, { status: 500 });
    }

    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    sentryUser.role = callerProfile?.role || null;

    if ((user.email || '').toLowerCase() !== MONITORING_OWNER_EMAIL) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const serviceSupabase = getServiceSupabase();

    const [{ data: profiles, error: profilesError }, analysesResult] = await Promise.all([
      serviceSupabase
        .from('profiles')
        .select('id, name, email, role'),
      serviceSupabase
        .from('analyses')
        .select('id, user_id, created_at, title, subject, grade, coverage_score, clarity_rating, engagement_level, gaps_detected, result, analysis_result')
        .order('created_at', { ascending: false }),
    ]);

    const { data: analyses, error: analysesError } = analysesResult;

    if (profilesError) {
      return NextResponse.json({ success: false, error: profilesError.message }, { status: 500 });
    }
    if (analysesError) {
      return NextResponse.json({ success: false, error: analysesError.message }, { status: 500 });
    }

    const profileList = (profiles || []) as ProfileRecord[];
    const reportList = (analyses || []) as AnalysisReport[];
    const profileById = new Map(profileList.map((profile) => [profile.id, profile]));
    const windowKeys = buildDateKeys(days);
    const windowKeySet = new Set(windowKeys);
    const reportsInWindow = reportList.filter((report) => {
      if (!report.created_at) return false;
      return windowKeySet.has(report.created_at.slice(0, 10));
    });

    const totalLessons = reportList.length;
    const totalTeachers = profileList.filter((profile) => profile.role === 'teacher').length;
    const totalAdmins = profileList.filter((profile) => profile.role === 'admin' || profile.role === 'super_admin').length;
    const activeTeachers = new Set(
      reportsInWindow
        .map((report) => report.user_id)
        .filter((value): value is string => Boolean(value && profileById.get(value)?.role === 'teacher'))
    ).size;
    const observationCount = reportsInWindow.filter(isAdminObservation).length;
    const averageScore = average(reportsInWindow.map((report) => calculateLessonScore(report)));

    const seriesMap = new Map<string, { lessons: number; observations: number; scores: number[] }>();
    windowKeys.forEach((key) => {
      seriesMap.set(key, { lessons: 0, observations: 0, scores: [] });
    });

    reportsInWindow.forEach((report) => {
      if (!report.created_at) return;
      const key = report.created_at.slice(0, 10);
      const bucket = seriesMap.get(key);
      if (!bucket) return;
      bucket.lessons += 1;
      bucket.scores.push(calculateLessonScore(report));
      if (isAdminObservation(report)) {
        bucket.observations += 1;
      }
    });

    const series: MonitoringSeriesPoint[] = windowKeys.map((key) => {
      const bucket = seriesMap.get(key)!;
      return {
        date: key,
        label: formatCompactDate(key),
        lessons: bucket.lessons,
        observations: bucket.observations,
        averageScore: average(bucket.scores),
      };
    });

    const activityByUser = new Map<string, AnalysisReport[]>();
    reportList.forEach((report) => {
      if (!report.user_id) return;
      const existing = activityByUser.get(report.user_id) || [];
      existing.push(report);
      activityByUser.set(report.user_id, existing);
    });

    const recentActivity: MonitoringActivityRow[] = Array.from(activityByUser.entries())
      .map(([userId, userReports]) => {
        const recentReports = userReports.filter((report) => {
          if (!report.created_at) return false;
          return windowKeySet.has(report.created_at.slice(0, 10));
        });
        const latestSubmittedAt = userReports[0]?.created_at ?? null;

        return {
          id: userId,
          name: profileById.get(userId)?.name || profileById.get(userId)?.email || 'User',
          role: profileById.get(userId)?.role || 'teacher',
          lessons: recentReports.length,
          adminObservations: recentReports.filter(isAdminObservation).length,
          averageScore: average(recentReports.map((report) => calculateLessonScore(report))),
          trend: getLatestLessonTrend(userReports),
          latestSubmittedAt,
        };
      })
      .filter((row) => row.lessons > 0)
      .sort((a, b) => {
        if (b.lessons !== a.lessons) return b.lessons - a.lessons;
        return (b.latestSubmittedAt || '').localeCompare(a.latestSubmittedAt || '');
      })
      .slice(0, 8);

    const readiness = buildReadiness();
    const strongTeachers = recentActivity.filter((row) => row.role === 'teacher' && row.averageScore >= 85).length;
    const atRiskTeachers = recentActivity.filter((row) => row.role === 'teacher' && row.averageScore > 0 && row.averageScore < 75).length;

    return NextResponse.json({
      success: true,
      caller: {
        id: callerProfile?.id || user.id,
        name: callerProfile?.name || null,
        role: callerProfile?.role || null,
      },
      summary: {
        days,
        totalLessons,
        lessonsInWindow: reportsInWindow.length,
        totalTeachers,
        totalAdmins,
        activeTeachers,
        observationCount,
        averageScore,
        strongTeachers,
        atRiskTeachers,
      },
      series,
      recentActivity,
      readiness,
    });
  } catch (error: any) {
    console.error('Admin monitoring route error:', error);
    captureRouteException(error, {
      route: 'api/admin/monitoring',
      user: sentryUser,
    });
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
