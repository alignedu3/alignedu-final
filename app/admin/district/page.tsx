'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchJsonWithTimeout } from '@/lib/fetchJsonWithTimeout';
import ProtectedPageState from '@/components/ProtectedPageState';
import {
  calculateLessonScore,
  getLatestLessonTrend,
  getLessonMetrics,
  type AnalysisReport,
  type ProfileRecord,
} from '@/lib/dashboardData';

type DistrictPayload = {
  success: boolean;
  error?: string;
  caller?: { id: string; name?: string | null; role?: string | null };
  profiles?: ProfileRecord[];
  analyses?: AnalysisReport[];
};

export default function DistrictDashboard() {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [districtName, setDistrictName] = useState('District Dashboard');
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        setLoadError('');
        const { response, data } = await fetchJsonWithTimeout<DistrictPayload>('/api/admin/district', {
          credentials: 'include',
          cache: 'no-store',
          timeoutMs: 12000,
        });

        if (response.status === 401) {
          window.location.replace('/login');
          return;
        }

        if (response.status === 403) {
          window.location.replace('/admin');
          return;
        }

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Unable to load district dashboard');
        }

        setProfiles(data.profiles || []);
        setReports(data.analyses || []);
        setDistrictName(data.caller?.name ? `${data.caller.name}'s District View` : 'District Dashboard');
      } catch (error) {
        console.error('District dashboard load error:', error);
        setLoadError(error instanceof Error ? error.message : 'Unable to load district dashboard.');
      } finally {
        setReady(true);
      }
    }

    load();
  }, []);

  const teacherProfiles = useMemo(
    () => profiles.filter((profile) => profile.role === 'teacher'),
    [profiles]
  );

  const teacherStats = useMemo(() => {
    const reportsByTeacher = new Map<string, AnalysisReport[]>();
    reports.forEach((report) => {
      if (!report.user_id) return;
      const existing = reportsByTeacher.get(report.user_id) || [];
      existing.push(report);
      reportsByTeacher.set(report.user_id, existing);
    });

    return teacherProfiles
      .map((teacher) => {
        const teacherReports = reportsByTeacher.get(teacher.id) || [];
        const latestReport = teacherReports[0];
        const latestMetrics = latestReport ? getLessonMetrics(latestReport) : null;
        const averageScore = teacherReports.length
          ? Math.round(
              teacherReports.reduce((sum, report) => sum + calculateLessonScore(report), 0) / teacherReports.length
            )
          : 0;

        return {
          id: teacher.id,
          name: teacher.name || 'Teacher',
          lessons: teacherReports.length,
          avgScore: averageScore,
          latestScore: latestMetrics?.score ?? 0,
          latestCoverage: latestMetrics?.coverage ?? 0,
          gaps: latestMetrics?.gaps ?? 0,
          trend: getLatestLessonTrend(teacherReports),
          supportLevel:
            averageScore < 75 || (latestMetrics?.gaps ?? 0) >= 2
              ? 'Priority'
              : averageScore < 82
                ? 'Monitor'
                : 'Stable',
        };
      })
      .sort((a, b) => {
        const supportRank = { Priority: 0, Monitor: 1, Stable: 2 };
        if (supportRank[a.supportLevel as keyof typeof supportRank] !== supportRank[b.supportLevel as keyof typeof supportRank]) {
          return supportRank[a.supportLevel as keyof typeof supportRank] - supportRank[b.supportLevel as keyof typeof supportRank];
        }
        return a.avgScore - b.avgScore;
      });
  }, [profiles, reports, teacherProfiles]);

  const summary = useMemo(() => {
    const analyzedTeachers = teacherStats.filter((teacher) => teacher.lessons > 0);
    const systemAverage = analyzedTeachers.length
      ? Math.round(analyzedTeachers.reduce((sum, teacher) => sum + teacher.avgScore, 0) / analyzedTeachers.length)
      : 0;

    return {
      systemAverage,
      teachersTracked: teacherProfiles.length,
      lessonsAnalyzed: reports.length,
      priorityTeachers: teacherStats.filter((teacher) => teacher.supportLevel === 'Priority').length,
      stableTeachers: teacherStats.filter((teacher) => teacher.supportLevel === 'Stable').length,
    };
  }, [reports.length, teacherProfiles.length, teacherStats]);

  const topPerformers = teacherStats.filter((teacher) => teacher.lessons > 0).slice(-3).reverse();
  const priorityTeachers = teacherStats.filter((teacher) => teacher.supportLevel === 'Priority').slice(0, 5);

  if (!ready) {
    return (
      <ProtectedPageState
        mode="loading"
        title="Loading district dashboard"
        message="Building your district-wide snapshot across visible campuses, teachers, and lesson data."
      />
    );
  }

  return (
    <main style={page}>
      <div style={container}>
        <div style={header}>
          <div>
            <div style={eyebrow}>District View</div>
            <h1 style={heading}>{districtName}</h1>
            <p style={subheading}>
              A secure system-wide view of teacher lesson quality, trend movement, and support priorities across your visible campuses.
            </p>
          </div>
          <button onClick={() => router.push('/admin')} style={btn}>
            Back to Admin Dashboard
          </button>
        </div>

        {loadError ? (
          <section style={{ ...card, marginBottom: 24, border: '1px solid rgba(248,113,113,0.28)' }}>
            <p style={text}>{loadError}</p>
          </section>
        ) : null}

        <div style={statsGrid}>
          <div style={statCard}>
            <div style={statLabel}>System Average</div>
            <div style={{ ...statValue, color: summary.systemAverage >= 80 ? '#15803d' : '#c2410c' }}>
              {summary.systemAverage}/100
            </div>
            <div style={statSub}>Average teacher score across visible lesson data</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Teachers Tracked</div>
            <div style={statValue}>{summary.teachersTracked}</div>
            <div style={statSub}>Teachers currently in district scope</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Lessons Analyzed</div>
            <div style={statValue}>{summary.lessonsAnalyzed}</div>
            <div style={statSub}>Saved submissions contributing to the district view</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Priority Teachers</div>
            <div style={{ ...statValue, color: summary.priorityTeachers > 0 ? '#b91c1c' : 'var(--text-primary)' }}>
              {summary.priorityTeachers}
            </div>
            <div style={statSub}>Teachers currently crossing support thresholds</div>
          </div>
        </div>

        <div style={twoColumn}>
          <section style={card}>
            <div style={sectionEyebrow}>District Focus</div>
            <h2 style={title}>Teachers Needing the Closest Support</h2>
            {priorityTeachers.length === 0 ? (
              <p style={text}>No teachers currently cross the district priority threshold. Continue monitoring trends and reinforcing strong practice.</p>
            ) : (
              priorityTeachers.map((teacher) => (
                <div key={teacher.id} style={row}>
                  <div>
                    <div style={rowTitle}>{teacher.name}</div>
                    <div style={rowMeta}>
                      Avg {teacher.avgScore}/100, latest {teacher.latestScore}/100, gaps {teacher.gaps}
                    </div>
                  </div>
                  <div style={pillDanger}>
                    {teacher.trend > 0 ? `+${teacher.trend}` : teacher.trend < 0 ? `${teacher.trend}` : '0'}
                  </div>
                </div>
              ))
            )}
          </section>

          <section style={card}>
            <div style={sectionEyebrow}>District Strength</div>
            <h2 style={title}>Top Performing Teachers</h2>
            {topPerformers.length === 0 ? (
              <p style={text}>No lesson data has been submitted yet.</p>
            ) : (
              topPerformers.map((teacher) => (
                <div key={teacher.id} style={row}>
                  <div>
                    <div style={rowTitle}>{teacher.name}</div>
                    <div style={rowMeta}>
                      Avg {teacher.avgScore}/100, latest coverage {teacher.latestCoverage}/100, {teacher.lessons} lesson{teacher.lessons === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div style={pillSuccess}>{teacher.supportLevel}</div>
                </div>
              ))
            )}
          </section>
        </div>

        <section style={card}>
          <div style={sectionEyebrow}>District Roster</div>
          <h2 style={title}>Teacher Performance Snapshot</h2>
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Teacher</th>
                  <th style={th}>Lessons</th>
                  <th style={th}>Average</th>
                  <th style={th}>Latest</th>
                  <th style={th}>Trend</th>
                  <th style={th}>Support Level</th>
                </tr>
              </thead>
              <tbody>
                {teacherStats.map((teacher) => (
                  <tr key={teacher.id}>
                    <td style={tdStrong}>{teacher.name}</td>
                    <td style={td}>{teacher.lessons}</td>
                    <td style={td}>{teacher.avgScore ? `${teacher.avgScore}/100` : '—'}</td>
                    <td style={td}>{teacher.latestScore ? `${teacher.latestScore}/100` : '—'}</td>
                    <td style={td}>
                      {teacher.trend > 0 ? `+${teacher.trend}` : teacher.trend < 0 ? `${teacher.trend}` : '0'}
                    </td>
                    <td style={td}>
                      <span
                        style={
                          teacher.supportLevel === 'Priority'
                            ? pillDanger
                            : teacher.supportLevel === 'Monitor'
                              ? pillWarn
                              : pillSuccess
                        }
                      >
                        {teacher.supportLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
  padding: '32px 18px 48px',
};

const container: React.CSSProperties = {
  maxWidth: 1220,
  margin: '0 auto',
};

const loading: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--text-secondary)',
  background: 'var(--bg-primary)',
};

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 22,
};

const eyebrow: React.CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 1.1,
  color: '#0f766e',
  fontWeight: 800,
  marginBottom: 8,
};

const heading: React.CSSProperties = {
  margin: 0,
  fontSize: 'clamp(2rem, 4vw, 3rem)',
  color: 'var(--text-primary)',
  lineHeight: 1.05,
};

const subheading: React.CSSProperties = {
  color: 'var(--text-secondary)',
  maxWidth: 760,
  marginTop: 10,
  fontSize: 16,
  lineHeight: 1.6,
};

const btn: React.CSSProperties = {
  border: '1px solid var(--border-strong)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  padding: '12px 16px',
  borderRadius: 14,
  cursor: 'pointer',
  fontWeight: 700,
  boxShadow: 'var(--shadow-sm)',
};

const statsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
  marginBottom: 18,
};

