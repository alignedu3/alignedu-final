'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { sampleReports, getDashboardSummary, getTrendData, calculateLessonScore } from '@/lib/dashboardData';
import { createClient } from '@/lib/supabase/client';

export default function AdminDashboard() {
  const [dbReports, setDbReports] = useState<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('analyses')
          .select('*')
          .order('created_at', { ascending: false });

        setDbReports(data || []);
        setReady(true);
      } catch (error) {
        console.error('Error loading reports:', error);
        setReady(true);
      }
    }
    loadData();
  }, []);

  if (!ready) return (
    <div style={loadingContainer}>
      <p style={loadingText}>Loading...</p>
    </div>
  );

  const reports = dbReports.length > 0 ? dbReports : sampleReports;

  const summary = getDashboardSummary(reports);
  const trendData = getTrendData(reports);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return reports.filter(r => {
      const d = new Date(r.created_at || Date.now());
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [reports]);

  return (
    <main style={page}>
      <div style={glow1} />
      <div style={glow2} />
      <div style={container}>

        {/* HEADER */}
        <div style={header}>
          <div>
            <div style={badge}>Admin Dashboard</div>
            <h1 style={heading}>Organization Overview</h1>
            <p style={subheading}>Monitor all lessons, teacher activity, and trends in your organization.</p>
          </div>
          <Link href="/analyze" style={primaryBtn}>+ Analyze Lesson</Link>
        </div>

        {/* SUMMARY CARDS */}
        <div style={statsGrid}>
          <div style={statCard}>
            <div style={statLabel}>Average Score</div>
            <div style={statValue}>{summary.averageScore}<span style={statUnit}>/100</span></div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Total Lessons</div>
            <div style={statValue}>{reports.length}</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>This Month</div>
            <div style={statValue}>{thisMonthCount}</div>
          </div>
        </div>

        {/* SCORE TREND CHART */}
        <div style={card}>
          <div style={cardHeader}>
            <h2 style={cardTitle}>📈 Score Trend</h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 13 }} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 13 }} />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid rgba(148,163,184,0.2)',
                  borderRadius: 12,
                  color: '#f8fafc',
                  padding: 10
                }}
              />
              <Line type="monotone" dataKey="score" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* RECENT LESSONS */}
        <div style={card}>
          <div style={cardHeader}>
            <h2 style={cardTitle}>📋 Recent Lessons</h2>
            <Link href="/analyze" style={linkBtn}>New Analysis →</Link>
          </div>
          {reports.length === 0 ? (
            <p style={emptyState}>
              No lessons yet. <Link href="/analyze" style={highlightLink}>Analyze your first lesson →</Link>
            </p>
          ) : (
            <div style={tableWrapper}>
              <table style={table}>
                <thead>
                  <tr>{['Title', 'Teacher', 'Grade', 'Subject', 'Score'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {reports.slice(0, 10).map((r, i) => (
                    <tr key={i} style={tr}>
                      <td style={td}>{r.title || 'Untitled'}</td>
                      <td style={td}>{r.teacher || '-'}</td>
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

      </div>
    </main>
  );
}

// ---------------- STYLES ----------------
const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 30%), linear-gradient(180deg, #07111f 0%, #081120 100%)',
  padding: '40px 24px',
  fontFamily: 'Inter, Roboto, Arial, sans-serif',
  position: 'relative',
  overflow: 'hidden'
};

const glow1: React.CSSProperties = {
  position: 'absolute', width: 420, height: 420, borderRadius: '999px',
  background: 'rgba(56,189,248,0.06)', filter: 'blur(100px)',
  top: '4%', left: '4%', pointerEvents: 'none'
};

const glow2: React.CSSProperties = {
  position: 'absolute', width: 380, height: 380, borderRadius: '999px',
  background: 'rgba(249,115,22,0.06)', filter: 'blur(100px)',
  bottom: '8%', right: '6%', pointerEvents: 'none'
};

const container: React.CSSProperties = { maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 1 };
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap', gap: 16 };
const badge: React.CSSProperties = {
  display: 'inline-flex', padding: '6px 14px', borderRadius: 999,
  background: 'rgba(56,189,248,0.15)', color: '#7dd3fc',
  fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10
};
const heading: React.CSSProperties = { fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, color: '#f8fafc', margin: '0 0 8px', letterSpacing: '-0.02em' };
const subheading: React.CSSProperties = { fontSize: 15, color: '#94a3b8', margin: 0, lineHeight: 1.7 };
const primaryBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #f97316, #ea580c)',
  color: '#fff', padding: '12px 26px', borderRadius: 16,
  fontWeight: 700, fontSize: 15, textDecoration: 'none',
  boxShadow: '0 10px 28px rgba(249,115,22,0.25)', whiteSpace: 'nowrap'
};
const statsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 };
const statCard: React.CSSProperties = { background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 24, padding: '28px 32px', backdropFilter: 'blur(16px)' };
const statLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 };
const statValue: React.CSSProperties = { fontSize: 38, fontWeight: 800, color: '#f8fafc', lineHeight: 1 };
const statUnit: React.CSSProperties = { fontSize: 18, color: '#64748b', fontWeight: 600 };
const card: React.CSSProperties = { background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 24, padding: 30, marginBottom: 28, backdropFilter: 'blur(16px)' };
const cardHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 };
const cardTitle: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0 };
const linkBtn: React.CSSProperties = { color: '#f97316', fontSize: 14, fontWeight: 600, textDecoration: 'none' };
const emptyState: React.CSSProperties = { color: '#64748b', textAlign: 'center', padding: '50px 0', fontSize: 14 };
const highlightLink: React.CSSProperties = { color: '#f97316', fontWeight: 600, textDecoration: 'none' };
const tableWrapper: React.CSSProperties = { overflowX: 'auto', borderRadius: 12 };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(148,163,184,0.1)' };
const tr: React.CSSProperties = { borderBottom: '1px solid rgba(148,163,184,0.06)', transition: 'background 0.2s', cursor: 'default' };
const td: React.CSSProperties = { padding: '14px 12px', fontSize: 14, color: '#e2e8f0' };
const loadingContainer: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07111f' };
const loadingText: React.CSSProperties = { color: '#94a3b8', fontSize: 18 };