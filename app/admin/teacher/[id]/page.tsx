'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';

import { buildSampleAnalysisReports, buildAdminSupportPlanForTeacher, getDashboardSummary, getLatestLessonTrend, getLessonInsights, getLessonMetrics, getTrendData, SAMPLE_TEACHER_IDS, type AnalysisReport } from '@/lib/dashboardData';
import ProtectedPageState from '@/components/ProtectedPageState';

const stableDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'numeric',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatStableDate(value: string | null | undefined) {
  if (!value) return 'No date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No date';
  return stableDateFormatter.format(parsed);
}

export default function AdminTeacherPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id;
  const returnSection = searchParams?.get('from');
  const returnAdminId = searchParams?.get('adminId');
  const computedBackHref = `/admin${returnAdminId ? `?adminId=${encodeURIComponent(returnAdminId)}` : ''}${returnSection === 'team' ? '#team' : returnSection === 'performance' ? '#performance' : ''}`;

  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [name, setName] = useState('');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [backHref, setBackHref] = useState('/admin');

  useEffect(() => {
    setChartReady(true);
  }, []);

  useEffect(() => {
    setBackHref(computedBackHref);
  }, [computedBackHref]);

  useEffect(() => {
    async function load() {
      setLoadError('');
      if ((id as string)?.startsWith('sample-')) {
        const sampleReports = buildSampleAnalysisReports().filter((report) => report.user_id === id);
        const sampleTeacherName =
          Object.entries(SAMPLE_TEACHER_IDS).find(([, sampleId]) => sampleId === id)?.[0] || 'Sample Teacher';
        setName(sampleTeacherName);
        setReports(sampleReports);
        setReady(true);
        return;
      }
      const response = await fetch(`/api/admin/teacher/${id}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Admin teacher load error:', data.error || 'Unknown error');
        setName('Teacher');
        setReports([]);
        setLoadError(data.error || 'Unable to load teacher details.');
        setReady(true);
        return;
      }

      setName(data.teacher?.name || 'Teacher');
      setReports(data.analyses || []);
      setReady(true);
    }

    if (id) load();
  }, [id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [id]);

  const resolvedActiveReportId = useMemo(() => {
    if (!reports.length) return null;
    return reports.some((report) => report.id === activeReportId) ? activeReportId : reports[0].id;
  }, [reports, activeReportId]);

  const summary = useMemo(() => getDashboardSummary(reports), [reports]);

  const overview = useMemo(() => {
    if (!reports.length) {
      return { avg: 0, trend: 0, risk: 'Unknown', summary: 'No results available yet.' };
    }

    const avg = summary.averageScore;
    const trend = getLatestLessonTrend(reports);
    const risk = avg < 70 ? 'High Risk' : avg < 80 ? 'Moderate Risk' : 'Strong';
    const summaryText =
      avg >= 85
        ? 'Consistently strong instructional quality across analyzed lessons.'
        : avg >= 75
          ? 'Solid instructional performance with clear opportunities to sharpen consistency.'
          : 'Instruction needs targeted support around clarity, reinforcement, and closure.';

    return { avg, trend: Math.round(trend), risk, summary: summaryText };
  }, [reports, summary.averageScore]);

  const chartData = useMemo(() => getTrendData(reports), [reports]);

  const activeReport = useMemo(() => {
    if (!reports.length) return null;
    return reports.find((report) => report.id === resolvedActiveReportId) || reports[0];
  }, [reports, resolvedActiveReportId]);

  const activeInsights = useMemo(() => {
    if (!activeReport) return null;
    return getLessonInsights(activeReport);
  }, [activeReport]);

  const adminSupportPlan = useMemo(() => {
    return buildAdminSupportPlanForTeacher(name || 'Teacher', reports, typeof id === 'string' ? id : undefined);
  }, [id, name, reports]);

  const previousReports = useMemo(() => reports.slice(1), [reports]);

  const latestLessonLabel = useMemo(() => {
    if (!activeReport) return 'No lesson selected';
    const date = formatStableDate(activeReport.created_at);
    return `${activeReport.grade || 'Grade'} ${activeReport.subject || 'Lesson'} · ${date}`;
  }, [activeReport]);

  if (!ready) {
    return (
      <ProtectedPageState
        mode="loading"
        title="Loading teacher details"
        message="Pulling this teacher’s lesson history, trends, and support view."
      />
    );
  }

  if (loadError) {
    return (
      <ProtectedPageState
        mode="error"
        title="Unable to load teacher details"
        message={loadError}
        actionHref={backHref}
        actionLabel="Back to Administrator Dashboard"
      />
    );
  }

  return (
    <main style={page} className="dashboard-page">
      <div style={container} className="dashboard-container">

        <div style={header}>
          <div>
            <Link href={backHref} style={backLink}>
              Back to Dashboard
            </Link>
            <h1 style={heading}>{name}</h1>
            <p style={subheading}>{reports.length} lessons analyzed</p>
          </div>
          <div style={headerMeta}>
            <div style={metaLabel}>Administrator Drill-Down</div>
            <div style={metaValue}>Teacher Results</div>
          </div>
        </div>

        <div style={grid}>
          <div style={statCard}>
            <div style={statLabel}>Lesson Analysis</div>
            <div style={statValue}>{summary.averageScore}/100</div>
            <div style={statHelper}>Average across {summary.lessonsAnalyzed} lesson{summary.lessonsAnalyzed === 1 ? '' : 's'}</div>
          </div>

          <div style={statCard}>
            <div style={statLabel}>Average Clarity</div>
            <div style={statValue}>{summary.lessonsAnalyzed ? `${summary.averageClarity}%` : '—'}</div>
            <div style={statHelper}>Rolled up from analyzed lessons</div>
          </div>

          <div style={statCard}>
            <div style={statLabel}>Total Gaps</div>
            <div style={statValue}>{summary.totalGaps}</div>
            <div style={statHelper}>All detected gaps across lessons</div>
          </div>

          <div style={statCard}>
            <div style={statLabel}>Performance Trend</div>
            <div style={statValue}>
              {overview.trend > 0 ? `↑ ${overview.trend}` : overview.trend < 0 ? `↓ ${Math.abs(overview.trend)}` : 'No change'}
            </div>
            <div style={statHelper}>{overview.risk}</div>
          </div>
        </div>

        <div style={cardFull}>
          <h2 style={title}>Performance Overview</h2>
          <p style={text}>{overview.summary}</p>

          <div style={overviewRow}>
            <div style={overviewPanel}>
              <div style={label}>Current Status</div>
              <div style={{ ...valueLarge, color: overview.risk === 'Strong' ? '#22c55e' : overview.risk === 'Moderate Risk' ? '#f59e0b' : '#ef4444' }}>
                {overview.risk}
              </div>
            </div>
            <div style={overviewPanel}>
              <div style={label}>Administrator Readout</div>
              <div style={text}>
                {overview.summary
                  ? overview.summary
                  : 'No additional admin notes for this teacher yet.'}
              </div>
            </div>
            <div style={overviewPanel}>
              <div style={label}>Recommended Focus</div>
              <div style={text}>
                {summary.totalGaps > 0
                  ? 'Prioritize closure, reinforce gaps, and tighten checks for understanding.'
                  : 'Maintain strong execution and push toward deeper student reasoning.'}
              </div>
            </div>
          </div>
        </div>

        {adminSupportPlan && (
          <div style={cardFull}>
            <h2 style={title}>Administrator Support Plan</h2>
            <div style={supportHeader}>
              <div>
                <div style={label}>Priority Focus</div>
                <div style={findingsTitle}>{adminSupportPlan.teacherName}</div>
              </div>
              <div style={supportChip}>{adminSupportPlan.followUpTimeline}</div>
            </div>
            <p style={text}>{adminSupportPlan.summary}</p>
            <div style={{ ...text, marginTop: 10 }}>
              <strong>Administrator action:</strong> {adminSupportPlan.adminAction}
            </div>
            <div style={{ ...label, marginTop: 14, marginBottom: 8 }}>Look-fors in the next observation</div>
            <ul style={findingsList}>
              {adminSupportPlan.lookFors.map((item, index) => (
                <li key={`support-${index}`} style={findingItem}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={cardFull}>
          <h2 style={title}>Performance Trend</h2>

          <div
            style={{
              marginTop: 10,
              border: '1px solid var(--border-strong)',
              borderRadius: 14,
              padding: '14px 12px 8px',
              background: 'var(--surface-chip)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              minWidth: 0,
            }}
          >
            {chartReady ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#f97316" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 280 }} />
            )}
          </div>
        </div>

        <div style={cardFull}>
          <h2 style={title}>Key Findings</h2>

          {!activeReport || !activeInsights ? (
            <p style={text}>No lesson findings available yet.</p>
          ) : (
            <>
              <div style={findingsHeader}>
                <div>
                  <div style={label}>Showing Results For</div>
                  <div style={findingsTitle}>{latestLessonLabel}</div>
                </div>
                <Link href={`/admin/teacher/${id}/lesson/${activeReport.id}`} style={detailLink}>
                  Open Full Lesson Report
                </Link>
              </div>

              <ul style={findingsList}>
                {activeInsights.findings.map((finding, index) => (
                  <li key={index} style={findingItem}>{finding}</li>
                ))}
              </ul>

              <div style={actionPanel}>
                <div style={label}>Next Best Action</div>
                <div style={text}>{activeInsights.nextAction}</div>
              </div>

              {previousReports.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(148,163,184,0.15)' }}>
                  <div style={{ ...label, marginBottom: 8 }}>Previous Lesson Findings</div>
                  <div style={chipWrap}>
                    {previousReports.map((report, index) => {
                      const lessonDate = formatStableDate(report.created_at);
                      const chipLabel = `${report.grade || 'Grade'} ${report.subject || 'Lesson'}${lessonDate !== 'No date' ? ` · ${lessonDate}` : ''}`;
                      const isActive = activeReport.id === report.id;
                      return (
                        <button
                          key={report.id || index}
                          onClick={() => setActiveReportId(report.id)}
                          style={{
                            ...chip,
                            borderColor: isActive ? '#f97316' : 'rgba(148,163,184,0.16)',
                            background: isActive ? 'rgba(249,115,22,0.14)' : 'var(--surface-chip)',
                          }}
                          title={chipLabel}
                        >
                          {chipLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={cardFull}>
          <h2 style={title}>Lesson History</h2>

          {reports.length === 0 ? (
            <p style={text}>No lessons analyzed yet.</p>
          ) : (
            <div style={historyGrid}>
              {reports.map((report, index) => {
                const lessonDate = formatStableDate(report.created_at);
                return (
                  <Link
                    key={report.id || index}
                    href={`/admin/teacher/${id}/lesson/${report.id}`}
                    style={historyCard}
                  >
                    <div style={historyTopRow}>
                      <div style={historyTitle}>{report.grade || 'Grade'} {report.subject || 'Lesson'}</div>
                      <div style={historyScore}>{getLessonMetrics(report).score}/100</div>
                    </div>
                    <div style={muted}>{lessonDate}</div>
                    <div style={{ ...text, marginTop: 8 }}>
                      Open the full report to review findings, action steps, AI analysis, and transcript.
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}

/* ===== STYLES ===== */

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--surface-page)',
  paddingTop: 18,
};

const container: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto'
};

const header: React.CSSProperties = {
  marginBottom: 24,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap'
};

const headerMeta: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '10px 12px',
  minWidth: 0,
  width: '100%',
  maxWidth: 220
};

const metaLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  fontWeight: 700
};

const metaValue: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 15,
  marginTop: 4,
  fontWeight: 600
};

const heading: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 28
};

const subheading: React.CSSProperties = {
  color: 'var(--text-secondary)'
};

const backLink: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 10,
  color: '#f97316',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 700,
};

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 16,
  marginBottom: 24
};

const card: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  padding: 18,
  borderRadius: 12,
  border: '1px solid var(--border)',
};

const statCard: React.CSSProperties = {
  ...card,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  minHeight: 158,
  padding: '20px 18px',
  background: 'linear-gradient(180deg, var(--surface-card-solid) 0%, rgba(148,163,184,0.05) 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
};

const cardFull: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  padding: 20,
  borderRadius: 12,
  marginBottom: 20,
  border: '1px solid var(--border)',
  minWidth: 0,
};

const label: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13
};

const statLabel: React.CSSProperties = {
  ...label,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
};

const statValue: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 34,
  lineHeight: 1.05,
  marginTop: 10,
  fontWeight: 800,
};

const statHelper: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13,
  lineHeight: 1.45,
  marginTop: 10,
  maxWidth: 170,
};

const valueLarge: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 22,
  marginTop: 6,
  fontWeight: 700
};

const title: React.CSSProperties = {
  color: 'var(--text-primary)',
  marginBottom: 10
};

const text: React.CSSProperties = {
  color: 'var(--text-secondary)'
};

const muted: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12
};

const overviewRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 14,
  marginTop: 14
};

const overviewPanel: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 14,
  background: 'var(--surface-chip)'
};

const supportHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 8
};

const supportChip: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 12px',
  borderRadius: 999,
  background: 'rgba(249,115,22,0.12)',
  border: '1px solid rgba(249,115,22,0.18)',
  color: '#fdba74',
  fontSize: 12,
  fontWeight: 700
};

const findingsHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  flexWrap: 'wrap'
};

const findingsTitle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 16,
  fontWeight: 700,
  marginTop: 4
};

const detailLink: React.CSSProperties = {
  color: '#f97316',
  textDecoration: 'none',
  fontWeight: 600,
  whiteSpace: 'normal',
  lineHeight: 1.4
};

const findingsList: React.CSSProperties = {
  color: 'var(--text-secondary)',
  margin: '16px 0 0 0',
  paddingLeft: 18
};

const findingItem: React.CSSProperties = {
  marginBottom: 10,
  lineHeight: 1.6
};

const actionPanel: React.CSSProperties = {
  marginTop: 14,
  padding: 14,
  borderRadius: 12,
  background: 'var(--surface-chip)',
  border: '1px solid var(--border)'
};

const chipWrap: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8
};

const chip: React.CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--surface-chip)',
  color: 'var(--text-primary)',
  borderRadius: 999,
  padding: '7px 11px',
  fontSize: 12,
  cursor: 'pointer',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
};

const historyGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: 14
};

const historyCard: React.CSSProperties = {
  display: 'block',
  textDecoration: 'none',
  color: 'var(--text-primary)',
  padding: 16,
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--surface-card-solid)'
};

const historyTopRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start',
  flexWrap: 'wrap'
};

const historyTitle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 16,
  fontWeight: 700
};

const historyScore: React.CSSProperties = {
  color: '#f97316',
  fontSize: 15,
  fontWeight: 700,
  whiteSpace: 'nowrap'
};
