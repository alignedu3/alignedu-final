"use client";
import { createClient } from '@/lib/supabase/client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { buildTeacherDashboardSampleReports, getDashboardSummary, getTrendData, calculateLessonScore, getLatestLessonTrend, getLessonInsights, type AnalysisReport } from '@/lib/dashboardData';

export default function TeacherDashboard() {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (typeof window !== 'undefined' && !supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [dbReports, setDbReports] = useState<AnalysisReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);
  const [keyFindingsReportId, setKeyFindingsReportId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const loadData = useCallback(async () => {
    if (!supabase) return;

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

      setReady(true);
      setTeacherName(authData.profile?.name || 'Teacher');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .single();

      setTeacherName(profile?.name || 'Teacher');

      const { data } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setDbReports(data || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setReady(true);
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    loadData();
  }, [loadData, supabase]);

  useEffect(() => {
    const checkScreen = () => setIsNarrowScreen(window.innerWidth <= 768);
    checkScreen();
    setChartReady(true);
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const sampleTeacherReports = useMemo<AnalysisReport[]>(
    () =>
      buildTeacherDashboardSampleReports(teacherName || 'Teacher'),
    [teacherName]
  );

  const isSampleMode = dbReports.length === 0;
  const reports = isSampleMode ? sampleTeacherReports : dbReports;

  useEffect(() => {
    if (!reports.length) {
      setKeyFindingsReportId(null);
      return;
    }
    const exists = reports.some((r) => r.id === keyFindingsReportId);
    if (!exists) {
      setKeyFindingsReportId(reports[0].id);
    }
  }, [reports, keyFindingsReportId]);

  const trendData = useMemo(() => getTrendData(reports), [reports]);
  const summary = useMemo(() => getDashboardSummary(reports), [reports]);

  const latestScore = reports[0] ? calculateLessonScore(reports[0]) : 0;
  const overallScore = summary.averageScore;

  const handleViewReport = (report: AnalysisReport) => {
    setSelectedReport(report);
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Delete this analysis? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/analyses/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.error || 'Unable to delete this analysis.');
        return;
      }

      setSelectedReport((current) => (current?.id === id ? null : current));
      await loadData();
    } catch (error) {
      console.error(error);
      alert('Unable to delete the lesson. Please try again.');
    }
  };
  const scoreDiff = getLatestLessonTrend(reports);

  const trendInsight =
    scoreDiff > 0
      ? "Your instructional quality is improving."
      : scoreDiff < 0
      ? "Performance dipped — review recent lesson gaps."
      : "Performance is stable across lessons.";

  const nextActions =
    summary.totalGaps > 0
      ? [
          'Reteach the top missed concept in your next lesson opener.',
          'Add a 2-minute exit check to confirm closure.',
          'Use one targeted follow-up question for students who miss the check.',
        ]
      : [
          'Keep your current pacing and clarity moves consistent.',
          'Add one deeper check-for-understanding prompt in the final 10 minutes.',
        ];

  const activeKeyFindingsReport = useMemo(() => {
    if (!reports.length) return null;
    return reports.find((r) => r.id === keyFindingsReportId) || reports[0];
  }, [reports, keyFindingsReportId]);

  const keyFindings = useMemo(() => {
    if (!activeKeyFindingsReport) return [];
    return getLessonInsights(activeKeyFindingsReport).findings;
  }, [activeKeyFindingsReport]);

  const previousLessonReports = useMemo(() => reports.slice(1), [reports]);

  if (!ready) {
    return (
      <div style={loadingContainer}>
        <p style={loadingText}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <main style={page} className="dashboard-page">
      <div style={glow1} />
      <div style={glow2} />

      <div style={container} className="dashboard-container">

        <div style={header}>
          <div>
            <h1 style={heading}>
              Welcome{teacherName ? `, ${teacherName}` : ''}
            </h1>
            <p style={subheading}>
              Your instructional performance at a glance
            </p>
          </div>

          <div style={buttonGroup}>
            <Link href="/analyze" style={primaryBtn}>+ Analyze Lesson</Link>
          </div>
        </div>

        {isSampleMode && (
          <div
            style={{
              ...card,
              marginBottom: 12,
              border: '1px solid rgba(56,189,248,0.24)',
              background: 'linear-gradient(135deg, rgba(14,165,233,0.14), rgba(15,23,42,0.08))',
            }}
          >
            <div style={{ ...label, color: '#7dd3fc', fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
              Sample Data
            </div>
            <p style={{ ...text, margin: '0 0 8px 0' }}>
              This sample dashboard shows how your trend line, lesson scores, and findings will look once your instructional history starts building.
            </p>
            <p style={{ ...text, margin: 0 }}>
              It will disappear automatically after your first lesson is uploaded.
            </p>
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => setSelectedReport(reports[0] || null)}
                style={{ ...actionButton, background: '#f97316', padding: '8px 12px' }}
              >
                Open Sample Lesson Analysis
              </button>
            </div>
          </div>
        )}

        <div style={card}>
          <h2 style={cardTitle}>Overall Lesson Analysis</h2>

          <div style={previewGrid}>
            <div>
              <div style={bigScore}>{overallScore}/100</div>
              <div style={subText}>
                {summary.lessonsAnalyzed > 0
                  ? `Average across ${summary.lessonsAnalyzed} lesson${summary.lessonsAnalyzed === 1 ? '' : 's'}`
                  : 'No lessons analyzed yet'}
              </div>
            </div>

            <div>
              <div style={label}>Coverage</div>
              <div style={value}>{summary.averageCoverage}%</div>
            </div>

            <div>
              <div style={label}>Clarity</div>
              <div style={value}>{summary.lessonsAnalyzed ? `${summary.averageClarity}%` : '—'}</div>
            </div>

            <div>
              <div style={label}>Total Gaps</div>
              <div style={value}>{summary.totalGaps || 0}</div>
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Next Best Actions</h2>
          <ul style={{ ...text, margin: '0', paddingLeft: 18 }}>
            {nextActions.map((action, index) => (
              <li key={index} style={{ marginBottom: 6 }}>{action}</li>
            ))}
          </ul>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>📈 Score Trend</h2>
          <p style={text}>{trendInsight}</p>

          <div
            style={{
              marginTop: 10,
              border: '1px solid rgba(148,163,184,0.3)',
              borderRadius: 14,
              padding: isNarrowScreen ? '10px 8px 4px' : '14px 12px 8px',
              background: 'linear-gradient(180deg, rgba(15,23,42,0.8) 0%, rgba(30,41,59,0.45) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
              minWidth: 0,
            }}
          >
            {chartReady ? (
              <ResponsiveContainer width="100%" height={isNarrowScreen ? 210 : 260}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{ fontSize: isNarrowScreen ? 10 : 12 }}
                    minTickGap={isNarrowScreen ? 20 : 10}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#94a3b8"
                    tick={{ fontSize: isNarrowScreen ? 10 : 12 }}
                    width={isNarrowScreen ? 28 : 40}
                  />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#f97316" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: isNarrowScreen ? 210 : 260 }} />
            )}
          </div>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Key Findings</h2>
          {!activeKeyFindingsReport ? (
            <p style={text}>No lesson findings yet.</p>
          ) : (
            <>
              <p style={{ ...text, marginTop: 0 }}>
                Showing findings for: {activeKeyFindingsReport.grade || 'Grade'} {activeKeyFindingsReport.subject || 'Lesson'}
                {activeKeyFindingsReport.created_at ? ` · ${new Date(activeKeyFindingsReport.created_at).toLocaleDateString()}` : ''}
              </p>
              <ul style={text}>
                {keyFindings.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>

              {previousLessonReports.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ ...label, marginBottom: 8 }}>Previous Lesson Key Findings</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {previousLessonReports.map((r, idx) => {
                      const chip = `${r.grade || 'Grade'} ${r.subject || 'Lesson'}${r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString()}` : ''}`;
                      const isActive = activeKeyFindingsReport?.id === r.id;
                      return (
                        <button
                          key={r.id || idx}
                          onClick={() => setKeyFindingsReportId(r.id)}
                          style={{
                            border: `1px solid ${isActive ? '#f97316' : 'var(--border)'}`,
                            background: isActive ? 'rgba(249,115,22,0.14)' : 'var(--surface-chip)',
                            color: 'var(--text-primary)',
                            borderRadius: 999,
                            padding: '6px 10px',
                            fontSize: 12,
                            cursor: 'pointer',
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={chip}
                        >
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Lessons</h2>

          {reports.length === 0 ? (
            <p style={emptyState}>
              Upload your first lesson to receive AI-powered feedback, scoring, and improvement suggestions.
            </p>
          ) : (
            <div
              className="table-scroll-wrap"
              style={isNarrowScreen ? { overflowX: 'hidden', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 6px', background: 'linear-gradient(180deg, var(--surface-card-solid) 0%, rgba(148,163,184,0.05) 100%)' } : undefined}
            >
          <table style={{ ...table, minWidth: '100%' }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: '40%', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : th.padding, fontSize: isNarrowScreen ? 12 : th.fontSize }}>Lesson</th>
                  <th style={{ ...th, width: '18%', textAlign: 'center', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : th.padding, fontSize: isNarrowScreen ? 12 : th.fontSize }}>Score</th>
                  <th style={{ ...th, width: '18%', textAlign: 'center', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : th.padding, fontSize: isNarrowScreen ? 12 : th.fontSize }}>Trend</th>
                  <th style={{ ...th, width: '24%', textAlign: 'center', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : th.padding, fontSize: isNarrowScreen ? 12 : th.fontSize }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, isSampleMode ? 10 : 5).map((r, i) => {
                  const score = calculateLessonScore(r);
                  const previous = reports[i + 1];
                  const trend = previous ? score - calculateLessonScore(previous) : null;
                  const lessonLabel = `${r.grade || 'Grade?'} ${r.subject || 'Lesson'}` || `Lesson ${i + 1}`;
                  const lessonDate = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
                  return (
                    <tr key={r.id || i}>
                      <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word', padding: isNarrowScreen ? '4px 3px' : td.padding, fontSize: isNarrowScreen ? 12 : td.fontSize }}>
                        {lessonLabel}{lessonDate ? ` · ${lessonDate}` : ''}
                      </td>
                      <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : td.padding, fontSize: isNarrowScreen ? 12 : td.fontSize }}>{score}/100</td>
                      <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : td.padding, fontSize: isNarrowScreen ? 12 : td.fontSize, color: trend === null ? 'var(--text-secondary)' : trend >= 0 ? '#22c55e' : '#ef4444' }}>
                        {trend === null
                          ? '—'
                          : trend > 0
                            ? `↑ ${trend}`
                            : trend < 0
                              ? `↓ ${Math.abs(trend)}`
                              : '→ 0'}
                      </td>
                      <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : td.padding }}>
                        <button
                          style={{ ...actionButton, padding: isNarrowScreen ? '3px 7px' : actionButton.padding, fontSize: isNarrowScreen ? 11 : undefined }}
                          onClick={() => handleViewReport(r)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {selectedReport && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={cardTitle}>Selected Lesson</h2>
                <p style={subheading}>{selectedReport.grade} {selectedReport.subject || 'Lesson'}</p>
              </div>
              <button
                style={secondaryButton}
                onClick={() => setSelectedReport(null)}
              >
                Close
              </button>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ ...label, fontSize: 12 }}>Score</div>
                  <div style={{ ...value, fontSize: 20 }}>{calculateLessonScore(selectedReport)}/100</div>
                </div>
                <div>
                  <div style={{ ...label, fontSize: 12 }}>Coverage</div>
                  <div style={{ ...value, fontSize: 20 }}>{selectedReport.coverage_score ?? 'N/A'}</div>
                </div>
                <div>
                  <div style={{ ...label, fontSize: 12 }}>Clarity</div>
                  <div style={{ ...value, fontSize: 20 }}>{selectedReport.clarity_rating ?? 'N/A'}</div>
                </div>
                <div>
                  <div style={{ ...label, fontSize: 12 }}>Engagement</div>
                  <div style={{ ...value, fontSize: 20 }}>{selectedReport.engagement_level ?? 'N/A'}</div>
                </div>
              </div>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(148,163,184,0.2)' }}>
                <h3 style={{ ...cardTitle, fontSize: 14, marginBottom: 12 }}>📋 Full Analysis Report</h3>
                <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', color: '#d1d5db', fontSize: 13, lineHeight: 1.6, maxHeight: 400, overflowY: 'auto' }}>
                  {selectedReport.result || 'No saved analysis text available.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary)' };
const container: React.CSSProperties = { maxWidth: 1200, margin: '0 auto' };
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 };
const heading: React.CSSProperties = { color: 'var(--text-primary)', fontSize: 28, margin: '0 0 4px 0' };
const subheading: React.CSSProperties = { color: 'var(--text-secondary)', margin: 0 };
const buttonGroup: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'center' };
const primaryBtn: React.CSSProperties = { background: '#f97316', color: '#fff', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' };

const card: React.CSSProperties = { background: 'var(--surface-card-solid)', border: '1px solid var(--border)', padding: 20, borderRadius: 12, marginBottom: 20, minWidth: 0 };
const cardTitle: React.CSSProperties = { color: 'var(--text-primary)', marginBottom: 10 };

const previewGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 };
const bigScore: React.CSSProperties = { fontSize: 32, color: 'var(--text-primary)', fontWeight: 700 };
const subText: React.CSSProperties = { color: 'var(--text-secondary)' };

const label: React.CSSProperties = { color: 'var(--text-secondary)' };
const value: React.CSSProperties = { color: 'var(--text-primary)', fontSize: 18 };

const text: React.CSSProperties = { color: 'var(--text-secondary)' };

const table: React.CSSProperties = { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' };
const th: React.CSSProperties = { color: 'var(--text-secondary)', textAlign: 'left', padding: '5px 6px', fontSize: 13 };
const td: React.CSSProperties = { color: 'var(--text-primary)', padding: '5px 6px', fontSize: 14, verticalAlign: 'middle' };
const actionButton: React.CSSProperties = {
  background: '#22c55e',
  color: '#fff',
  border: 'none',
  padding: '4px 9px',
  marginRight: 0,
  borderRadius: 8,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
const deleteButton: React.CSSProperties = {
  background: '#ef4444',
  color: '#fff',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 8,
  cursor: 'pointer',
};
const secondaryButton: React.CSSProperties = {
  background: 'transparent',
  color: '#f97316',
  border: '1px solid rgba(249,115,22,0.5)',
  padding: '8px 14px',
  borderRadius: 8,
  cursor: 'pointer',
};

const emptyState: React.CSSProperties = { color: 'var(--text-secondary)' };

const glow1: React.CSSProperties = { display: 'none' };
const glow2: React.CSSProperties = { display: 'none' };

const loadingContainer: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' };
const loadingText: React.CSSProperties = { color: 'var(--text-primary)' };
