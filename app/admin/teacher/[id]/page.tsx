'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';

import { calculateLessonScore, getDashboardSummary, getLessonInsights, getTrendData } from '@/lib/dashboardData';

export default function TeacherDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [reports, setReports] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', id as string)
        .maybeSingle();

      setName(profile?.name || 'Teacher');

      const { data: analyses } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', id as string)
        .order('created_at', { ascending: false });

      setReports(analyses || []);
    }

    if (id) load();
  }, [id]);

  useEffect(() => {
    if (!reports.length) {
      setActiveReportId(null);
      return;
    }
    const exists = reports.some((report) => report.id === activeReportId);
    if (!exists) {
      setActiveReportId(reports[0].id);
    }
  }, [reports]);

  const summary = useMemo(() => getDashboardSummary(reports), [reports]);

  const overview = useMemo(() => {
    if (!reports.length) {
      return { avg: 0, trend: 0, risk: 'Unknown', summary: 'No results available yet.' };
    }

    const scores = reports.map((report) => calculateLessonScore(report));
    const avg = summary.averageScore;
    const trend = scores.length > 1 ? scores[0] - scores[scores.length - 1] : 0;
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
    return reports.find((report) => report.id === activeReportId) || reports[0];
  }, [reports, activeReportId]);

  const activeInsights = useMemo(() => {
    if (!activeReport) return null;
    return getLessonInsights(activeReport);
  }, [activeReport]);

  const previousReports = useMemo(() => reports.slice(1), [reports]);

  const latestLessonLabel = useMemo(() => {
    if (!activeReport) return 'No lesson selected';
    const date = activeReport.created_at ? new Date(activeReport.created_at).toLocaleDateString() : 'No date';
    return `${activeReport.grade || 'Grade'} ${activeReport.subject || 'Lesson'} · ${date}`;
  }, [reports]);

  return (
    <main style={page} className="dashboard-page">
      <div style={container} className="dashboard-container">

        <div style={header}>
          <div>
            <h1 style={heading}>{name}</h1>
            <p style={subheading}>{reports.length} lessons analyzed</p>
          </div>
          <div style={headerMeta}>
            <div style={metaLabel}>Admin Drill-Down</div>
            <div style={metaValue}>Teacher Results</div>
          </div>
        </div>

        <div style={grid}>
          <div style={card}>
            <div style={label}>Lesson Analysis</div>
            <div style={big}>{summary.averageScore}/100</div>
            <div style={muted}>Average across {summary.lessonsAnalyzed} lesson{summary.lessonsAnalyzed === 1 ? '' : 's'}</div>
          </div>

          <div style={card}>
            <div style={label}>Average Clarity</div>
            <div style={big}>{summary.lessonsAnalyzed ? `${summary.averageClarity}%` : '—'}</div>
            <div style={muted}>Rolled up from analyzed lessons</div>
          </div>

          <div style={card}>
            <div style={label}>Total Gaps</div>
            <div style={big}>{summary.totalGaps}</div>
            <div style={muted}>All detected gaps across lessons</div>
          </div>

          <div style={card}>
            <div style={label}>Performance Trend</div>
            <div style={big}>
              {overview.trend > 0 ? `↑ +${overview.trend}` : overview.trend < 0 ? `↓ ${overview.trend}` : 'No change'}
            </div>
            <div style={muted}>{overview.risk}</div>
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
              <div style={label}>Admin Readout</div>
              <div style={text}>All detailed results remain behind the teacher and lesson drill-down links below.</div>
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

        <div style={cardFull}>
          <h2 style={title}>Performance Trend</h2>

          <div
            style={{
              marginTop: 10,
              border: '1px solid rgba(148,163,184,0.3)',
              borderRadius: 14,
              padding: '14px 12px 8px',
              background: 'linear-gradient(180deg, rgba(15,23,42,0.8) 0%, rgba(30,41,59,0.45) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#f97316" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
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
                      const chipLabel = `${report.grade || 'Grade'} ${report.subject || 'Lesson'}${report.created_at ? ` · ${new Date(report.created_at).toLocaleDateString()}` : ''}`;
                      const isActive = activeReport.id === report.id;
                      return (
                        <button
                          key={report.id || index}
                          onClick={() => setActiveReportId(report.id)}
                          style={{
                            ...chip,
                            borderColor: isActive ? '#f97316' : 'rgba(148,163,184,0.16)',
                            background: isActive ? 'rgba(249,115,22,0.14)' : 'rgba(15,23,42,0.5)',
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
                const lessonDate = report.created_at ? new Date(report.created_at).toLocaleDateString() : 'No date';
                return (
                  <Link
                    key={report.id || index}
                    href={`/admin/teacher/${id}/lesson/${report.id}`}
                    style={historyCard}
                  >
                    <div style={historyTopRow}>
                      <div style={historyTitle}>{report.grade || 'Grade'} {report.subject || 'Lesson'}</div>
                      <div style={historyScore}>{calculateLessonScore(report)}/100</div>
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
  background: '#081120',
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
  background: 'rgba(17,24,39,0.85)',
  border: '1px solid rgba(148,163,184,0.18)',
  borderRadius: 12,
  padding: '10px 12px',
  minWidth: 160
};

const metaLabel: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  fontWeight: 700
};

const metaValue: React.CSSProperties = {
  color: '#fff',
  fontSize: 15,
  marginTop: 4,
  fontWeight: 600
};

const heading: React.CSSProperties = {
  color: '#fff',
  fontSize: 28
};

const subheading: React.CSSProperties = {
  color: '#94a3b8'
};

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 16,
  marginBottom: 24
};

const card: React.CSSProperties = {
  background: '#111827',
  padding: 18,
  borderRadius: 12,
  border: '1px solid rgba(148,163,184,0.12)'
};

const cardFull: React.CSSProperties = {
  background: '#111827',
  padding: 20,
  borderRadius: 12,
  marginBottom: 20,
  border: '1px solid rgba(148,163,184,0.12)'
};

const label: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 13
};

const big: React.CSSProperties = {
  color: '#fff',
  fontSize: 24,
  marginTop: 6
};

const valueLarge: React.CSSProperties = {
  color: '#fff',
  fontSize: 22,
  marginTop: 6,
  fontWeight: 700
};

const title: React.CSSProperties = {
  color: '#fff',
  marginBottom: 10
};

const text: React.CSSProperties = {
  color: '#94a3b8'
};

const muted: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12
};

const overviewRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 14,
  marginTop: 14
};

const overviewPanel: React.CSSProperties = {
  border: '1px solid rgba(148,163,184,0.14)',
  borderRadius: 12,
  padding: 14,
  background: 'rgba(15,23,42,0.45)'
};

const findingsHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  flexWrap: 'wrap'
};

