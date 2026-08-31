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

import { buildSampleAnalysisReports, buildAdminSupportPlanForTeacher, getDashboardSummary, getOverallLessonTrend, getLessonInsights, getLessonMetrics, getTrendData, SAMPLE_TEACHER_IDS, type AnalysisReport } from '@/lib/dashboardData';
import ProtectedPageState from '@/components/ProtectedPageState';
import PerformanceMetricSummary from '@/components/dashboard/PerformanceMetricSummary';

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

function getChapterLabel(report: AnalysisReport) {
  const title = String(report.title || '').trim();
  const chapterMatch = title.match(/\bchapter\s+(?:\d+[a-z]?|[ivxlcdm]+)\b/i);
  if (chapterMatch) {
    return chapterMatch[0].replace(/^chapter/i, 'Chapter');
  }
  return title || report.subject || 'Lesson';
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
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [backHref, setBackHref] = useState('/admin');

  useEffect(() => {
    setChartReady(true);
    const checkScreen = () => setIsNarrowScreen(window.innerWidth <= 768);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
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

    if (!id) return;
    void load();

    if ((id as string).startsWith('sample-')) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    };
    const refreshOnFocus = () => void load();
    const refreshTimer = window.setInterval(refreshWhenVisible, 30_000);

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
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
    const trend = getOverallLessonTrend(reports);
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
    return `${getChapterLabel(activeReport)} · ${activeReport.grade || 'Grade'} ${activeReport.subject || 'Lesson'} · ${date}`;
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

        <div style={header} className="admin-teacher-header">
          <div>
            <Link href={backHref} style={backLink}>
              ← Administrator Dashboard
            </Link>
            <div style={eyebrow}>Teacher Performance</div>
            <h1 style={heading}>{name}</h1>
            <p style={subheading}>Instructional performance, lesson evidence, and coaching priorities in one view.</p>
          </div>
          <div style={headerMeta} className="admin-teacher-header-meta">
            <div style={metaLabel}>Lessons Analyzed</div>
            <div style={metaValue}>{reports.length}</div>
          </div>
        </div>

        <div style={cardFull}>
          <div style={sectionEyebrow}>Performance Summary</div>
          <h2 style={title}>Teacher Performance</h2>
          <PerformanceMetricSummary
            overallScore={summary.averageScore}
            lessonsAnalyzed={summary.lessonsAnalyzed}
            metricHelper="Lesson average"
            metrics={[
              { label: 'Coverage', value: summary.lessonsAnalyzed ? summary.averageCoverage : null, color: '#3b82f6' },
              { label: 'Clarity', value: summary.lessonsAnalyzed ? summary.averageClarity : null, color: '#8b5cf6' },
              { label: 'Engagement', value: summary.lessonsAnalyzed ? summary.averageEngagement : null, color: '#10b981' },
              { label: 'Assessment', value: summary.lessonsAnalyzed ? summary.averageAssessment : null, color: '#f59e0b' },
            ]}
          />
        </div>

        <div style={cardFull}>
          <h2 style={title}>Performance Overview</h2>
          <p style={text}>{overview.summary}</p>

          <div style={overviewRow} className="admin-teacher-overview-grid">
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
            {(adminSupportPlan.lessonSpecificNextMove || adminSupportPlan.priorityContentGap) && (
              <details style={supportDetails}>
                <summary style={supportDetailsSummary}>View lesson-specific coaching details</summary>
                {adminSupportPlan.lessonSpecificNextMove && (
                  <p style={{ ...text, margin: '10px 0 0' }}><strong>Suggested next move:</strong> {adminSupportPlan.lessonSpecificNextMove}</p>
                )}
                {adminSupportPlan.priorityContentGap && (
                  <p style={{ ...text, margin: '10px 0 0' }}><strong>Priority content gap:</strong> {adminSupportPlan.priorityContentGap}</p>
                )}
              </details>
            )}
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
              <ResponsiveContainer width="100%" height={isNarrowScreen ? 220 : 280}>
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
              <div style={findingsHeader} className="admin-teacher-findings-header">
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
                  <div style={chipWrap} className="admin-teacher-chip-wrap">
                    {previousReports.map((report, index) => {
                      const lessonDate = formatStableDate(report.created_at);
                      const chapterLabel = getChapterLabel(report);
                      const chipLabel = `${chapterLabel}, ${report.grade || 'Grade'} ${report.subject || 'Lesson'}${lessonDate !== 'No date' ? `, ${lessonDate}` : ''}`;
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
                          <span style={previousFindingChapter}>{chapterLabel}</span>
                          <span style={previousFindingMeta}>
                            {report.grade || 'Grade'} {report.subject || 'Lesson'}{lessonDate !== 'No date' ? ` · ${lessonDate}` : ''}
                          </span>
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
            <div style={historyGrid} className="admin-teacher-history-grid">
              {reports.map((report, index) => {
                const lessonDate = formatStableDate(report.created_at);
                const chapterLabel = getChapterLabel(report);
                return (
                  <Link
                    key={report.id || index}
                    href={`/admin/teacher/${id}/lesson/${report.id}`}
                    style={historyCard}
                    className="admin-history-card"
                  >
                    <div style={historyTopRow}>
                      <div>
                        <div style={historyTitle}>{chapterLabel}</div>
                        <div style={historyCourse}>{report.grade || 'Grade'} {report.subject || 'Lesson'}</div>
                      </div>
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
  background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
};

const container: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto'
};

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 20,
  flexWrap: 'wrap',
  marginBottom: 22,
  padding: 'clamp(22px, 4vw, 36px)',
  borderRadius: 28,
  border: '1px solid var(--border)',
  background: 'linear-gradient(135deg, var(--surface-card-solid) 0%, var(--bg-tertiary) 100%)',
  boxShadow: 'var(--shadow-card)',
};

const headerMeta: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  border: '1px solid var(--border)',
  borderRadius: 18,
  padding: '14px 18px',
  minWidth: 0,
  minHeight: 84,
  width: 170,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  boxShadow: 'var(--shadow-soft)',
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
  fontSize: 30,
  lineHeight: 1,
  marginTop: 8,
  fontWeight: 800
};

const eyebrow: React.CSSProperties = {
  color: '#ea580c',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontWeight: 800,
  marginBottom: 8,
};

const heading: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 'clamp(2rem, 4vw, 2.8rem)',
  lineHeight: 1.05,
  margin: '0 0 8px 0',
};

const subheading: React.CSSProperties = {
  color: 'var(--text-secondary)',
  margin: 0,
  fontSize: 16,
  lineHeight: 1.55,
  maxWidth: 650,
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

const cardFull: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  padding: 22,
  borderRadius: 22,
  marginBottom: 20,
  border: '1px solid var(--border)',
  minWidth: 0,
  boxShadow: 'var(--shadow-card)',
};

const label: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13
};

const valueLarge: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 22,
  marginTop: 6,
  fontWeight: 700
};

const title: React.CSSProperties = {
  color: 'var(--text-primary)',
  marginTop: 0,
  marginBottom: 10,
  fontSize: 22,
};

const sectionEyebrow: React.CSSProperties = {
  color: '#ea580c',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  fontWeight: 800,
  marginBottom: 7,
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
  borderRadius: 16,
  padding: 16,
  background: 'linear-gradient(180deg, var(--surface-card-solid) 0%, var(--surface-chip) 100%)',
  boxShadow: 'var(--shadow-soft)',
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

const supportDetails: React.CSSProperties = {
  marginTop: 12,
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--surface-chip)'
};

const supportDetailsSummary: React.CSSProperties = {
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: 13,
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
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 10
};

const chip: React.CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--surface-chip)',
  color: 'var(--text-primary)',
  borderRadius: 14,
  padding: '12px 14px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 5,
  textAlign: 'left',
  maxWidth: '100%',
  minHeight: 72,
  boxShadow: 'var(--shadow-soft)',
  transition: 'border-color 160ms ease, background 160ms ease, transform 160ms ease'
};

const previousFindingChapter: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1.25
};

const previousFindingMeta: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 11,
  lineHeight: 1.4
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
  background: 'linear-gradient(180deg, var(--surface-card-solid) 0%, rgba(148,163,184,0.04) 100%)',
  boxShadow: 'var(--shadow-soft)',
  transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
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

const historyCourse: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
  marginTop: 4
};

const historyScore: React.CSSProperties = {
  color: '#f97316',
  fontSize: 15,
  fontWeight: 700,
  whiteSpace: 'nowrap'
};
