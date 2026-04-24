'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  buildAdminSupportPlanForTeacher,
  buildSampleAnalysisReports,
  getDashboardSummary,
  calculateLessonScore,
  getLatestLessonTrend,
  SAMPLE_PREVIEW_TEACHER_ID,
  type AnalysisReport,
  type ProfileRecord,
} from '@/lib/dashboardData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import ToastViewport, { type ToastItem } from '@/components/ToastViewport';
import { fetchJsonWithTimeout } from '@/lib/fetchJsonWithTimeout';
import ProtectedPageState from '@/components/ProtectedPageState';

type TrendTerm = 'full_year' | 'fall' | 'spring';

function parseReportDate(report: AnalysisReport) {
  const raw = report.date ?? report.created_at?.slice(0, 10);
  if (!raw) return null;
  const parsed = new Date(`${raw}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getSchoolYearLabel(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 7 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function isWithinSelectedTerm(date: Date, term: TrendTerm) {
  const month = date.getMonth();
  if (term === 'full_year') return true;
  if (term === 'fall') return month >= 7 && month <= 11;
  return month >= 0 && month <= 4;
}

function formatTrendAxisLabel(value: string | number) {
  if (typeof value !== 'string') return String(value);
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatRoleLabel(role?: string | null) {
  if (!role) return 'Admin';
  if (role === 'super_admin') return 'Super Admin';
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AdminDashboard() {
  const [dbReports, setDbReports] = useState<AnalysisReport[]>([]);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [visibleAdminIds, setVisibleAdminIds] = useState<string[]>([]);
  const [managedTeachers, setManagedTeachers] = useState<Array<{ admin_id: string; teacher_id: string }>>([]);
  const [managedAdmins, setManagedAdmins] = useState<Array<{ parent_admin_id: string; child_admin_id: string }>>([]);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [modalType, setModalType] = useState<null | 'quality' | 'lessons' | 'strong' | 'atrisk'>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [openActionsForId, setOpenActionsForId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');
  const [selectedTrendTerm, setSelectedTrendTerm] = useState<TrendTerm>('full_year');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedAdminId = searchParams ? searchParams.get('adminId') : null;

  const pushToast = (message: string, tone: ToastItem['tone'] = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  };

  const handleObserveLesson = () => {
    router.push('/admin/observe');
  };

  const handleOpenDistrictDashboard = () => {
    router.push('/admin/district');
  };

  const handleOpenMonitoringDashboard = () => {
    router.push('/admin/monitoring');
  };

  const navigateToUserDashboard = (userId: string, role?: string | null, returnSection?: 'team' | 'performance') => {
    if (userId.startsWith('sample-')) return;
    const queryParts = [
      ...(returnSection ? [`from=${returnSection}`] : []),
      ...(selectedAdminId ? [`adminId=${selectedAdminId}`] : []),
    ];
    const params = queryParts.length ? `?${queryParts.join('&')}` : '';
    if (role === 'admin' || role === 'super_admin') {
      router.push(`/admin?adminId=${userId}`);
      return;
    }
    router.push(`/admin/teacher/${userId}${params}`);
  };

  const loadDashboard = useCallback(async () => {
    try {
      setLoadError('');
      const { response, data } = await fetchJsonWithTimeout<{
        success: boolean;
        error?: string;
        caller?: { id?: string; email?: string | null; role?: string | null };
        visibility?: { adminIds?: string[] };
        profiles?: ProfileRecord[];
        managedTeachers?: Array<{ admin_id: string; teacher_id: string }>;
        managedAdmins?: Array<{ parent_admin_id: string; child_admin_id: string }>;
        analyses?: AnalysisReport[];
      }>(`/api/admin/dashboard${selectedAdminId ? `?adminId=${encodeURIComponent(selectedAdminId)}` : ''}`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.status === 401) {
        window.location.replace('/login');
        return;
      }

      if (response.status === 403) {
        window.location.replace('/dashboard');
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to load admin dashboard.');
      }

      setCurrentUserId(data.caller?.id ?? null);
      setCurrentUserEmail(data.caller?.email ?? null);
      setCurrentUserRole(data.caller?.role ?? null);
      setVisibleAdminIds((data.visibility?.adminIds || []) as string[]);
      setProfiles((data.profiles || []) as ProfileRecord[]);
      setManagedTeachers((data.managedTeachers || []) as Array<{ admin_id: string; teacher_id: string }>);
      setManagedAdmins((data.managedAdmins || []) as Array<{ parent_admin_id: string; child_admin_id: string }>);

      const toNumber = (value: unknown, fallback = 0) => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) return parsed;
        }
        return fallback;
      };

      const normalizedReports = (data.analyses ?? []).map((r: AnalysisReport) => ({
        ...r,
        date: r.created_at?.slice(0, 10),
        coverage: toNumber(r.coverage_score, 75),
        clarity: toNumber(r.clarity_rating, 75),
        engagement: toNumber(r.engagement_level, 75),
        gaps: toNumber(r.gaps_detected, 0),
      }));

      setDbReports(normalizedReports);
    } catch (err) {
      console.error('Admin dashboard load error:', err);
      setLoadError(err instanceof Error ? err.message : 'Unable to load admin dashboard.');
    } finally {
      setReady(true);
    }
  }, [selectedAdminId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [selectedAdminId]);

  useEffect(() => {
    const checkScreen = () => setIsNarrowScreen(window.innerWidth <= 768);
    checkScreen();
    setChartReady(true);
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const reports = dbReports;
  const canAccessMonitoring = currentUserRole === 'super_admin' && currentUserEmail === 'ryan@alignedu.net';
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const activeAdminId = selectedAdminId || currentUserId;
  const activeAdminProfile = activeAdminId ? profileById.get(activeAdminId) : undefined;
  const activeAdminName =
    activeAdminProfile?.name ||
    activeAdminProfile?.email ||
    (currentUserRole === 'super_admin' && selectedAdminId ? 'Selected Admin' : 'Admin');
  const isViewingAnotherAdmin =
    currentUserRole === 'super_admin' &&
    !!selectedAdminId &&
    selectedAdminId !== currentUserId;
  const isSampleEntityId = (id: string | null | undefined) => Boolean(id && id.startsWith('sample-'));
  const canOpenSampleTeacher = (id: string | null | undefined) => id === SAMPLE_PREVIEW_TEACHER_ID;
  const isSampleMode = managedTeachers.length === 0 && managedAdmins.length === 0 && reports.length === 0;

  const sampleProfiles = useMemo<ProfileRecord[]>(() => {
    const rootAdminId = activeAdminId || 'sample-root-admin';
    const rootAdminName = activeAdminName || 'Admin';

    return [
      { id: rootAdminId, name: rootAdminName, role: currentUserRole || 'admin' },
      { id: 'sample-admin-1', name: 'Assistant Principal Jordan', role: 'admin' },
      { id: 'sample-teacher-1', name: 'Ms. Carter', role: 'teacher' },
      { id: 'sample-teacher-2', name: 'Mr. Evans', role: 'teacher' },
      { id: 'sample-teacher-3', name: 'Dr. Lee', role: 'teacher' },
    ];
  }, [activeAdminId, activeAdminName, currentUserRole]);

  const sampleManagedAdmins = useMemo(
    () => (activeAdminId ? [{ parent_admin_id: activeAdminId, child_admin_id: 'sample-admin-1' }] : []),
    [activeAdminId]
  );

  const sampleManagedTeachers = useMemo(
    () => (
      activeAdminId
        ? [
            { admin_id: activeAdminId, teacher_id: 'sample-teacher-1' },
            { admin_id: activeAdminId, teacher_id: 'sample-teacher-2' },
            { admin_id: 'sample-admin-1', teacher_id: 'sample-teacher-3' },
          ]
        : []
    ),
    [activeAdminId]
  );

  const sampleVisibleAdminIds = useMemo(
    () => (activeAdminId ? [activeAdminId, 'sample-admin-1'] : ['sample-admin-1']),
    [activeAdminId]
  );

  const sampleAnalysisReports = useMemo<AnalysisReport[]>(() => buildSampleAnalysisReports(), []);
  const dashboardReports = isSampleMode ? sampleAnalysisReports : reports;
  const dashboardProfiles = isSampleMode ? sampleProfiles : profiles;
  const dashboardProfileById = useMemo(() => new Map(dashboardProfiles.map((p) => [p.id, p])), [dashboardProfiles]);
  const dashboardManagedTeachers = isSampleMode ? sampleManagedTeachers : managedTeachers;
  const dashboardManagedAdmins = isSampleMode ? sampleManagedAdmins : managedAdmins;
  const dashboardVisibleAdminIds = isSampleMode ? sampleVisibleAdminIds : visibleAdminIds;
  const directTeacherPerformanceIds = useMemo(
    () =>
      activeAdminId
        ? dashboardManagedTeachers
            .filter((link) => link.admin_id === activeAdminId)
            .map((link) => link.teacher_id)
            .filter((id) => dashboardProfileById.get(id)?.role === 'teacher')
        : [],
    [activeAdminId, dashboardManagedTeachers, dashboardProfileById]
  );
  const parentViewTeachingAdminIds = useMemo(
    () =>
      activeAdminId
        ? dashboardManagedAdmins
            .filter((link) => link.parent_admin_id === activeAdminId)
            .map((link) => link.child_admin_id)
            .filter((id) => {
              const role = dashboardProfileById.get(id)?.role;
              return role === 'admin' || role === 'super_admin';
            })
        : [],
    [activeAdminId, dashboardManagedAdmins, dashboardProfileById]
  );
  const teacherPerformanceUserIds = useMemo(
    () => new Set([...directTeacherPerformanceIds, ...parentViewTeachingAdminIds]),
    [directTeacherPerformanceIds, parentViewTeachingAdminIds]
  );
  const teacherPerformanceReports = useMemo(
    () =>
      dashboardReports.filter((report) => {
        if (!report.user_id) return false;
        return teacherPerformanceUserIds.has(report.user_id);
      }),
    [dashboardReports, teacherPerformanceUserIds]
  );
  const summary = getDashboardSummary(dashboardReports);
  const schoolYearOptions = useMemo(() => {
    const labels = new Set<string>();
    dashboardReports.forEach((report) => {
      const parsed = parseReportDate(report);
      if (!parsed) return;
      labels.add(getSchoolYearLabel(parsed));
    });
    return Array.from(labels).sort((a, b) => b.localeCompare(a));
  }, [dashboardReports]);

  useEffect(() => {
    if (!schoolYearOptions.length) {
      if (selectedSchoolYear) setSelectedSchoolYear('');
      return;
    }
    if (!selectedSchoolYear || !schoolYearOptions.includes(selectedSchoolYear)) {
      setSelectedSchoolYear(schoolYearOptions[0]);
    }
  }, [schoolYearOptions, selectedSchoolYear]);

  const trendReports = useMemo(() => {
    if (!selectedSchoolYear) return teacherPerformanceReports;
    return teacherPerformanceReports.filter((report) => {
      const parsed = parseReportDate(report);
      if (!parsed) return false;
      return getSchoolYearLabel(parsed) === selectedSchoolYear && isWithinSelectedTerm(parsed, selectedTrendTerm);
    });
  }, [selectedSchoolYear, selectedTrendTerm, teacherPerformanceReports]);

  const trendLessonCount = trendReports.length;
  const trendTeacherCount = useMemo(() => {
    const teacherIds = new Set<string>();
    trendReports.forEach((report) => {
      if (report.user_id) teacherIds.add(report.user_id);
    });
    return teacherIds.size;
  }, [trendReports]);

  const TEACHER_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#84cc16'];

  const getStablePaletteColor = (key: string, palette: string[]) => {
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    return palette[Math.abs(hash) % palette.length];
  };

  const getPointCountForKey = (rows: Array<Record<string, string | number>>, key: string) => {
    return rows.reduce((count, row) => {
      const value = row[key];
      return typeof value === 'number' && Number.isFinite(value) ? count + 1 : count;
    }, 0);
  };

  const teacherTrendData = useMemo(() => {
    const getTeacherName = (r: AnalysisReport) => {
      const profile = r.user_id ? dashboardProfileById.get(r.user_id) : undefined;
      if (profile?.name) return profile.name;
      if (r.teacher_name) return r.teacher_name;
      if (r.name) return r.name;
      return 'Unknown';
    };
    const reportsByTeacher = new Map<string, AnalysisReport[]>();

    trendReports.forEach((report) => {
      const teacher = getTeacherName(report);
      const existing = reportsByTeacher.get(teacher) || [];
      existing.push(report);
      reportsByTeacher.set(teacher, existing);
    });

    const sortOldestFirst = (a: AnalysisReport, b: AnalysisReport) => {
      const aDate = parseReportDate(a)?.getTime() ?? 0;
      const bDate = parseReportDate(b)?.getTime() ?? 0;
      return aDate - bDate;
    };

    const orderedTeachers = Array.from(reportsByTeacher.entries()).map(([teacher, reports]) => ({
      teacher,
      reports: [...reports].sort(sortOldestFirst),
    }));

    const maxLessonCount = orderedTeachers.reduce(
      (count, entry) => Math.max(count, entry.reports.length),
      0
    );

    return Array.from({ length: maxLessonCount }, (_, index) => {
      const row: Record<string, string | number> = {
        date: `Lesson ${index + 1}`,
      };

      orderedTeachers.forEach(({ teacher, reports }) => {
        const report = reports[index];
        if (!report) return;
        row[teacher] = calculateLessonScore(report);
      });

      return row;
    });
  }, [dashboardProfileById, trendReports]);

  const teacherLineKeys = useMemo(() => {
    const keys = new Set<string>();
    teacherTrendData.forEach(entry => {
      Object.keys(entry).forEach(k => { if (k !== 'date') keys.add(k); });
    });
    return Array.from(keys).filter((key) => getPointCountForKey(teacherTrendData, key) >= 2);
  }, [teacherTrendData]);

  const trendChartHeight = isNarrowScreen ? 230 : teacherTrendData.length > 22 ? 320 : 280;
  const trendMinTickGap = teacherTrendData.length > 22 ? 40 : teacherTrendData.length > 14 ? 28 : isNarrowScreen ? 20 : 10;

  const lessonRows = useMemo(() =>
    [...dashboardReports]
      .map((r) => {
        const p = r.user_id ? dashboardProfileById.get(r.user_id) : undefined;
        const teacher = p?.name ?? r.teacher_name ?? r.name ?? 'Unknown';
        return {
          id: r.id ?? Math.random(),
          teacherId: r.user_id ?? null,
          teacher,
          date: r.date ?? r.created_at?.slice(0, 10) ?? '—',
          score: calculateLessonScore(r),
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)),
  [dashboardProfileById, dashboardReports]);

  const teacherStats = useMemo(() => {
    const map: Record<string, AnalysisReport[]> = {};

    teacherPerformanceReports.forEach((r) => {
      const key = r.user_id;
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });

    const getReportTimestamp = (report: AnalysisReport) => {
      const raw = report.date || report.created_at || '';
      const parsed = new Date(raw).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return Object.entries(map).map(([id, reps]) => {
      const profile = dashboardProfileById.get(id);
      const orderedReports = [...reps].sort((a, b) => getReportTimestamp(b) - getReportTimestamp(a));
      const scores = orderedReports.map(r => calculateLessonScore(r));
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const trend = getLatestLessonTrend(orderedReports);

      let teacherName = 'Unknown Teacher';
      if (profile?.name) {
        teacherName = profile.name;
      } else if (orderedReports?.length && orderedReports[0]?.teacher_name) {
        teacherName = orderedReports[0].teacher_name;
      } else if (orderedReports?.length && orderedReports[0]?.name) {
        teacherName = orderedReports[0].name;
      }

      return {
        id,
        name: teacherName,
        avgScore: Math.round(avg),
        count: reps.length,
        trend: Math.round(trend),
        needsAttention: avg < 75,
      };
    });
  }, [dashboardProfileById, teacherPerformanceReports]);

  const atRiskTeachers = teacherStats
    .filter(t => t.needsAttention)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 3);

  const hierarchyRows = useMemo(() => {
    const adminIds = dashboardVisibleAdminIds.filter((id) => {
      const role = dashboardProfileById.get(id)?.role;
      return role === 'admin' || role === 'super_admin';
    });

    return adminIds
      .map((adminId) => {
        const adminProfile = dashboardProfileById.get(adminId);
        const childAdminIds = dashboardManagedAdmins
          .filter((link) => link.parent_admin_id === adminId)
          .map((link) => link.child_admin_id)
          .filter((id) => !!dashboardProfileById.get(id));

        const teacherIds = dashboardManagedTeachers
          .filter((link) => link.admin_id === adminId)
          .map((link) => link.teacher_id)
          .filter((id) => dashboardProfileById.get(id)?.role === 'teacher');

        return {
          id: adminId,
          name: adminProfile?.name || adminProfile?.email || 'Admin',
          role: adminProfile?.role || 'admin',
          childAdmins: childAdminIds
            .map((id) => dashboardProfileById.get(id))
            .filter((p): p is ProfileRecord => Boolean(p))
            .map((p) => ({ id: p.id, name: p.name || p.email || 'Admin', role: p.role })),
          teachers: teacherIds
            .map((id) => dashboardProfileById.get(id))
            .filter((p): p is ProfileRecord => Boolean(p))
            .map((p) => ({ id: p.id, name: p.name || p.email || 'Teacher' })),
        };
      })
      .sort((a, b) => {
        if (currentUserId && a.id === currentUserId) return -1;
        if (currentUserId && b.id === currentUserId) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [currentUserId, dashboardManagedAdmins, dashboardManagedTeachers, dashboardProfileById, dashboardVisibleAdminIds]);

  const strongCount = teacherStats.filter(t => !t.needsAttention).length;
  const supportCount = teacherStats.filter(t => t.needsAttention).length;

  // Average of each teacher's average — every teacher contributes equally
  const adminQualityScore = teacherStats.length
    ? Math.round(teacherStats.reduce((sum, t) => sum + t.avgScore, 0) / teacherStats.length)
    : summary.averageScore;

  const systemInsight =
    adminQualityScore < 75
      ? "System performance is declining due to gaps in lesson closure and concept reinforcement."
      : "Instructional quality is strong with consistent standards alignment.";

  const adminSupportPlans = useMemo(() => {
    const reportsByTeacher = new Map<string, AnalysisReport[]>();
    dashboardReports.forEach((report) => {
      if (!report.user_id) return;
      const existing = reportsByTeacher.get(report.user_id) || [];
      existing.push(report);
      reportsByTeacher.set(report.user_id, existing);
    });

    return teacherStats
      .map((teacher) => {
        const plan = buildAdminSupportPlanForTeacher(
          teacher.name,
          reportsByTeacher.get(teacher.id) || [],
          teacher.id
        );
        if (!plan) return null;
        return {
          ...plan,
          avgScore: teacher.avgScore,
          trend: teacher.trend,
          needsAttention: teacher.needsAttention,
        };
      })
      .filter((plan): plan is NonNullable<typeof plan> => Boolean(plan))
      .sort((a, b) => {
        const aPriority = a.requiresPrioritySupport ? 1 : 0;
        const bPriority = b.requiresPrioritySupport ? 1 : 0;
        if (aPriority !== bPriority) return bPriority - aPriority;
        const aSeverity = a.supportPriorityScore ?? 0;
        const bSeverity = b.supportPriorityScore ?? 0;
        if (aSeverity !== bSeverity) return bSeverity - aSeverity;
        return a.avgScore - b.avgScore;
      });
  }, [dashboardReports, teacherStats]);

  const recommendedSupportPlan = useMemo(() => {
    const primary = adminSupportPlans.find((plan) => plan.requiresPrioritySupport);
    if (!primary) {
      return {
        teacherName: 'Instructional Team',
        summary: 'No individual teacher currently meets the threshold for priority support.',
        priorityReason: 'Current lesson data does not show a teacher with a significant decline, multiple content gaps, or a low enough recent score to justify naming one priority teacher.',
        adminAction: 'Continue regular walkthroughs, monitor emerging trends, and use PLC or coaching touchpoints to reinforce strong practice across the team.',
        lookFors: [
          'High-leverage teacher moves stay visible across lessons.',
          'Strong practice is shared with the broader team.',
        ],
        followUpTimeline: 'Review again during the next monthly leadership cycle.',
      };
    }

    return primary;
  }, [adminSupportPlans]);

  const handleRemoveUser = async (userId: string) => {
    setDeletingUserId(userId);
    try {
      const res = await fetch(`/api/admin/user/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast(data.error || 'Failed to remove user.', 'error');
        return;
      }
      await loadDashboard();
      pushToast('User removed successfully.', 'success');
    } catch {
      pushToast('Network error removing user.', 'error');
    } finally {
      setDeletingUserId(null);
      setPendingDelete(null);
      setOpenActionsForId(null);
    }
  };

  if (!ready) {
    return (
      <ProtectedPageState
        mode="loading"
        title="Loading admin dashboard"
        message="Gathering visibility, team performance, and lesson trends for your current scope."
      />
    );
  }

  return (
    <main style={page} className="dashboard-page">
      <ToastViewport
        toasts={toasts}
        onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))}
      />
      <div style={container} className="dashboard-container">

        {/* HEADER */}
        <div style={header}>
          <div>
            <h1 style={heading}>{activeAdminName}</h1>
            <p style={subheading}>
              {isViewingAnotherAdmin
                ? `Viewing ${activeAdminName}'s dashboard`
                : `${activeAdminName}'s instructional dashboard`}
            </p>
          </div>
          <div style={actions}>
            {canAccessMonitoring && (
              <button onClick={handleOpenMonitoringDashboard} style={headerActionBtnAlt}>
                Monitoring Dashboard
              </button>
            )}
            {currentUserRole === 'super_admin' && (
              <button onClick={handleOpenDistrictDashboard} style={headerActionBtnAlt}>
                District Dashboard
              </button>
            )}
            <button onClick={handleObserveLesson} style={headerActionBtn}>
              Observe Lesson
            </button>
          </div>
        </div>

        {loadError && (
          <div style={{ ...card, marginBottom: 12, border: '1px solid rgba(248,113,113,0.28)' }}>
            <p style={{ ...text, marginBottom: 0 }}>{loadError}</p>
          </div>
        )}

        {isSampleMode && (
          <div
            style={{
              ...card,
              marginBottom: 12,
              border: '1px solid rgba(56,189,248,0.24)',
              background: 'linear-gradient(135deg, rgba(14,165,233,0.14), rgba(15,23,42,0.08))',
            }}
          >
            <div style={{ ...statLabel, color: '#7dd3fc', marginBottom: 8 }}>Sample Data</div>
            <p style={{ ...text, marginBottom: 8 }}>
              This example dashboard shows how trends, lesson results, and team structure will look once your team is set up.
            </p>
            <p style={{ ...text, marginBottom: 0 }}>
              It will disappear automatically after you add your first teacher or admin.
            </p>
          </div>
        )}

        {/* AT RISK */}
        <div id="performance" style={card}>
          <h2 style={title}>At-Risk Teachers</h2>
          {atRiskTeachers.length === 0 ? (
            <p style={text}>No teachers currently need intervention.</p>
          ) : (
            atRiskTeachers.map((t, i) => (
              <div key={i} style={listItem}>
                {t.name} — {t.avgScore}/100 ({t.trend > 0 ? `↑ ${t.trend}` : t.trend < 0 ? `↓ ${Math.abs(t.trend)}` : '→ 0'})
              </div>
            ))
          )}
        </div>

        {/* STATS */}
        <div
          style={{
            ...grid,
            gridTemplateColumns: isNarrowScreen ? 'repeat(2, minmax(0, 1fr))' : grid.gridTemplateColumns,
            gap: isNarrowScreen ? 12 : 16,
            alignItems: 'stretch',
          }}
        >
          <div style={cardSmall}>
            <div style={statLabel}>Instructional Quality Score</div>
            <button
              style={{ ...big, fontSize: isNarrowScreen ? 22 : big.fontSize, color: adminQualityScore >= 75 ? '#22c55e' : '#ef4444', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3, textAlign: 'center' }}
              onClick={() => setModalType('quality')}
            >
              {adminQualityScore}/100
            </button>
            <div style={statSub}>
              {adminQualityScore >= 75 ? 'System performance is strong' : 'Below target — improvement needed'}
            </div>
          </div>

          <div style={cardSmall}>
            <div style={statLabel}>Lessons Analyzed</div>
            <button
              style={{ ...big, fontSize: isNarrowScreen ? 22 : big.fontSize, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3, textAlign: 'center' }}
              onClick={() => setModalType('lessons')}
            >
              {dashboardReports.length}
            </button>
            <div style={statSub}>Based on recent submissions</div>
          </div>

          <div style={cardSmall}>
            <div style={statLabel}>Strong Teachers</div>
            <button
              style={{ ...big, fontSize: isNarrowScreen ? 22 : big.fontSize, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3, textAlign: 'center' }}
              onClick={() => setModalType('strong')}
            >
              {strongCount}
            </button>
            <div style={statSub}>Meeting expectations</div>
          </div>
          <div style={cardSmall}>
            <div style={statLabel}>At-Risk Teachers</div>
            <button
              style={{ ...big, fontSize: isNarrowScreen ? 22 : big.fontSize, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3, textAlign: 'center' }}
              onClick={() => setModalType('atrisk')}
            >
              {supportCount}
            </button>
            <div style={statSub}>Require support</div>
          </div>
        </div>

        {/* ACTION */}
        <div style={card}>
          <h2 style={title}>Administrator Support Plan</h2>
          <div style={supportPlanHeader}>
            <div>
              <div style={supportPlanLabel}>
                {recommendedSupportPlan.teacherName === 'Instructional Team' ? 'Current Focus' : 'Priority Teacher'}
              </div>
              <div style={supportPlanTeacher}>{recommendedSupportPlan.teacherName}</div>
            </div>
            <div style={supportPlanChip}>{recommendedSupportPlan.followUpTimeline}</div>
          </div>
          <p style={text}>{recommendedSupportPlan.summary}</p>
          <div style={{ ...text, marginTop: 10 }}>
            <strong>Administrator action:</strong> {recommendedSupportPlan.adminAction}
          </div>
          <div style={{ ...supportPlanLabel, marginTop: 14, marginBottom: 8 }}>Look-fors in the next observation</div>
          <ul style={actionList}>
            {recommendedSupportPlan.lookFors.map((action, idx) => (
              <li key={idx} style={actionItem}>{action}</li>
            ))}
          </ul>
        </div>

        {/* TREND */}
        <div style={{ ...card, marginTop: 8 }}>
          <div style={trendHeader}>
            <div>
              <h2 style={{ ...title, marginBottom: 6 }}>System Trend</h2>
              <p style={{ ...text, margin: 0 }}>{systemInsight}</p>
            </div>
            <div style={trendControls}>
              <label style={trendFilterField}>
                <span style={trendFilterLabel}>School Year</span>
                <select
                  value={selectedSchoolYear}
                  onChange={(event) => setSelectedSchoolYear(event.target.value)}
                  style={trendSelect}
                >
                  {schoolYearOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === '2025-2026' ? 'August 2025 - May 2026' : `${option.split('-')[0]} - ${option.split('-')[1]}`}
                    </option>
                  ))}
                </select>
              </label>
              <label style={trendFilterField}>
                <span style={trendFilterLabel}>Term</span>
                <select
                  value={selectedTrendTerm}
                  onChange={(event) => setSelectedTrendTerm(event.target.value as TrendTerm)}
                  style={trendSelect}
                >
                  <option value="full_year">Full Year</option>
                  <option value="fall">Fall</option>
                  <option value="spring">Spring</option>
                </select>
              </label>
            </div>
          </div>
          <div style={trendSummaryBar}>
            <div style={trendSummaryPill}>
              <span style={trendSummaryValue}>{trendLessonCount}</span>
              <span style={trendSummaryLabel}>Lessons in view</span>
            </div>
            <div style={trendSummaryPill}>
              <span style={trendSummaryValue}>{trendTeacherCount}</span>
              <span style={trendSummaryLabel}>Teachers tracked</span>
            </div>
          </div>
          <div
            style={{
              marginTop: 10,
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: isNarrowScreen ? '12px 8px 6px' : '18px 16px 10px',
              background: 'linear-gradient(180deg, var(--surface-card-solid) 0%, var(--bg-tertiary) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), var(--shadow-card)',
              minWidth: 0,
            }}
          >
            {chartReady ? (
              <ResponsiveContainer width="100%" height={trendChartHeight}>
                <LineChart data={teacherTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <ReferenceLine y={75} stroke="rgba(244,114,182,0.35)" strokeDasharray="6 6" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatTrendAxisLabel}
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: isNarrowScreen ? 10 : 12 }}
                    minTickGap={trendMinTickGap}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: isNarrowScreen ? 10 : 12 }}
                    width={isNarrowScreen ? 28 : 40}
                  />
                  <Tooltip
                    labelFormatter={(value) => formatTrendAxisLabel(String(value))}
                    contentStyle={{
                      background: 'var(--surface-card-solid)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 12,
                      boxShadow: 'var(--shadow-soft)',
                    }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    labelStyle={{ color: 'var(--text-secondary)', marginBottom: 6 }}
                  />
                  {teacherLineKeys.map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={getStablePaletteColor(key, TEACHER_COLORS)}
                      strokeWidth={3}
                      dot={{ r: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0, fill: getStablePaletteColor(key, TEACHER_COLORS) }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: trendChartHeight }} />
            )}
          </div>

          {/* Custom legend */}
          <div style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid var(--border)',
          }}>
            {teacherLineKeys.length === 0 ? (
              <p style={{ ...text, fontSize: 12, textAlign: 'center', margin: 0 }}>
                No trend data available yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {teacherLineKeys.map((key) => (
                  <div
                    key={key}
                    title={key}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '5px 10px',
                      borderRadius: 999,
                      background: 'var(--surface-hover, rgba(0,0,0,0.04))',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      maxWidth: 220,
                    }}
                  >
                    <span style={{
                      flexShrink: 0,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: getStablePaletteColor(key, TEACHER_COLORS),
                    }} />
                    <span style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {key}
                    </span>
                  </div>
                ))}

              </div>
            )}
          </div>
        </div>

        <div style={card}>
          <h2 style={title}>Teacher Performance</h2>
          <div
            className="table-scroll-wrap"
            style={isNarrowScreen ? { overflowX: 'hidden', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 6px', background: 'linear-gradient(180deg, var(--surface-card-solid) 0%, rgba(148,163,184,0.05) 100%)' } : undefined}
          >
            <table style={{ ...table, minWidth: '100%' }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: '40%', whiteSpace: 'normal', fontSize: isNarrowScreen ? 12 : th.fontSize, padding: isNarrowScreen ? '4px 3px' : th.padding }}>Teacher</th>
                  <th style={{ ...th, width: '18%', textAlign: 'center', whiteSpace: 'normal', fontSize: isNarrowScreen ? 12 : th.fontSize, padding: isNarrowScreen ? '4px 3px' : th.padding }}>Current Avg</th>
                  <th style={{ ...th, width: '18%', textAlign: 'center', whiteSpace: 'normal', fontSize: isNarrowScreen ? 12 : th.fontSize, padding: isNarrowScreen ? '4px 3px' : th.padding }}>Trend</th>
                  <th style={{ ...th, width: '24%', textAlign: 'center', whiteSpace: 'normal', fontSize: isNarrowScreen ? 12 : th.fontSize, padding: isNarrowScreen ? '4px 3px' : th.padding }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teacherStats.map((t, i) => (
                  <tr key={i}>
                    <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word', fontSize: isNarrowScreen ? 12 : td.fontSize, padding: isNarrowScreen ? '4px 3px' : td.padding }}>{t.name}</td>
                    <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal', fontSize: isNarrowScreen ? 12 : td.fontSize, padding: isNarrowScreen ? '4px 3px' : td.padding }}>{t.avgScore}/100</td>
                    <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal', fontSize: isNarrowScreen ? 12 : td.fontSize, padding: isNarrowScreen ? '4px 3px' : td.padding, color: t.trend > 0 ? '#22c55e' : t.trend < 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                      {t.trend > 0 ? `↑ ${t.trend}` : t.trend < 0 ? `↓ ${Math.abs(t.trend)}` : '→ 0'}
                    </td>
                    <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : td.padding }}>
                      <button
                        style={{ ...actionButton, padding: isNarrowScreen ? '3px 7px' : actionButton.padding, fontSize: isNarrowScreen ? 11 : undefined }}
                        onClick={() => {
                          if (isSampleEntityId(t.id) && !canOpenSampleTeacher(t.id)) return;
                          navigateToUserDashboard(t.id, 'teacher', 'performance');
                        }}
                        disabled={isSampleEntityId(t.id) && !canOpenSampleTeacher(t.id)}
                      >
                        {canOpenSampleTeacher(t.id) ? 'Open Sample' : isSampleEntityId(t.id) ? 'Preview' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div id="team" style={card}>
          <h2 style={title}>Team Structure</h2>
          {hierarchyRows.length === 0 ? (
            <p style={text}>No admins found in your current visibility scope.</p>
          ) : (
            hierarchyRows.map((row) => (
              <div
                key={row.id}
                style={{
                  ...hierarchyCard,
                  ...(currentUserId && row.id === currentUserId ? hierarchyCardActive : {}),
                }}
              >
                <div style={hierarchyHeader}>
                  <div style={hierarchyIdentity}>
                    <div style={{ minWidth: 0 }}>
                      <button
                        onClick={() => navigateToUserDashboard(row.id, row.role, 'team')}
                        style={entityLinkBtn}
                      >
                        {row.name}
                      </button>
                      <div style={hierarchyMetaRow}>
                        <span style={hierarchyRoleChip}>{formatRoleLabel(row.role)}</span>
                        {currentUserId && row.id === currentUserId && (
                          <span style={hierarchyOwnerChip}>Your View</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={hierarchyHeaderActions}>
                    <div style={hierarchyMetrics}>
                      <span style={hierarchyMetricChip}>
                        {row.childAdmins.length} {row.childAdmins.length === 1 ? 'admin' : 'admins'}
                      </span>
                      <span style={hierarchyMetricChip}>
                        {row.teachers.length} {row.teachers.length === 1 ? 'teacher' : 'teachers'}
                      </span>
                    </div>
                    {currentUserRole === 'super_admin' && row.id !== currentUserId && !isSampleEntityId(row.id) && (
                      <div style={actionsMenuWrap}>
                        <button
                          onClick={() => setOpenActionsForId((prev) => (prev === `admin:${row.id}` ? null : `admin:${row.id}`))}
                          aria-label={`Actions for ${row.name}`}
                          style={actionsMenuTrigger}
                        >
                          •••
                        </button>
                        {openActionsForId === `admin:${row.id}` && (
                          <div style={actionsMenuPanel}>
                            <button
                              onClick={() => {
                                setOpenActionsForId(null);
                                navigateToUserDashboard(row.id, row.role, 'team');
                              }}
                              style={menuItemBtn}
                            >
                              View Profile
                            </button>
                            <button
                              onClick={() => {
                                setOpenActionsForId(null);
                                setPendingDelete({ id: row.id, name: row.name });
                              }}
                              disabled={deletingUserId === row.id}
                              style={{ ...menuItemBtn, ...menuItemDanger, opacity: deletingUserId === row.id ? 0.6 : 1 }}
                            >
                              {deletingUserId === row.id ? 'Removing…' : 'Remove User'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    ...hierarchyGroupsGrid,
                    gridTemplateColumns: isNarrowScreen ? '1fr' : hierarchyGroupsGrid.gridTemplateColumns,
                  }}
                >
                  <div style={hierarchyGroupCard}>
                    <div style={hierarchyLabel}>Admins Under This Admin</div>
                    {row.childAdmins.length ? (
                      <div style={pillWrap}>
                        {row.childAdmins.map((child) => (
                          <div key={child.id} style={pillBtn}>
                            <button
                              onClick={() => navigateToUserDashboard(child.id, child.role, 'team')}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: isSampleEntityId(child.id) ? 'default' : 'pointer', color: 'inherit', fontSize: 'inherit', opacity: isSampleEntityId(child.id) ? 0.72 : 1 }}
                            >
                              {child.name}
                            </button>
                            <span style={pillRoleLabel}>{formatRoleLabel(child.role)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={hierarchyEmptyState}>No nested admins assigned in this scope.</div>
                    )}
                  </div>

                  <div style={hierarchyGroupCard}>
                    <div style={hierarchyLabel}>Teachers Under This Admin</div>
                    {row.teachers.length ? (
                      <div style={pillWrap}>
                        {row.teachers.map((teacher) => (
                          <div key={teacher.id} style={pillBtn}>
                            <button
                              onClick={() => {
                                if (isSampleEntityId(teacher.id) && !canOpenSampleTeacher(teacher.id)) return;
                                router.push(`/admin/teacher/${teacher.id}`);
                              }}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: isSampleEntityId(teacher.id) && !canOpenSampleTeacher(teacher.id) ? 'default' : 'pointer', color: 'inherit', fontSize: 'inherit', opacity: isSampleEntityId(teacher.id) && !canOpenSampleTeacher(teacher.id) ? 0.72 : 1, textDecoration: canOpenSampleTeacher(teacher.id) ? 'underline' : 'none', textUnderlineOffset: 2 }}
                            >
                              {teacher.name}
                            </button>
                            {['admin', 'super_admin'].includes(currentUserRole || '') && teacher.id !== currentUserId && !isSampleEntityId(teacher.id) && (
                              <div style={actionsMenuWrap}>
                                <button
                                  onClick={() => setOpenActionsForId((prev) => (prev === `teacher:${teacher.id}` ? null : `teacher:${teacher.id}`))}
                                  aria-label={`Actions for ${teacher.name}`}
                                  style={pillActionsMenuTrigger}
                                >
                                  •••
                                </button>
                                {openActionsForId === `teacher:${teacher.id}` && (
                                  <div style={actionsMenuPanel}>
                                    <button
                                      onClick={() => {
                                        setOpenActionsForId(null);
                                        router.push(`/admin/teacher/${teacher.id}`);
                                      }}
                                      style={menuItemBtn}
                                    >
                                      View Profile
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenActionsForId(null);
                                        setPendingDelete({ id: teacher.id, name: teacher.name });
                                      }}
                                      disabled={deletingUserId === teacher.id}
                                      style={{ ...menuItemBtn, ...menuItemDanger, opacity: deletingUserId === teacher.id ? 0.6 : 1 }}
                                    >
                                      {deletingUserId === teacher.id ? 'Removing…' : 'Remove Teacher'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={hierarchyEmptyState}>No teachers are directly assigned here yet.</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* STAT DRILL-DOWN MODAL */}
      {modalType && (() => {
        const isTeacherList = modalType === 'strong' || modalType === 'atrisk';
        const rows = isTeacherList
          ? teacherStats
              .filter(t => modalType === 'strong' ? !t.needsAttention : t.needsAttention)
              .sort((a, b) => modalType === 'strong' ? b.avgScore - a.avgScore : a.avgScore - b.avgScore)
          : modalType === 'quality'
            ? [...lessonRows].sort((a, b) => b.score - a.score)
            : lessonRows;

        const modalTitles: Record<string, string> = {
          quality: 'Instructional Quality Score — All Lessons',
          lessons: 'All Lessons Analyzed',
          strong: 'Teachers Performing Strongly',
          atrisk: 'At-Risk Teachers',
        };
        const modalSubs: Record<string, string> = {
          quality: 'Sorted by score (high to low). Score is weighted across coverage, clarity, engagement, and gap impact.',
          lessons: 'Sorted by date (most recent first).',
          strong: 'Teachers with an average lesson score ≥ 75.',
          atrisk: 'Teachers with an average lesson score below 75.',
        };

        return (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setModalType(null)}
          >
            <div
              style={{ background: 'var(--surface-card-solid)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 24px 20px', maxWidth: 660, width: '100%', maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: 17, fontWeight: 700 }}>{modalTitles[modalType]}</h2>
                <button onClick={() => setModalType(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 20, lineHeight: 1, padding: '0 0 0 12px' }}>✕</button>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '0 0 16px 0' }}>{modalSubs[modalType]}</p>

              {rows.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>No data to display.</p>
              ) : isTeacherList ? (
                <div className="table-scroll-wrap" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', color: 'var(--text-secondary)', padding: '6px 8px', fontWeight: 600 }}>Teacher</th>
                        <th style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '6px 8px', fontWeight: 600 }}>Avg Score</th>
                        <th style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '6px 8px', fontWeight: 600 }}>Lessons</th>
                        <th style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '6px 8px', fontWeight: 600 }}>Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rows as typeof teacherStats).map((t, i) => (
                        <tr
                          key={i}
                          style={{ borderBottom: '1px solid var(--border)', cursor: isSampleEntityId(t.id) && !canOpenSampleTeacher(t.id) ? 'default' : 'pointer' }}
                          onClick={() => {
                            if (isSampleEntityId(t.id) && !canOpenSampleTeacher(t.id)) return;
                            setModalType(null);
                            navigateToUserDashboard(t.id, 'teacher', 'performance');
                          }}
                        >
                          <td style={{ padding: '8px 8px' }}>
                            <button
                              onClick={(e) => {
                                if (isSampleEntityId(t.id) && !canOpenSampleTeacher(t.id)) return;
                                e.stopPropagation();
                                setModalType(null);
                                navigateToUserDashboard(t.id, 'teacher', 'performance');
                              }}
                              style={{ border: 'none', background: 'none', padding: 0, color: 'var(--text-primary)', cursor: isSampleEntityId(t.id) && !canOpenSampleTeacher(t.id) ? 'default' : 'pointer', textDecoration: isSampleEntityId(t.id) && !canOpenSampleTeacher(t.id) ? 'none' : 'underline', textUnderlineOffset: 2, opacity: isSampleEntityId(t.id) && !canOpenSampleTeacher(t.id) ? 0.72 : 1 }}
                            >
                              {t.name}
                            </button>
                          </td>
                          <td style={{ padding: '8px 8px', textAlign: 'center', color: t.needsAttention ? '#ef4444' : '#22c55e', fontWeight: 700 }}>{t.avgScore}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'center', color: 'var(--text-secondary)' }}>{t.count}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'center', color: t.trend > 0 ? '#22c55e' : t.trend < 0 ? '#ef4444' : 'var(--text-secondary)' }}>{t.trend > 0 ? `↑ ${t.trend}` : t.trend < 0 ? `↓ ${Math.abs(t.trend)}` : '→ 0'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="table-scroll-wrap" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', color: 'var(--text-secondary)', padding: '6px 8px', fontWeight: 600 }}>Teacher</th>
                        <th style={{ textAlign: 'left', color: 'var(--text-secondary)', padding: '6px 8px', fontWeight: 600 }}>Date</th>
                        <th style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '6px 8px', fontWeight: 600 }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rows as typeof lessonRows).map((r, i) => (
                        <tr
                          key={i}
                          style={{ borderBottom: '1px solid var(--border)', cursor: r.teacherId && r.id && (!isSampleEntityId(r.teacherId) || canOpenSampleTeacher(r.teacherId)) ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (!r.teacherId || !r.id || (isSampleEntityId(r.teacherId) && !canOpenSampleTeacher(r.teacherId))) return;
                            setModalType(null);
                            router.push(`/admin/teacher/${r.teacherId}/lesson/${r.id}`);
                          }}
                        >
                          <td style={{ padding: '8px 8px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!r.teacherId || !r.id || (isSampleEntityId(r.teacherId) && !canOpenSampleTeacher(r.teacherId))) return;
                                setModalType(null);
                                router.push(`/admin/teacher/${r.teacherId}/lesson/${r.id}`);
                              }}
                              style={{ border: 'none', background: 'none', padding: 0, color: 'var(--text-primary)', cursor: r.teacherId && r.id && (!isSampleEntityId(r.teacherId) || canOpenSampleTeacher(r.teacherId)) ? 'pointer' : 'default', textDecoration: r.teacherId && r.id && (!isSampleEntityId(r.teacherId) || canOpenSampleTeacher(r.teacherId)) ? 'underline' : 'none', textUnderlineOffset: 2, opacity: r.teacherId && isSampleEntityId(r.teacherId) && !canOpenSampleTeacher(r.teacherId) ? 0.72 : 1 }}
                            >
                              {r.teacher}
                            </button>
                          </td>
                          <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>{r.date}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 700, color: r.score >= 75 ? '#22c55e' : '#ef4444' }}>{r.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {pendingDelete && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(2, 6, 23, 0.66)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => {
            if (!deletingUserId) setPendingDelete(null);
          }}
        >
          <div
            style={{ background: 'var(--surface-card-solid)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 460, padding: 20, boxShadow: '0 24px 80px rgba(2,6,23,0.35)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Remove User
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Remove <strong>{pendingDelete.name}</strong> from the system? Their account access will be permanently deleted.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setPendingDelete(null)}
                disabled={Boolean(deletingUserId)}
                style={modalCancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveUser(pendingDelete.id)}
                disabled={Boolean(deletingUserId)}
                style={modalDangerBtn}
              >
                {deletingUserId ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

/* ========================= STYLES ========================= */

const page: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary)' };
const container: React.CSSProperties = { maxWidth: 1200, margin: '0 auto' };
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 28 };
const heading: React.CSSProperties = { color: 'var(--text-primary)', fontSize: 28, margin: '0 0 4px 0' };
const subheading: React.CSSProperties = { color: 'var(--text-secondary)', margin: 0 };
const actions: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' };
const btn: React.CSSProperties = { background: '#f97316', color: '#fff', padding: '9px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, minHeight: 40 };
const btnAlt: React.CSSProperties = { background: 'var(--surface-chip)', color: 'var(--text-primary)', padding: '9px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, minHeight: 40 };
const headerActionBtn: React.CSSProperties = { ...btn, minWidth: 168, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' };
const headerActionBtnAlt: React.CSSProperties = { ...btnAlt, minWidth: 168, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' };
const card: React.CSSProperties = { background: 'var(--surface-card-solid)', border: '1px solid var(--border)', padding: 20, borderRadius: 12, marginBottom: 24, minWidth: 0 };
const cardSmall: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  border: '1px solid var(--border)',
  padding: 16,
  borderRadius: 12,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  gap: 6,
};
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 };
const title: React.CSSProperties = { color: 'var(--text-primary)', marginBottom: 10 };
const text: React.CSSProperties = { color: 'var(--text-secondary)' };
const big: React.CSSProperties = { fontSize: 30, color: 'var(--text-primary)', width: '100%', fontWeight: 700, lineHeight: 1.05 };
const statLabel: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: 14, marginBottom: 2, fontWeight: 600 };
const statSub: React.CSSProperties = { fontSize: 14, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.45, maxWidth: 196 };
const table: React.CSSProperties = { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' };
const th: React.CSSProperties = { textAlign: 'left', color: 'var(--text-secondary)', padding: '5px 6px', fontSize: 13 };
const td: React.CSSProperties = { color: 'var(--text-primary)', padding: '5px 6px', fontSize: 14, verticalAlign: 'middle' };
const actionButton: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--surface-chip)', color: 'var(--text-primary)', borderRadius: 8, padding: '5px 9px', fontSize: 12, cursor: 'pointer' };
const listItem: React.CSSProperties = { color: 'var(--text-primary)', marginBottom: 6 };
const hierarchyCard: React.CSSProperties = { border: '1px solid rgba(148,163,184,0.18)', borderRadius: 16, padding: 18, marginBottom: 14, background: 'linear-gradient(180deg, var(--surface-card-solid) 0%, var(--surface-chip) 100%)', boxShadow: '0 18px 36px rgba(15,23,42,0.06)' };
const hierarchyCardActive: React.CSSProperties = { border: '1px solid rgba(249,115,22,0.28)', boxShadow: '0 18px 40px rgba(249,115,22,0.12)' };
const hierarchyHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 };
const hierarchyIdentity: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 };
const hierarchyMetaRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 };
const hierarchyRoleChip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: 999, background: 'rgba(15,23,42,0.06)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, letterSpacing: 0.3 };
const hierarchyOwnerChip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: 999, background: 'rgba(249,115,22,0.12)', color: '#c2410c', border: '1px solid rgba(249,115,22,0.14)', fontSize: 11, fontWeight: 700 };
const hierarchyHeaderActions: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' };
const hierarchyMetrics: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' };
const hierarchyMetricChip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '7px 11px', borderRadius: 999, background: 'var(--surface-card-solid)', border: '1px solid rgba(148,163,184,0.18)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700 };
const hierarchyGroupsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 };
const hierarchyGroupCard: React.CSSProperties = { border: '1px solid rgba(148,163,184,0.16)', borderRadius: 14, padding: 14, background: 'linear-gradient(180deg, var(--surface-card-solid) 0%, rgba(148,163,184,0.06) 100%)' };
const hierarchyLabel: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: 11, marginBottom: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 };
const hierarchyEmptyState: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.45 };
const pillWrap: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 };
const pillBtn: React.CSSProperties = { border: '1px solid rgba(148,163,184,0.16)', background: 'var(--surface-card-solid)', color: 'var(--text-primary)', borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 18px rgba(15,23,42,0.04)' };
const pillRoleLabel: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700 };
const entityLinkBtn: React.CSSProperties = { border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: 15, fontWeight: 800, padding: 0, cursor: 'pointer' };
const actionsMenuWrap: React.CSSProperties = { position: 'relative' };
const actionsMenuTrigger: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--surface-chip)', color: 'var(--text-secondary)', borderRadius: 8, cursor: 'pointer', fontSize: 12, lineHeight: 1, height: 28, minWidth: 34, padding: '0 8px' };
const pillActionsMenuTrigger: React.CSSProperties = { border: 'none', background: 'transparent', color: 'var(--text-secondary)', borderRadius: 6, cursor: 'pointer', fontSize: 10, lineHeight: 1, height: 18, minWidth: 18, padding: 0 };
const actionsMenuPanel: React.CSSProperties = { position: 'absolute', top: 32, right: 0, zIndex: 15, minWidth: 150, background: 'var(--surface-card-solid)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 14px 32px rgba(2,6,23,0.20)', padding: 4, display: 'flex', flexDirection: 'column', gap: 2 };
const menuItemBtn: React.CSSProperties = { border: 'none', background: 'transparent', color: 'var(--text-primary)', textAlign: 'left', borderRadius: 7, padding: '8px 10px', fontSize: 12, cursor: 'pointer' };
const menuItemDanger: React.CSSProperties = { color: '#dc2626' };
const supportPlanHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 8 };
const supportPlanLabel: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 4 };
const supportPlanTeacher: React.CSSProperties = { color: 'var(--text-primary)', fontSize: 20, fontWeight: 800 };
const supportPlanChip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '8px 12px', borderRadius: 999, background: 'rgba(249,115,22,0.10)', color: '#c2410c', border: '1px solid rgba(249,115,22,0.18)', fontSize: 12, fontWeight: 700 };
const actionList: React.CSSProperties = { margin: '10px 0 0 18px', color: 'var(--text-primary)', padding: 0 };
const actionItem: React.CSSProperties = { marginBottom: 8, lineHeight: 1.4 };
const modalCancelBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--surface-chip)', color: 'var(--text-primary)', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer' };
const modalDangerBtn: React.CSSProperties = { border: '1px solid #dc2626', background: '#dc2626', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 700 };
const trendHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' };
const trendControls: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' };
const trendFilterField: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 170 };
const trendFilterLabel: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 };
const trendSelect: React.CSSProperties = { background: 'var(--surface-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, minHeight: 42, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' };
const trendSummaryBar: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 };
const trendSummaryPill: React.CSSProperties = { display: 'inline-flex', alignItems: 'baseline', gap: 8, padding: '8px 12px', borderRadius: 999, background: 'var(--surface-chip)', border: '1px solid var(--border)' };
const trendSummaryValue: React.CSSProperties = { color: 'var(--text-primary)', fontSize: 15, fontWeight: 800 };
const trendSummaryLabel: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: 12 };