const findingsTitle: React.CSSProperties = {
  color: '#fff',
  fontSize: 16,
  fontWeight: 700,
  marginTop: 4
};

const detailLink: React.CSSProperties = {
  color: '#f97316',
  textDecoration: 'none',
  fontWeight: 600,
  whiteSpace: 'nowrap'
};

const findingsList: React.CSSProperties = {
  color: '#94a3b8',
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
  background: 'rgba(15,23,42,0.5)',
  border: '1px solid rgba(148,163,184,0.14)'
};

const chipWrap: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8
};

const chip: React.CSSProperties = {
  border: '1px solid rgba(148,163,184,0.16)',
  background: 'rgba(15,23,42,0.5)',
  color: '#fff',
  borderRadius: 999,
  padding: '7px 11px',
  fontSize: 12,
  cursor: 'pointer',
  maxWidth: 280,
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
  color: '#fff',
  padding: 16,
  borderRadius: 14,
  border: '1px solid rgba(148,163,184,0.14)',
  background: 'linear-gradient(180deg, rgba(15,23,42,0.82) 0%, rgba(17,24,39,0.92) 100%)'
};

const historyTopRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start'
};

const historyTitle: React.CSSProperties = {
  color: '#fff',
  fontSize: 16,
  fontWeight: 700
};

const historyScore: React.CSSProperties = {
  color: '#f97316',
  fontSize: 15,
  fontWeight: 700,
  whiteSpace: 'nowrap'
};