const statCard: React.CSSProperties = {
  borderRadius: 22,
  padding: 20,
  background: 'var(--surface-card)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-md)',
};

const statLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  fontWeight: 800,
  marginBottom: 10,
};

const statValue: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 34,
  fontWeight: 800,
  lineHeight: 1,
  marginBottom: 10,
};

const statSub: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 14,
  lineHeight: 1.5,
};

const twoColumn: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 16,
  marginBottom: 18,
};

const card: React.CSSProperties = {
  borderRadius: 24,
  padding: 22,
  background: 'var(--surface-card)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-md)',
};

const sectionEyebrow: React.CSSProperties = {
  color: '#0f766e',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  fontWeight: 800,
  marginBottom: 8,
};

const title: React.CSSProperties = {
  margin: 0,
  color: 'var(--text-primary)',
  fontSize: 22,
  fontWeight: 800,
  marginBottom: 12,
};

const text: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 15,
  lineHeight: 1.6,
  margin: 0,
};

const row: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 14,
  padding: '14px 0',
  borderTop: '1px solid var(--border)',
};

const rowTitle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontWeight: 700,
  fontSize: 16,
  marginBottom: 4,
};

const rowMeta: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 14,
  lineHeight: 1.5,
};

const pillBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 12px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  border: '1px solid transparent',
  minWidth: 70,
};

const pillDanger: React.CSSProperties = {
  ...pillBase,
  color: '#b91c1c',
  background: 'rgba(239,68,68,0.10)',
  borderColor: 'rgba(239,68,68,0.20)',
};

const pillWarn: React.CSSProperties = {
  ...pillBase,
  color: '#b45309',
  background: 'rgba(245,158,11,0.10)',
  borderColor: 'rgba(245,158,11,0.20)',
};

const pillSuccess: React.CSSProperties = {
  ...pillBase,
  color: '#166534',
  background: 'rgba(34,197,94,0.10)',
  borderColor: 'rgba(34,197,94,0.20)',
};

const tableWrap: React.CSSProperties = {
  overflowX: 'auto',
};

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 720,
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '14px 12px',
  color: 'var(--text-secondary)',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.7,
  borderBottom: '1px solid var(--border)',
};

const td: React.CSSProperties = {
  padding: '14px 12px',
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border)',
  fontSize: 14,
};

const tdStrong: React.CSSProperties = {
  ...td,
  color: 'var(--text-primary)',
  fontWeight: 700,
};
