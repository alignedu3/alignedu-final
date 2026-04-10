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
    const getRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        setRole(data?.role || null);
      }
    };

    getRole();
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUserId(user.id);

        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();

        setTeacherName(userData?.name || 'Teacher');

        const { data } = await supabase
          .from('analyses')
          .select('*')
          .order('created_at', { ascending: false })
          .eq('user_id', user.id);

        setDbReports(data || []);
        setReady(true);
      } catch (error) {
        console.error('Error loading reports:', error);
        setReady(true);
      }
    }

    loadData();
  }, []);

  const reports = dbReports.length > 0
    ? dbReports
    : sampleReports.filter(r => r.teacher === userId);

  const trendData = useMemo(() => getTrendData(reports), [reports]);
  const summary = useMemo(() => getDashboardSummary(reports), [reports]);

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

        {/* HEADER */}
        <div style={header}>
          <div>
            <h1 style={heading}>
              Welcome{teacherName ? `, ${teacherName}` : ''}
            </h1>
            <p style={subheading}>
              View your lesson performance and improvement insights
            </p>
          </div>

          <div style={buttonGroup}>
            <Link href="/analyze" style={primaryBtn}>+ Analyze Lesson</Link>

            {role === 'admin' && (
              <>
              </>
            )}
          </div>
        </div>

        {/* SCORE TREND */}
        <div style={card}>
          <div style={cardHeader}>
            <h2 style={cardTitle}>📈 Score Trend</h2>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* RECENT LESSONS */}
        <div style={card}>
          <div style={cardHeader}>
            <h2 style={cardTitle}>📋 Recent Lessons</h2>
          </div>

          {reports.length === 0 ? (
            <p style={emptyState}>
              No lessons yet — click “Analyze Lesson” to get started.
            </p>
          ) : (
            <div style={tableWrapper}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Title</th>
                    <th style={th}>Grade</th>
                    <th style={th}>Subject</th>
                    <th style={th}>Score</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.slice(0, 10).map((r, i) => (
                    <tr key={i} style={tr}>
                      <td style={td}>{r.title || 'Untitled'}</td>
                      <td style={td}>{r.grade || '-'}</td>
                      <td style={td}>{r.subject || '-'}</td>
                      <td style={td}>{calculateLessonScore(r)}/100</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ANALYSIS (LIGHTWEIGHT INSIGHT ONLY) */}
        <div style={card}>
          <div style={cardHeader}>
            <h2 style={cardTitle}>Insight Summary</h2>
          </div>

          <div style={analysisSummary}>
            <div style={summaryItem}>Instructional Score: {summary.averageScore}/100</div>
            <div style={summaryItem}>Coverage: {summary.averageCoverage}%</div>
            <div style={summaryItem}>Clarity: {summary.averageClarity || 'Strong'}</div>
            <div style={summaryItem}>Gaps Flagged: {summary.totalGaps}</div>
          </div>
        </div>

      </div>
    </main>
  );
}

/* ================= STYLES ================= */

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 30%), linear-gradient(180deg, #07111f 0%, #081120 100%)',
  padding: '40px 24px',
  position: 'relative'
};

const glow1: React.CSSProperties = {
  position: 'absolute',
  width: 420,
  height: 420,
  borderRadius: '999px',
  background: 'rgba(56,189,248,0.06)',
  filter: 'blur(100px)',
  top: '4%',
  left: '4%'
};

const glow2: React.CSSProperties = {
  position: 'absolute',
  width: 380,
  height: 380,
  borderRadius: '999px',
  background: 'rgba(249,115,22,0.06)',
  filter: 'blur(100px)',
  bottom: '8%',
  right: '6%'
};

const container: React.CSSProperties = {
  maxWidth: 1240,
  margin: '0 auto'
};

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 24,
  flexWrap: 'wrap',
  gap: 16
};

const buttonGroup: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap'
};

const heading: React.CSSProperties = {
  color: '#fff',
  fontSize: 30,
  fontWeight: 700
};

const subheading: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 14
};

const primaryBtn: React.CSSProperties = {
  background: '#f97316',
  color: '#fff',
  padding: '10px 18px',
  borderRadius: 8
};

const secondaryBtn: React.CSSProperties = {
  background: '#1f2937',
  color: '#fff',
  padding: '10px 18px',
  borderRadius: 8
};

const card: React.CSSProperties = {
  background: '#1f2937',
  padding: 24,
  borderRadius: 12,
  marginBottom: 20
};

const cardHeader: React.CSSProperties = {
  marginBottom: 14
};

const cardTitle: React.CSSProperties = {
  color: '#fff',
  fontSize: 18
};

const tableWrapper: React.CSSProperties = {
  overflowX: 'auto'
};

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse'
};

const th: React.CSSProperties = {
  color: '#94a3b8',
  textAlign: 'left',
  padding: 10
};

const tr: React.CSSProperties = {
  borderBottom: '1px solid #333'
};

const td: React.CSSProperties = {
  padding: 10,
  color: '#fff'
};

const analysisSummary: React.CSSProperties = {
  marginTop: 10
};

const summaryItem: React.CSSProperties = {
  marginBottom: 8,
  color: '#fff'
};

const emptyState: React.CSSProperties = {
  color: '#94a3b8'
};

const loadingContainer: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh'
};

const loadingText: React.CSSProperties = {
  color: '#fff'
};