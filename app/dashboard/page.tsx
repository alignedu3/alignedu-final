"use client";
import { createClient } from '@/lib/supabase/client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { sampleReports, getDashboardSummary, getTrendData, calculateLessonScore } from '@/lib/dashboardData';

export default function TeacherDashboard() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [role, setRole] = useState('teacher');
  const [userId, setUserId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [dbReports, setDbReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const loadData = useCallback(async () => {
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

      setUserId(user.id);
      setReady(true);
      setRole(authData.profile?.role || 'teacher');
      setTeacherName(authData.profile?.name || 'Teacher');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .single();

      setRole(profile?.role || 'teacher');
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
    loadData();
  }, [loadData]);

  useEffect(() => {
    const checkScreen = () => setIsNarrowScreen(window.innerWidth <= 768);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const reports = dbReports;

  const trendData = useMemo(() => getTrendData(reports), [reports]);
  const summary = useMemo(() => getDashboardSummary(reports), [reports]);

  const latestScore = reports[0] ? calculateLessonScore(reports[0]) : 0;

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Delete this analysis? This action cannot be undone.')) return;
    setDeletingId(id);

    try {
      const response = await fetch(`/api/analyses/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.error || 'Unable to delete this analysis.');
        return;
      }

      setSelectedReport((current: any) => (current?.id === id ? null : current));
      await loadData();
    } catch (error) {
      console.error(error);
      alert('Unable to delete the lesson. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };
  const prevScore = reports[1] ? calculateLessonScore(reports[1]) : latestScore;
  const scoreDiff = latestScore - prevScore;

  const trendInsight =
    scoreDiff > 0
      ? "Your instructional quality is improving."
      : scoreDiff < 0
      ? "Performance dipped — review recent lesson gaps."
      : "Performance is stable across lessons.";

  const nextAction =
    summary.totalGaps > 0
      ? "Revisit missed concepts and strengthen lesson closure with a quick exit check."
      : "Maintain strong instruction and consider adding deeper checks for understanding.";

  const keyFindings = summary.totalGaps > 0
    ? [
        "Some supporting concepts need stronger reinforcement.",
        "Lesson closure could be improved for retention.",
        "Standards were introduced but not fully mastered."
      ]
    : [
        "Standards are clearly introduced and modeled.",
        "Lesson pacing is effective.",
        "Students are likely meeting expectations."
      ];

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

        <div style={card}>
          <h2 style={cardTitle}>Lesson Analysis</h2>

          <div style={previewGrid}>
            <div>
              <div style={bigScore}>{latestScore}/100</div>
              <div style={subText}>
                {scoreDiff > 0 ? `↑ +${scoreDiff}` : scoreDiff < 0 ? `↓ ${scoreDiff}` : 'No change'}
              </div>
            </div>

            <div>
              <div style={label}>Coverage</div>
              <div style={value}>{summary.averageCoverage}%</div>
            </div>

            <div>
              <div style={label}>Clarity</div>
              <div style={value}>{summary.averageClarity || 'Strong'}</div>
            </div>

            <div>
              <div style={label}>Gaps</div>
              <div style={value}>{summary.totalGaps || 0}</div>
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Next Best Action</h2>
          <p style={text}>{nextAction}</p>
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
            }}
          >
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
          </div>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Key Findings</h2>
          <ul style={text}>
            {keyFindings.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Recent Lessons</h2>

          {reports.length === 0 ? (
            <p style={emptyState}>
              Upload your first lesson to receive AI-powered feedback, scoring, and improvement suggestions.
            </p>
          ) : (
            <div className="table-scroll-wrap">
          <table style={table}>
              <thead>
                <tr>
                  <th style={{ ...th, width: '56%', whiteSpace: 'normal' }}>Lesson</th>
                  <th style={{ ...th, width: '18%', textAlign: 'center', whiteSpace: 'normal' }}>Score</th>
                  <th style={{ ...th, width: '26%', textAlign: 'center', whiteSpace: 'normal' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 5).map((r, i) => {
                  const score = calculateLessonScore(r);
                  const lessonLabel = `${r.grade || 'Grade?'} ${r.subject || 'Lesson'}` || `Lesson ${i + 1}`;
                  const lessonDate = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
                  return (
                    <tr key={r.id || i}>
                      <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {lessonLabel}{lessonDate ? ` · ${lessonDate}` : ''}
                      </td>
                      <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal' }}>{score}/100</td>
                      <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal' }}>
                        <button
                          style={actionButton}
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

const card: React.CSSProperties = { background: 'var(--surface-card-solid)', border: '1px solid var(--border)', padding: 20, borderRadius: 12, marginBottom: 20 };
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