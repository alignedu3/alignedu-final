"use client";
import { createClient } from '@/lib/supabase/client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { sampleReports, getDashboardSummary, getTrendData, calculateLessonScore } from '@/lib/dashboardData';

export default function TeacherDashboard() {
  const supabase = createClient();
  const [role, setRole] = useState('teacher');
  const [userId, setUserId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [dbReports, setDbReports] = useState<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

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
      setReady(true);
    };

    load();
  }, []);

  const reports = dbReports.length > 0
    ? dbReports
    : sampleReports.filter(r => r.teacher === userId);

  const trendData = useMemo(() => getTrendData(reports), [reports]);
  const summary = useMemo(() => getDashboardSummary(reports), [reports]);

  const latestScore = reports[0] ? calculateLessonScore(reports[0]) : 0;
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
    <main style={page}>
      <div style={glow1} />
      <div style={glow2} />

      <div style={container}>

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
          <h2 style={cardTitle}>Analysis Preview</h2>

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
              <div style={value}>{summary.totalGaps}</div>
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

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis domain={[0, 100]} stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#f97316" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
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
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Lesson</th>
                  <th style={th}>Score</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 5).map((r, i) => {
                  const score = calculateLessonScore(r);
                  return (
                    <tr key={i}>
                      <td style={td}>{r.title || 'Untitled'}</td>
                      <td style={td}>{score}/100</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </main>
  );
}

/* ===== FIXED STYLES ===== */

const page: React.CSSProperties = { minHeight: '100vh', background: '#081120', padding: 40 };
const container: React.CSSProperties = { maxWidth: 1200, margin: '0 auto' };

const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: 24 };
const heading: React.CSSProperties = { color: '#fff', fontSize: 28 };
const subheading: React.CSSProperties = { color: '#94a3b8' };

const buttonGroup: React.CSSProperties = { display: 'flex', gap: 10 };
const primaryBtn: React.CSSProperties = { background: '#f97316', color: '#fff', padding: '10px 16px', borderRadius: 8 };

const card: React.CSSProperties = { background: '#111827', padding: 20, borderRadius: 12, marginBottom: 20 };
const cardTitle: React.CSSProperties = { color: '#fff', marginBottom: 10 };

const previewGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 };
const bigScore: React.CSSProperties = { fontSize: 32, color: '#fff', fontWeight: 700 };
const subText: React.CSSProperties = { color: '#94a3b8' };

const label: React.CSSProperties = { color: '#94a3b8' };
const value: React.CSSProperties = { color: '#fff', fontSize: 18 };

const text: React.CSSProperties = { color: '#94a3b8' };

const table: React.CSSProperties = { width: '100%' };
const th: React.CSSProperties = { color: '#94a3b8', textAlign: 'left', padding: 8 };
const td: React.CSSProperties = { color: '#fff', padding: 8 };

const emptyState: React.CSSProperties = { color: '#94a3b8' };

const glow1: React.CSSProperties = { display: 'none' };
const glow2: React.CSSProperties = { display: 'none' };

const loadingContainer: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' };
const loadingText: React.CSSProperties = { color: '#fff' };