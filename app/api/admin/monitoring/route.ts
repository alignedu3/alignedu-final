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

type ConnectionState = {
  key: string;
  label: string;
  connected: boolean;
  detail: string;
  envKeys?: string[];
};

type CostSummaryCard = {
  key: string;
  label: string;
  value: number | null;
  displayValue: string;
  status: 'live' | 'connect_required';
  detail: string;
};

type TrafficSummaryCard = {
  key: string;
  label: string;
  value: number | null;
  displayValue: string;
  status: 'live' | 'connect_required';
  detail: string;
};

type CostSeriesPoint = {
  date: string;
  label: string;
  openai: number | null;
  supabase: number | null;
  vercel: number | null;
  cloudflare: number | null;
};

type TrafficSeriesPoint = {
  date: string;
  label: string;
  requests: number | null;
  cached: number | null;
  uncached: number | null;
  bandwidthMb: number | null;
};

type CloudflareDailyPoint = {
  date: string;
  requests: number;
  pageViews: number;
  uniques: number;
  bytes: number;
  cachedBytes: number;
  cachedRequests: number;
  threats: number;
};

type CloudflareTotals = {
  requests: number;
  pageViews: number;
  uniques: number;
  bytes: number;
  cachedBytes: number;
  cachedRequests: number;
  threats: number;
};

type CloudflareTrafficResult = {
  connected: boolean;
  detail: string;
  summaryCards: TrafficSummaryCard[];
  requestSeries: TrafficSeriesPoint[];
  bandwidthSeries: TrafficSeriesPoint[];
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

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function roundTo(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
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

function buildConnections() {
  const hasOpenAiUsageKey = Boolean(process.env.OPENAI_USAGE_ADMIN_KEY);
  const hasSupabaseManagement = Boolean(process.env.SUPABASE_MANAGEMENT_TOKEN && process.env.SUPABASE_PROJECT_REF);
  const hasVercelUsage = Boolean(process.env.VERCEL_ACCESS_TOKEN && process.env.VERCEL_TEAM_ID);
  const hasCloudflareUsage = Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID);
  const hasResendUsage = Boolean(process.env.RESEND_API_KEY);
  const hasRegistrarTracking = Boolean(process.env.DOMAIN_REGISTRAR_NAME || process.env.DOMAIN_RENEWAL_USD);

  const connections: ConnectionState[] = [
    {
      key: 'openai-billing',
      label: 'OpenAI Costs',
      connected: hasOpenAiUsageKey,
      detail: hasOpenAiUsageKey
        ? 'Usage and cost endpoints are ready to connect.'
        : 'Add OPENAI_USAGE_ADMIN_KEY to unlock billed and estimated OpenAI cost views.',
      envKeys: ['OPENAI_USAGE_ADMIN_KEY'],
    },
    {
      key: 'supabase-billing',
      label: 'Supabase Costs',
      connected: hasSupabaseManagement,
      detail: hasSupabaseManagement
        ? 'Supabase management metrics are ready to connect.'
        : 'Add SUPABASE_MANAGEMENT_TOKEN and SUPABASE_PROJECT_REF to unlock cost and usage tracking.',
      envKeys: ['SUPABASE_MANAGEMENT_TOKEN', 'SUPABASE_PROJECT_REF'],
    },
    {
      key: 'vercel-billing',
      label: 'Vercel Costs',
      connected: hasVercelUsage,
      detail: hasVercelUsage
        ? 'Vercel usage data is ready to connect.'
        : 'Add VERCEL_ACCESS_TOKEN and VERCEL_TEAM_ID to unlock hosting usage and billed cost.',
      envKeys: ['VERCEL_ACCESS_TOKEN', 'VERCEL_TEAM_ID'],
    },
    {
      key: 'cloudflare-traffic',
      label: 'Cloudflare Traffic',
      connected: hasCloudflareUsage,
      detail: hasCloudflareUsage
        ? 'Cloudflare analytics are ready to connect.'
        : 'Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID to unlock requests, threats, cache, and bandwidth.',
      envKeys: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ZONE_ID'],
    },
    {
      key: 'resend-usage',
      label: 'Resend Email Usage',
      connected: hasResendUsage,
      detail: hasResendUsage
        ? 'Email runtime is configured; billing usage can be layered in next.'
        : 'Add RESEND_API_KEY to track invite and reset email usage.',
      envKeys: ['RESEND_API_KEY'],
    },
    {
      key: 'registrar',
      label: 'Domain Renewal',
      connected: hasRegistrarTracking,
      detail: hasRegistrarTracking
        ? 'Registrar metadata is ready to display.'
        : 'Add DOMAIN_REGISTRAR_NAME and optionally DOMAIN_RENEWAL_USD to track domain renewal cost.',
      envKeys: ['DOMAIN_REGISTRAR_NAME', 'DOMAIN_RENEWAL_USD'],
    },
  ];

  return {
    connections,
    connectedCount: connections.filter((item) => item.connected).length,
  };
}

function buildCostCards(): CostSummaryCard[] {
  return [
    {
      key: 'openai-product',
      label: 'OpenAI Product',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on OpenAI usage/cost access.',
    },
    {
      key: 'openai-billed',
      label: 'OpenAI Billed',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on OpenAI billing connection.',
    },
    {
      key: 'supabase-costs',
      label: 'Supabase Costs',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Supabase management/billing connection.',
    },
    {
      key: 'vercel-costs',
      label: 'Vercel Costs',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Vercel usage access.',
    },
    {
      key: 'cloudflare-costs',
      label: 'Cloudflare Costs',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Cloudflare billing/analytics access.',
    },
    {
      key: 'total-costs',
      label: 'Total Costs',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Total monthly spend will appear once provider billing sources are connected.',
    },
  ];
}

function buildTrafficCards(): TrafficSummaryCard[] {
  return [
    {
      key: 'total-requests',
      label: 'Total Requests',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Cloudflare traffic analytics.',
    },
    {
      key: 'page-views',
      label: 'Page Views',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Cloudflare or web analytics connection.',
    },
    {
      key: 'unique-visitors',
      label: 'Unique Visitors',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Cloudflare or web analytics connection.',
    },
    {
      key: 'cache-hit-ratio',
      label: 'Cache Hit Ratio',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Cloudflare cache analytics.',
    },
    {
      key: 'threats-blocked',
      label: 'Threats Blocked',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Cloudflare security analytics.',
    },
  ];
}

function getCloudflareEnv() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!apiToken || !zoneId) {
    return null;
  }

  return { apiToken, zoneId };
}

