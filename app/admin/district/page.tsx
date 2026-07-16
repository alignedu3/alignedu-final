'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
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

  useEffect(() => {
    const updateScreen = () => setIsNarrowScreen(window.innerWidth <= 768);
    updateScreen();
    window.addEventListener('resize', updateScreen);
    return () => window.removeEventListener('resize', updateScreen);
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

    const getReportTimestamp = (report: AnalysisReport) => {
      const raw = report.date || report.created_at || '';
      const parsed = new Date(raw).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return teacherProfiles
      .map((teacher) => {
        const teacherReports = [...(reportsByTeacher.get(teacher.id) || [])].sort(
          (a, b) => getReportTimestamp(b) - getReportTimestamp(a)
        );
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
            teacherReports.length === 0
              ? 'No Data'
              : averageScore < 75 || (latestMetrics?.gaps ?? 0) >= 2
              ? 'Priority'
              : averageScore < 82
                ? 'Monitor'
                : 'Stable',
        };
      })
      .sort((a, b) => {
        const supportRank = { Priority: 0, Monitor: 1, Stable: 2, 'No Data': 3 };
        if (supportRank[a.supportLevel as keyof typeof supportRank] !== supportRank[b.supportLevel as keyof typeof supportRank]) {
          return supportRank[a.supportLevel as keyof typeof supportRank] - supportRank[b.supportLevel as keyof typeof supportRank];
        }
        return a.avgScore - b.avgScore;
      });
  }, [reports, teacherProfiles]);

  const summary = useMemo(() => {
    const analyzedTeachers = teacherStats.filter((teacher) => teacher.lessons > 0);
    const systemAverage = analyzedTeachers.length
      ? Math.round(analyzedTeachers.reduce((sum, teacher) => sum + teacher.avgScore, 0) / analyzedTeachers.length)
      : 0;

    return {
      systemAverage,
      teachersTracked: teacherProfiles.length,
      lessonsAnalyzed: reports.length,
      priorityTeachers: teacherStats.filter((teacher) => teacher.lessons > 0 && teacher.supportLevel === 'Priority').length,
      stableTeachers: teacherStats.filter((teacher) => teacher.lessons > 0 && teacher.supportLevel === 'Stable').length,
    };
  }, [reports.length, teacherProfiles.length, teacherStats]);

  const districtTrend = useMemo(() => {
    const buckets = new Map<string, { label: string; sortKey: number; scores: number[]; gaps: number }>();

    reports.forEach((report) => {
      const rawDate = report.date || report.created_at;
      if (!rawDate) return;
      const date = new Date(rawDate);
      if (!Number.isFinite(date.getTime())) return;

      const sortKey = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const bucket = buckets.get(key) || {
        label: date.toLocaleDateString([], { month: 'short', year: '2-digit' }),
        sortKey,
        scores: [],
        gaps: 0,
      };
      bucket.scores.push(calculateLessonScore(report));
      bucket.gaps += getLessonMetrics(report).gaps;
      buckets.set(key, bucket);
    });

    return [...buckets.values()]
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-8)
      .map((bucket) => ({
        month: bucket.label,
        average: Math.round(bucket.scores.reduce((sum, score) => sum + score, 0) / bucket.scores.length),
        lessons: bucket.scores.length,
        gaps: bucket.gaps,
      }));
  }, [reports]);

  const trendChange = districtTrend.length > 1
    ? districtTrend[districtTrend.length - 1].average - districtTrend[0].average
    : 0;

  const topPerformers = [...teacherStats]
    .filter((teacher) => teacher.lessons > 0 && teacher.supportLevel === 'Stable')
    .sort((a, b) => {
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      if (b.latestScore !== a.latestScore) return b.latestScore - a.latestScore;
      return b.lessons - a.lessons;
    })
    .slice(0, 3);
  const priorityTeachers = teacherStats.filter((teacher) => teacher.lessons > 0 && teacher.supportLevel === 'Priority').slice(0, 5);

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
        <div style={hero}>
          <div>
            <div style={eyebrow}>District View</div>
            <h1 style={heading}>{districtName}</h1>
            <p style={subheading}>
              A secure system-wide view of teacher lesson quality, trend movement, and support priorities across your visible campuses.
            </p>
          </div>
          <button onClick={() => router.push('/admin')} style={btn}>
            Back to Administrator Dashboard
          </button>
        </div>

        {loadError ? (
          <section style={{ ...card, marginBottom: 24, border: '1px solid rgba(248,113,113,0.28)' }}>
            <p style={text}>{loadError}</p>
          </section>
        ) : null}

        <div
          style={{
            ...statsGrid,
            gridTemplateColumns: isNarrowScreen ? 'repeat(2, minmax(0, 1fr))' : statsGrid.gridTemplateColumns,
            gap: isNarrowScreen ? 12 : statsGrid.gap,
          }}
        >
          <div style={{ ...statCard, padding: isNarrowScreen ? 16 : statCard.padding }}>
            <div style={{ ...statLabel, fontSize: isNarrowScreen ? 11 : statLabel.fontSize }}>System Average</div>
            <div style={{ ...statValue, fontSize: isNarrowScreen ? 28 : statValue.fontSize, color: summary.systemAverage >= 80 ? '#15803d' : '#c2410c' }}>
              {summary.systemAverage}/100
            </div>
            <div style={{ ...statSub, fontSize: isNarrowScreen ? 12 : statSub.fontSize, maxWidth: isNarrowScreen ? 160 : statSub.maxWidth }}>Average teacher score across visible lesson data</div>
          </div>
          <div style={{ ...statCard, padding: isNarrowScreen ? 16 : statCard.padding }}>
            <div style={{ ...statLabel, fontSize: isNarrowScreen ? 11 : statLabel.fontSize }}>Teachers Tracked</div>
            <div style={{ ...statValue, fontSize: isNarrowScreen ? 28 : statValue.fontSize }}>{summary.teachersTracked}</div>
            <div style={{ ...statSub, fontSize: isNarrowScreen ? 12 : statSub.fontSize, maxWidth: isNarrowScreen ? 160 : statSub.maxWidth }}>Teachers currently in district scope</div>
          </div>
          <div style={{ ...statCard, padding: isNarrowScreen ? 16 : statCard.padding }}>
            <div style={{ ...statLabel, fontSize: isNarrowScreen ? 11 : statLabel.fontSize }}>Lessons Analyzed</div>
            <div style={{ ...statValue, fontSize: isNarrowScreen ? 28 : statValue.fontSize }}>{summary.lessonsAnalyzed}</div>
            <div style={{ ...statSub, fontSize: isNarrowScreen ? 12 : statSub.fontSize, maxWidth: isNarrowScreen ? 160 : statSub.maxWidth }}>Saved submissions contributing to the district view</div>
          </div>
          <div style={{ ...statCard, padding: isNarrowScreen ? 16 : statCard.padding }}>
            <div style={{ ...statLabel, fontSize: isNarrowScreen ? 11 : statLabel.fontSize }}>Priority Teachers</div>
            <div style={{ ...statValue, fontSize: isNarrowScreen ? 28 : statValue.fontSize, color: summary.priorityTeachers > 0 ? '#b91c1c' : 'var(--text-primary)' }}>
              {summary.priorityTeachers}
            </div>
            <div style={{ ...statSub, fontSize: isNarrowScreen ? 12 : statSub.fontSize, maxWidth: isNarrowScreen ? 160 : statSub.maxWidth }}>Teachers currently crossing support thresholds</div>
          </div>
        </div>

        <section style={{ ...card, ...trendCard }}>
          <div style={chartHeader}>
            <div>
              <div style={sectionEyebrow}>District Momentum</div>
              <h2 style={{ ...title, marginBottom: 5 }}>Instructional Performance Over Time</h2>
              <p style={text}>District average lesson quality alongside observation volume.</p>
            </div>
            {districtTrend.length > 1 && (
              <div style={trendSummary}>
                <span style={trendSummaryLabel}>Period change</span>
                <strong style={{ color: trendChange >= 0 ? '#15803d' : '#b91c1c' }}>
                  {trendChange > 0 ? '+' : ''}{trendChange} points
                </strong>
              </div>
            )}
          </div>

          {districtTrend.length > 0 ? (
            <div style={chartWrap} aria-label="District instructional performance trend chart">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={districtTrend} margin={{ top: 18, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="districtScoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="score" domain={[50, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="lessons" orientation="right" allowDecimals={false} hide />
                  <Tooltip
                    cursor={{ fill: 'var(--bg-secondary)', opacity: 0.5 }}
                    contentStyle={chartTooltip}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 800 }}
                    formatter={(value, name) => [name === 'District average' ? `${value}/100` : value, name]}
                  />
                  <Bar yAxisId="lessons" dataKey="lessons" name="Lessons analyzed" fill="rgba(14,165,233,0.18)" radius={[6, 6, 0, 0]} maxBarSize={34} />
                  <Area
                    yAxisId="score"
                    type="monotone"
                    dataKey="average"
                    name="District average"
                    stroke="#0f766e"
                    strokeWidth={3}
                    fill="url(#districtScoreFill)"
                    activeDot={{ r: 6, fill: '#0f766e', stroke: 'var(--surface-card)', strokeWidth: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={chartEmpty}>
              <div style={emptyChartIcon}>↗</div>
              <div style={rowTitle}>Your district trend will build here</div>
              <p style={text}>Analyze lessons across the district to reveal performance movement and observation volume over time.</p>
            </div>
          )}

          <div style={chartLegend}>
            <span style={legendItem}><i style={{ ...legendMark, background: '#0f766e' }} />District average</span>
            <span style={legendItem}><i style={{ ...legendMark, background: 'rgba(14,165,233,0.35)' }} />Lessons analyzed</span>
          </div>
        </section>

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
                      Current avg {teacher.avgScore}/100, trend {teacher.trend > 0 ? `+${teacher.trend}` : teacher.trend < 0 ? `${teacher.trend}` : '0'}, gaps {teacher.gaps}
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
              <p style={text}>No teachers currently meet the stable top-performer threshold. Keep monitoring trends as new lesson data comes in.</p>
            ) : (
              topPerformers.map((teacher) => (
                <div key={teacher.id} style={row}>
                  <div>
                    <div style={rowTitle}>{teacher.name}</div>
                    <div style={rowMeta}>
                      Current avg {teacher.avgScore}/100, latest coverage {teacher.latestCoverage}/100, {teacher.lessons} lesson{teacher.lessons === 1 ? '' : 's'}
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
                  <th style={th}>Current Avg</th>
                  <th style={th}>Trend</th>
                  <th style={th}>Gaps</th>
                  <th style={th}>Support Level</th>
                </tr>
              </thead>
              <tbody>
                {teacherStats.map((teacher) => (
                  <tr key={teacher.id}>
                    <td style={tdStrong}>{teacher.name}</td>
                    <td style={td}>{teacher.lessons}</td>
                    <td style={td}>{teacher.avgScore ? `${teacher.avgScore}/100` : '—'}</td>
                    <td style={td}>
                      {teacher.trend > 0 ? `+${teacher.trend}` : teacher.trend < 0 ? `${teacher.trend}` : '0'}
                    </td>
                    <td style={td}>{teacher.gaps}</td>
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

const hero: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 22,
  padding: 'clamp(22px, 4vw, 38px)',
  borderRadius: 28,
  border: '1px solid var(--border)',
  background: 'linear-gradient(135deg, var(--surface-card) 0%, var(--bg-secondary) 100%)',
  boxShadow: 'var(--shadow-md)',
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
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  gap: 6,
};

const statLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  fontWeight: 800,
  marginBottom: 2,
};

const statValue: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 34,
  fontWeight: 800,
  lineHeight: 1,
  marginBottom: 2,
};

const statSub: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 14,
  lineHeight: 1.5,
  maxWidth: 200,
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

const trendCard: React.CSSProperties = {
  marginBottom: 18,
  overflow: 'hidden',
};

const chartHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
};

const trendSummary: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 3,
  padding: '10px 14px',
  borderRadius: 14,
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  fontSize: 15,
};

const trendSummaryLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
};

const chartWrap: React.CSSProperties = {
  width: '100%',
  height: 310,
  marginTop: 14,
};

const chartTooltip: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--text-primary)',
  boxShadow: 'var(--shadow-md)',
};

const chartEmpty: React.CSSProperties = {
  minHeight: 250,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  gap: 8,
  maxWidth: 520,
  margin: '0 auto',
};

const emptyChartIcon: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 54,
  height: 54,
  borderRadius: 18,
  color: '#0f766e',
  background: 'rgba(13,148,136,0.10)',
  fontSize: 27,
  fontWeight: 800,
};

const chartLegend: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: 18,
  marginTop: 4,
  color: 'var(--text-secondary)',
  fontSize: 12,
};

const legendItem: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
};

const legendMark: React.CSSProperties = {
  display: 'inline-block',
  width: 18,
  height: 4,
  borderRadius: 99,
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
