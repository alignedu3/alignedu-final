'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  getDashboardSummary,
  calculateLessonScore
} from '@/lib/dashboardData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

export default function AdminDashboard() {
  const [dbReports, setDbReports] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [visibleAdminIds, setVisibleAdminIds] = useState<string[]>([]);
  const [managedTeachers, setManagedTeachers] = useState<Array<{ admin_id: string; teacher_id: string }>>([]);
  const [managedAdmins, setManagedAdmins] = useState<Array<{ parent_admin_id: string; child_admin_id: string }>>([]);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [ready, setReady] = useState(false);
  const [modalType, setModalType] = useState<null | 'quality' | 'lessons' | 'strong' | 'atrisk'>(null);
  const router = useRouter();

  const handleAddTeacher = () => {
    router.push('/admin/invite');
  };

  useEffect(() => {
    async function safeLoad() {
      try {
        const authResponse = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const authData = await authResponse.json();
        const user = authData.user ?? null;

        if (!user) {
          window.location.replace('/login');
          return;
        }

        if (!['admin', 'super_admin'].includes(authData.profile?.role)) {
          window.location.replace('/dashboard');
          return;
        }

        const supabase = createClient();

        const visibilityResponse = await fetch('/api/admin/visibility', {
          credentials: 'include',
          cache: 'no-store',
        });
        const visibility = await visibilityResponse.json();

        if (!visibilityResponse.ok || !visibility.success) {
          throw new Error(visibility.error || 'Unable to load admin visibility');
        }

        const adminIds = (visibility.adminIds || []) as string[];
        const visibleUserIds = (visibility.visibleUserIds || []) as string[];
        setVisibleAdminIds(adminIds);

        const { data: profileData } = visibleUserIds.length > 0
          ? await supabase
              .from('profiles')
              .select('id, name, role')
              .in('id', visibleUserIds)
          : { data: [] };

        setProfiles(profileData ?? []);

        const { data: teacherLinks } = adminIds.length > 0
          ? await supabase
              .from('managed_teachers')
              .select('admin_id, teacher_id')
              .in('admin_id', adminIds)
          : { data: [] };

        setManagedTeachers((teacherLinks ?? []) as Array<{ admin_id: string; teacher_id: string }>);

        const { data: adminLinks } = adminIds.length > 0
          ? await supabase
              .from('managed_admins')
              .select('parent_admin_id, child_admin_id')
              .in('parent_admin_id', adminIds)
          : { data: [] };

        setManagedAdmins((adminLinks ?? []) as Array<{ parent_admin_id: string; child_admin_id: string }>);

        if (!visibleUserIds.length) {
          setDbReports([]);
          return;
        }

        const { data, error: analysesError } = await supabase
          .from('analyses')
          .select('id, user_id, created_at, title, subject, grade, coverage_score, clarity_rating, engagement_level, gaps_detected, transcript, result, analysis_result')
          .in('user_id', visibleUserIds)
          .order('created_at', { ascending: false });

        if (analysesError) {
          throw analysesError;
        }

        const toNumber = (value: unknown, fallback = 0) => {
          if (typeof value === 'number' && Number.isFinite(value)) return value;
          if (typeof value === 'string') {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
          }
          return fallback;
        };

        const normalizedReports = (data ?? []).map((r: any) => ({
          ...r,
          date: r.created_at?.slice(0, 10),
          coverage: toNumber(r.coverage_score, 75),
          clarity: toNumber(r.clarity_rating, 75),
          engagement: toNumber(r.engagement_level, 75),
          assessment: 75,
          gaps: toNumber(r.gaps_detected, 0),
        }));

        setDbReports(normalizedReports);
      } catch (err) {
        console.error('Admin dashboard load error:', err);
      } finally {
        setReady(true);
      }
    }

    safeLoad();
  }, [router]);

  useEffect(() => {
    const checkScreen = () => setIsNarrowScreen(window.innerWidth <= 768);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const reports = dbReports;
  const summary = getDashboardSummary(reports);

  const TEACHER_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#84cc16'];
  const ADMIN_COLORS = ['#0f766e', '#1d4ed8', '#be123c', '#334155', '#0f172a'];

  const getStablePaletteColor = (key: string, palette: string[]) => {
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    return palette[Math.abs(hash) % palette.length];
  };

  const getPointCountForKey = (rows: Array<Record<string, any>>, key: string) => {
    return rows.reduce((count, row) => {
      const value = row[key];
      return typeof value === 'number' && Number.isFinite(value) ? count + 1 : count;
    }, 0);
  };

  const teacherTrendData = useMemo(() => {
    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
    const getTeacherName = (r: any) => {
      const profile = profileById.get(r.user_id);
      if (profile?.name) return profile.name;
      if (r.teacher_name) return r.teacher_name;
      if (r.name) return r.name;
      return 'Unknown';
    };
    const byDate: Record<string, Record<string, number[]>> = {};
    reports.forEach((r: any) => {
      const date = r.date ?? r.created_at?.slice(0, 10);
      if (!date) return;
      const teacher = getTeacherName(r);
      if (!byDate[date]) byDate[date] = {};
      if (!byDate[date][teacher]) byDate[date][teacher] = [];
      byDate[date][teacher].push(calculateLessonScore(r));
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, teachers]) => {
        const entry: Record<string, any> = { date };
        Object.entries(teachers).forEach(([teacher, scores]) => {
          entry[teacher] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        });
        return entry;
      });
  }, [reports, profiles]);

  const teacherLineKeys = useMemo(() => {
    const keys = new Set<string>();
    teacherTrendData.forEach(entry => {
      Object.keys(entry).forEach(k => { if (k !== 'date') keys.add(k); });
    });
    return Array.from(keys).filter((key) => getPointCountForKey(teacherTrendData, key) >= 2);
  }, [teacherTrendData]);

  const adminTrendData = useMemo(() => {
    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
    const scopedAdminIds = visibleAdminIds.filter((id) => {
      const role = profileById.get(id)?.role;
      return role === 'admin' || role === 'super_admin';
    });

    const adminNameById = new Map<string, string>();
    scopedAdminIds.forEach((id) => {
      const profile = profileById.get(id);
      const label = profile?.name || profile?.email || 'Unknown';
      adminNameById.set(id, label);
    });

    const adminIdsByTeacherId = new Map<string, string[]>();
    (managedTeachers || []).forEach((link) => {
      if (!scopedAdminIds.includes(link.admin_id)) return;
      const existing = adminIdsByTeacherId.get(link.teacher_id) || [];
      existing.push(link.admin_id);
      adminIdsByTeacherId.set(link.teacher_id, existing);
    });

    const byDate: Record<string, Record<string, number[]>> = {};
    reports.forEach((r: any) => {
      const date = r.date ?? r.created_at?.slice(0, 10);
      if (!date) return;

      const adminIds = adminIdsByTeacherId.get(r.user_id) || [];
      if (!adminIds.length) return;

      adminIds.forEach((adminId) => {
        const adminLabel = adminNameById.get(adminId);
        if (!adminLabel) return;
        if (!byDate[date]) byDate[date] = {};
        if (!byDate[date][adminLabel]) byDate[date][adminLabel] = [];
        byDate[date][adminLabel].push(calculateLessonScore(r));
      });
    });

    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, admins]) => {
        const entry: Record<string, any> = { date };
        Object.entries(admins).forEach(([admin, scores]) => {
          entry[admin] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        });
        return entry;
      });
  }, [reports, profiles, visibleAdminIds, managedTeachers]);

  const adminLineKeys = useMemo(() => {
    const keys = new Set<string>();
    adminTrendData.forEach(entry => {
      Object.keys(entry).forEach(k => { if (k !== 'date') keys.add(k); });
    });
    return Array.from(keys).filter((key) => getPointCountForKey(adminTrendData, key) >= 2);
  }, [adminTrendData]);

  const combinedTrendData = useMemo(() => {
    const byDate = new Map<string, Record<string, any>>();

    teacherTrendData.forEach((entry) => {
      byDate.set(entry.date, { ...entry });
    });

    adminTrendData.forEach((entry) => {
      const existing = byDate.get(entry.date) || { date: entry.date };
      Object.keys(entry).forEach((key) => {
        if (key !== 'date') existing[key] = entry[key];
      });
      byDate.set(entry.date, existing);
    });

    return Array.from(byDate.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [teacherTrendData, adminTrendData]);

  const lessonRows = useMemo(() =>
    [...reports]
      .map((r: any) => {
        const p = (profiles || []).find((x: any) => x.id === r.user_id);
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
  [reports, profiles]);

  const teacherStats = useMemo(() => {
    const profileById = new Map((profiles || []).map((p) => [p.id, p]));
    const map: Record<string, any[]> = {};

    reports.forEach((r: any) => {
      const key = r.user_id;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });

    return Object.entries(map).map(([id, reps]) => {
      const profile = profileById.get(id);
      const scores = reps.map(r => calculateLessonScore(r));
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const trend = scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0;

      let teacherName = 'Unknown Teacher';
      if (profile?.name) {
        teacherName = profile.name;
      } else if (reps?.length && reps[0]?.teacher_name) {
        teacherName = reps[0].teacher_name;
      } else if (reps?.length && reps[0]?.name) {
        teacherName = reps[0].name;
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
  }, [reports, profiles]);

  const atRiskTeachers = teacherStats
    .filter(t => t.needsAttention)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 3);

  const hierarchyRows = useMemo(() => {
    const profileById = new Map((profiles || []).map((p) => [p.id, p]));
    const adminIds = visibleAdminIds.filter((id) => {
      const role = profileById.get(id)?.role;
      return role === 'admin' || role === 'super_admin';
    });

    return adminIds
      .map((adminId) => {
        const adminProfile = profileById.get(adminId);
        const childAdminIds = managedAdmins
          .filter((link) => link.parent_admin_id === adminId)
          .map((link) => link.child_admin_id)
          .filter((id) => !!profileById.get(id));

        const teacherIds = managedTeachers
          .filter((link) => link.admin_id === adminId)
          .map((link) => link.teacher_id)
          .filter((id) => profileById.get(id)?.role === 'teacher');

        return {
          id: adminId,
          name: adminProfile?.name || adminProfile?.email || 'Admin',
          role: adminProfile?.role || 'admin',
          childAdmins: childAdminIds
            .map((id) => profileById.get(id))
            .filter(Boolean)
            .map((p: any) => ({ id: p.id, name: p.name || p.email || 'Admin', role: p.role })),
          teachers: teacherIds
            .map((id) => profileById.get(id))
            .filter(Boolean)
            .map((p: any) => ({ id: p.id, name: p.name || p.email || 'Teacher' })),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles, managedAdmins, managedTeachers, visibleAdminIds]);

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

  const recommendedAction =
    adminQualityScore < 75
      ? "Focus on improving lesson closure and reinforcing key concepts across classrooms."
      : "Maintain strong instruction and introduce deeper checks for understanding.";

  if (!ready) {
    return <div style={loading}>Loading...</div>;
  }

  return (
    <main style={page} className="dashboard-page">
      <div style={container} className="dashboard-container">

        {/* HEADER */}
        <div style={header}>
          <div>
            <h1 style={heading}>Admin Dashboard</h1>
            <p style={subheading}>System-wide instructional intelligence</p>
          </div>
          <div style={actions}>
            <button onClick={() => router.push('/analyze')} style={btn}>
              Analyze Lesson
            </button>
            <button onClick={handleAddTeacher} style={btnAlt}>
              Add Teacher
            </button>
          </div>
        </div>

        {/* AT RISK */}
        <div style={card}>
          <h2 style={title}>At-Risk Teachers</h2>
          {atRiskTeachers.length === 0 ? (
            <p style={text}>No teachers currently need intervention.</p>
          ) : (
            atRiskTeachers.map((t, i) => (
              <div key={i} style={listItem}>
                {t.name} — {t.avgScore}/100 ({t.trend > 0 ? `↑ +${t.trend}` : `↓ ${t.trend}`})
              </div>
            ))
          )}
        </div>

        {/* ACTION */}
        <div style={card}>
          <h2 style={title}>Recommended Action</h2>
          <p style={text}>{recommendedAction}</p>
        </div>

        {/* STATS */}
        <div style={grid}>
          <div style={cardSmall}>
            <div style={statLabel}>Instructional Quality Score</div>
            <button
              style={{ ...big, color: adminQualityScore >= 75 ? '#22c55e' : '#ef4444', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}
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
              style={{ ...big, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}
              onClick={() => setModalType('lessons')}
            >
              {reports.length}
            </button>
            <div style={statSub}>Based on recent submissions</div>
          </div>

          <div style={cardSmall}>
            <div style={statLabel}>Teachers Performing Strongly</div>
            <button
              style={{ ...big, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}
              onClick={() => setModalType('strong')}
            >
              {strongCount}
            </button>
            <div style={statSub}>Meeting expectations</div>
          </div>

          <div style={cardSmall}>
            <div style={statLabel}>At-Risk Teachers</div>
            <button
              style={{ ...big, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}
              onClick={() => setModalType('atrisk')}
            >
              {supportCount}
            </button>
            <div style={statSub}>Require support</div>
          </div>
        </div>

        {/* TREND */}
        <div style={{ ...card, marginTop: 8 }}>
          <h2 style={title}>System Trend</h2>
          <p style={text}>{systemInsight}</p>
          <div
            style={{
              marginTop: 10,
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: isNarrowScreen ? '10px 8px 4px' : '14px 12px 8px',
              background: 'linear-gradient(180deg, var(--surface-card-solid) 0%, rgba(148,163,184,0.05) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            <ResponsiveContainer width="100%" height={isNarrowScreen ? 210 : 260}>
              <LineChart data={combinedTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: isNarrowScreen ? 10 : 12 }}
                  minTickGap={isNarrowScreen ? 20 : 10}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: isNarrowScreen ? 10 : 12 }}
                  width={isNarrowScreen ? 28 : 40}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-card-solid)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                {teacherLineKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={getStablePaletteColor(key, TEACHER_COLORS)}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
                {adminLineKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={getStablePaletteColor(key, ADMIN_COLORS)}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Custom legend */}
          <div style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid var(--border)',
          }}>
            {teacherLineKeys.length === 0 && adminLineKeys.length === 0 ? (
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

                {adminLineKeys.map((key) => (
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
                      maxWidth: 260,
                    }}
                  >
                    <span style={{
                      flexShrink: 0,
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: getStablePaletteColor(key, ADMIN_COLORS),
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
          <div className="table-scroll-wrap">
            <table style={table}>
              <thead>
                <tr>
                  <th style={{ ...th, width: '44%', whiteSpace: 'normal' }}>Teacher</th>
                  <th style={{ ...th, width: '16%', textAlign: 'center', whiteSpace: 'normal' }}>Score</th>
                  <th style={{ ...th, width: '16%', textAlign: 'center', whiteSpace: 'normal' }}>Trend</th>
                  <th style={{ ...th, width: '24%', textAlign: 'center', whiteSpace: 'normal' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {teacherStats.map((t, i) => (
                  <tr
                    key={i}
                    onClick={() => router.push(`/admin/teacher/${t.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word' }}>{t.name}</td>
                    <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal' }}>{t.avgScore}</td>
                    <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal' }}>
                      {t.trend > 0 ? `↑ +${t.trend}` : `↓ ${t.trend}`}
                    </td>
                    <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal' }}>
                      <span style={t.needsAttention ? statusBadgeWarn : statusBadgeGood}>
                        {t.needsAttention ? (<>Needs<br />Support</>) : 'Strong'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={card}>
          <h2 style={title}>Team Structure</h2>
          {hierarchyRows.length === 0 ? (
            <p style={text}>No admins found in your current visibility scope.</p>
          ) : (
            hierarchyRows.map((row) => (
              <div key={row.id} style={hierarchyCard}>
                <button
                  onClick={() => router.push(`/admin/teacher/${row.id}`)}
                  style={entityLinkBtn}
                >
                  {row.name} <span style={mutedInline}>({row.role})</span>
                </button>

                <div style={hierarchyGroup}>
                  <div style={hierarchyLabel}>Admins Under This Admin</div>
                  {row.childAdmins.length ? (
                    <div style={pillWrap}>
                      {row.childAdmins.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => router.push(`/admin/teacher/${child.id}`)}
                          style={pillBtn}
                        >
                          {child.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={mutedInline}>None</div>
                  )}
                </div>

                <div style={hierarchyGroup}>
                  <div style={hierarchyLabel}>Teachers Under This Admin</div>
                  {row.teachers.length ? (
                    <div style={pillWrap}>
                      {row.teachers.map((teacher) => (
                        <button
                          key={teacher.id}
                          onClick={() => router.push(`/admin/teacher/${teacher.id}`)}
                          style={pillBtn}
                        >
                          {teacher.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={mutedInline}>None</div>
                  )}
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
          quality: 'Sorted by score (high to low). Score = Coverage 35% · Clarity 30% · Engagement 20% · Assessment 15% minus gap penalty.',
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
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => { setModalType(null); router.push(`/admin/teacher/${t.id}`); }}>
                        <td style={{ padding: '8px 8px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalType(null);
                              router.push(`/admin/teacher/${t.id}`);
                            }}
                            style={{ border: 'none', background: 'none', padding: 0, color: 'var(--text-primary)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
                          >
                            {t.name}
                          </button>
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'center', color: t.needsAttention ? '#ef4444' : '#22c55e', fontWeight: 700 }}>{t.avgScore}</td>
                        <td style={{ padding: '8px 8px', textAlign: 'center', color: 'var(--text-secondary)' }}>{t.count}</td>
                        <td style={{ padding: '8px 8px', textAlign: 'center', color: t.trend >= 0 ? '#22c55e' : '#ef4444' }}>{t.trend > 0 ? `↑ +${t.trend}` : `↓ ${t.trend}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
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
                        style={{ borderBottom: '1px solid var(--border)', cursor: r.teacherId && r.id ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (!r.teacherId || !r.id) return;
                          setModalType(null);
                          router.push(`/admin/teacher/${r.teacherId}/lesson/${r.id}`);
                        }}
                      >
                        <td style={{ padding: '8px 8px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!r.teacherId || !r.id) return;
                              setModalType(null);
                              router.push(`/admin/teacher/${r.teacherId}/lesson/${r.id}`);
                            }}
                            style={{ border: 'none', background: 'none', padding: 0, color: 'var(--text-primary)', cursor: r.teacherId && r.id ? 'pointer' : 'default', textDecoration: r.teacherId && r.id ? 'underline' : 'none', textUnderlineOffset: 2 }}
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
              )}
            </div>
          </div>
        );
      })()}

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
const btn: React.CSSProperties = { background: '#f97316', color: '#fff', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const btnAlt: React.CSSProperties = { background: 'var(--surface-chip)', color: 'var(--text-primary)', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const card: React.CSSProperties = { background: 'var(--surface-card-solid)', border: '1px solid var(--border)', padding: 20, borderRadius: 12, marginBottom: 24 };
const cardSmall: React.CSSProperties = { background: 'var(--surface-card-solid)', border: '1px solid var(--border)', padding: 16, borderRadius: 12 };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 };
const title: React.CSSProperties = { color: 'var(--text-primary)', marginBottom: 10 };
const text: React.CSSProperties = { color: 'var(--text-secondary)' };
const big: React.CSSProperties = { fontSize: 24, color: 'var(--text-primary)' };
const statLabel: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 };
const statSub: React.CSSProperties = { fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 };
const table: React.CSSProperties = { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' };
const th: React.CSSProperties = { textAlign: 'left', color: 'var(--text-secondary)', padding: '5px 6px', fontSize: 13 };
const td: React.CSSProperties = { color: 'var(--text-primary)', padding: '5px 6px', fontSize: 14, verticalAlign: 'middle' };
const statusBadgeWarn: React.CSSProperties = { display: 'inline-block', minWidth: 64, padding: '4px 6px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.24)', color: '#ef4444', fontSize: 12, fontWeight: 700, lineHeight: 1.1, textAlign: 'center' };
const statusBadgeGood: React.CSSProperties = { display: 'inline-block', minWidth: 64, padding: '4px 6px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.24)', color: '#22c55e', fontSize: 12, fontWeight: 700, lineHeight: 1.1, textAlign: 'center' };
const listItem: React.CSSProperties = { color: 'var(--text-primary)', marginBottom: 6 };
const loading: React.CSSProperties = { color: 'var(--text-primary)', padding: 40 };
const hierarchyCard: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 12, background: 'var(--surface-card-solid)' };
const hierarchyGroup: React.CSSProperties = { marginTop: 8 };
const hierarchyLabel: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6, fontWeight: 700 };
const pillWrap: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 };
const pillBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--surface-chip)', color: 'var(--text-primary)', borderRadius: 999, padding: '6px 10px', fontSize: 12, cursor: 'pointer' };
const entityLinkBtn: React.CSSProperties = { border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: 15, fontWeight: 800, padding: 0, cursor: 'pointer' };
const mutedInline: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: 12 };