async function fetchCloudflareTraffic(windowKeys: string[]): Promise<CloudflareTrafficResult> {
  const env = getCloudflareEnv();
  const emptyRequestSeries = buildEmptyTrafficSeries(windowKeys);
  const emptyBandwidthSeries = buildEmptyTrafficSeries(windowKeys);

  if (!env) {
    return {
      connected: false,
      detail: 'Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID to unlock requests, threats, cache, and bandwidth.',
      summaryCards: buildTrafficCards(),
      requestSeries: emptyRequestSeries,
      bandwidthSeries: emptyBandwidthSeries,
    };
  }

  const startDate = windowKeys[0];
  const endDate = new Date(`${windowKeys[windowKeys.length - 1]}T12:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const endDateKey = endDate.toISOString().slice(0, 10);

  const query = `
    query MonitoringTraffic($zoneTag: string!, $startDate: Date!, $endDate: Date!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          totals: httpRequests1dGroups(
            limit: 1
            filter: { date_geq: $startDate, date_lt: $endDate }
          ) {
            uniq {
              uniques
            }
            sum {
              requests
              pageViews
              bytes
              cachedBytes
              cachedRequests
              threats
            }
          }
          series: httpRequests1dGroups(
            limit: 100
            orderBy: [date_ASC]
            filter: { date_geq: $startDate, date_lt: $endDate }
          ) {
            dimensions {
              date
            }
            uniq {
              uniques
            }
            sum {
              requests
              pageViews
              bytes
              cachedBytes
              cachedRequests
              threats
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.apiToken}`,
    },
    body: JSON.stringify({
      query,
      variables: {
        zoneTag: env.zoneId,
        startDate,
        endDate: endDateKey,
      },
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Cloudflare analytics request failed (${response.status}).`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    const message = payload.errors[0]?.message || 'Cloudflare analytics request failed.';
    throw new Error(message);
  }

  const zone = payload?.data?.viewer?.zones?.[0];
  if (!zone) {
    throw new Error('Cloudflare zone analytics not found for the configured zone.');
  }

  const totalBucket = zone.totals?.[0];
  const totals: CloudflareTotals = {
    requests: Number(totalBucket?.sum?.requests || 0),
    pageViews: Number(totalBucket?.sum?.pageViews || 0),
    uniques: Number(totalBucket?.uniq?.uniques || 0),
    bytes: Number(totalBucket?.sum?.bytes || 0),
    cachedBytes: Number(totalBucket?.sum?.cachedBytes || 0),
    cachedRequests: Number(totalBucket?.sum?.cachedRequests || 0),
    threats: Number(totalBucket?.sum?.threats || 0),
  };

  const dailyByDate = new Map<string, CloudflareDailyPoint>();
  for (const key of windowKeys) {
    dailyByDate.set(key, {
      date: key,
      requests: 0,
      pageViews: 0,
      uniques: 0,
      bytes: 0,
      cachedBytes: 0,
      cachedRequests: 0,
      threats: 0,
    });
  }

  for (const point of zone.series || []) {
    const key = point?.dimensions?.date;
    if (!key || !dailyByDate.has(key)) continue;
    dailyByDate.set(key, {
      date: key,
      requests: Number(point?.sum?.requests || 0),
      pageViews: Number(point?.sum?.pageViews || 0),
      uniques: Number(point?.uniq?.uniques || 0),
      bytes: Number(point?.sum?.bytes || 0),
      cachedBytes: Number(point?.sum?.cachedBytes || 0),
      cachedRequests: Number(point?.sum?.cachedRequests || 0),
      threats: Number(point?.sum?.threats || 0),
    });
  }

  const cacheHitRatio = totals.requests > 0 ? roundTo((totals.cachedRequests / totals.requests) * 100, 1) : 0;
  const requestSeries = windowKeys.map((key) => {
    const point = dailyByDate.get(key)!;
    const uncachedRequests = Math.max(point.requests - point.cachedRequests, 0);
    return {
      date: key,
      label: formatCompactDate(key),
      requests: point.requests,
      cached: point.cachedRequests,
      uncached: uncachedRequests,
      bandwidthMb: roundTo(point.bytes / (1024 * 1024), 1),
    };
  });

  const bandwidthSeries = requestSeries.map((point) => ({
    ...point,
  }));

  return {
    connected: true,
    detail: 'Cloudflare traffic analytics are connected and reporting live zone metrics.',
    summaryCards: [
      {
        key: 'total-requests',
        label: 'Total Requests',
        value: totals.requests,
        displayValue: formatNumber(totals.requests),
        status: 'live',
        detail: 'Cloudflare zone requests for the selected window.',
      },
      {
        key: 'page-views',
        label: 'Page Views',
        value: totals.pageViews,
        displayValue: formatNumber(totals.pageViews),
        status: 'live',
        detail: 'Successful HTML page views reported by Cloudflare.',
      },
      {
        key: 'unique-visitors',
        label: 'Unique Visitors',
        value: totals.uniques,
        displayValue: formatNumber(totals.uniques),
        status: 'live',
        detail: 'Unique visitors reported by Cloudflare for the selected window.',
      },
      {
        key: 'cache-hit-ratio',
        label: 'Cache Hit Ratio',
        value: cacheHitRatio,
        displayValue: `${formatNumber(cacheHitRatio)}%`,
        status: 'live',
        detail: 'Share of requests served from Cloudflare cache.',
      },
      {
        key: 'threats-blocked',
        label: 'Threats Blocked',
        value: totals.threats,
        displayValue: formatNumber(totals.threats),
        status: 'live',
        detail: 'Threat requests reported by Cloudflare for the selected window.',
      },
    ],
    requestSeries,
    bandwidthSeries,
  };
}

function buildEmptyCostSeries(windowKeys: string[]): CostSeriesPoint[] {
  return windowKeys.map((key) => ({
    date: key,
    label: formatCompactDate(key),
    openai: null,
    supabase: null,
    vercel: null,
    cloudflare: null,
  }));
}

function buildEmptyTrafficSeries(windowKeys: string[]): TrafficSeriesPoint[] {
  return windowKeys.map((key) => ({
    date: key,
    label: formatCompactDate(key),
    requests: null,
    cached: null,
    uncached: null,
    bandwidthMb: null,
  }));
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
    const connectionState = buildConnections();
    let cloudflareTraffic = {
      connected: false,
      detail: 'Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID to unlock requests, threats, cache, and bandwidth.',
      summaryCards: buildTrafficCards(),
      requestSeries: buildEmptyTrafficSeries(windowKeys),
      bandwidthSeries: buildEmptyTrafficSeries(windowKeys),
    } as CloudflareTrafficResult;

    try {
      cloudflareTraffic = await fetchCloudflareTraffic(windowKeys);
    } catch (cloudflareError: any) {
      console.error('Cloudflare monitoring fetch error:', cloudflareError);
      cloudflareTraffic = {
        connected: false,
        detail: cloudflareError?.message || 'Cloudflare analytics could not be loaded.',
        summaryCards: buildTrafficCards().map((card) =>
          card.key === 'total-requests'
            ? { ...card, detail: cloudflareError?.message || card.detail }
            : card
        ),
        requestSeries: buildEmptyTrafficSeries(windowKeys),
        bandwidthSeries: buildEmptyTrafficSeries(windowKeys),
      };
    }

    const hydratedConnections = connectionState.connections.map((item) => {
      if (item.key !== 'cloudflare-traffic') return item;
      return {
        ...item,
        connected: cloudflareTraffic.connected,
        detail: cloudflareTraffic.detail,
      };
    });

    const connectedProviders = hydratedConnections.filter((item) => item.connected).length;
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
      connections: hydratedConnections,
      sync: {
        generatedAt: new Date().toISOString(),
        connectedProviders,
        totalProviders: hydratedConnections.length,
      },
      infrastructureCosts: {
        summaryCards: buildCostCards(),
        dailySeries: buildEmptyCostSeries(windowKeys),
        cumulativeSeries: buildEmptyCostSeries(windowKeys).map((point) => ({
          ...point,
          total: null,
        })),
      },
      httpTraffic: {
        summaryCards: cloudflareTraffic.summaryCards,
        requestSeries: cloudflareTraffic.requestSeries,
        bandwidthSeries: cloudflareTraffic.bandwidthSeries,
      },
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
