'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { sampleReports, getDashboardSummary, getTrendData, calculateLessonScore } from '@/lib/dashboardData';
import { createClient } from '@/lib/supabase/client';

export default function TeacherDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [dbReports, setDbReports] = useState<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from('analyses').select('*').order('created_at').eq('user_id', user.id);
      setDbReports(data || []);
      setReady(true);
    }
    loadData();
  }, []);

  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07111f' }}>
      <p style={{ color: '#94a3b8', fontSize: 18 }}>Loading...</p>
    </div>
  );

  const reports = dbReports.length > 0
    ? dbReports
    : sampleReports.filter(r => r.teacher === userId);

  const summary = getDashboardSummary(reports);
  const trendData = getTrendData(reports);

  return (
    <main style={page}>
      <div style={glow1} />
      <div style={glow2} />

      <div style={container}>

        {/* HEADER */}
        <div style={header}>
          <div>
            <div style={badge}>Teacher Dashboard</div>
            <h1 style={heading}>Your Instructional Dashboard</h1>
            <p style={subheading}>Track your lesson scores, trends, and instructional feedback.</p>
          </div>
          <Link href="/analyze" style={analyzeBtn}>+ Analyze Lesson</Link>
        </div>

        {/* STATS */}
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
            <div style={statValue}>
              {reports.filter((r: any) => {
                const d = new Date(r.created_at || Date.now());
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length}
            </div>
          </div>
        </div>

        {/* CHART */}
        <div style={card}>
          <div style={cardHeader}>
            <h2 style={cardTitle}>📈 Score Trend</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12, color: '#f8fafc' }} />
              <Line type="monotone" dataKey="score" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', r: 4 }} />
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
            <p style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>
              No lessons yet. <Link href="/analyze" style={{ color: '#f97316' }}>Analyze your first lesson →</Link>
            </p>
          ) : (
            <table style={table}>
              <thead>
                <tr>{['Title', 'Grade', 'Subject', 'Score'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {reports.slice(-10).reverse().map((r: any, i: number) => (
                  <tr key={i} style={tr}>
                    <td style={td}>{r.title || 'Untitled'}</td>
                    <td style={td}>{r.grade || '-'}</td>
                    <td style={td}>{r.subject || '-'}</td>
                    <td style={td}>{calculateLessonScore(r)}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </main>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', background: 'radial-gradient(circle at top left, rgba(59,130,246,0.10), transparent 30%), linear-gradient(180deg, #07111f 0%, #081120 100%)', padding: '40px 20px', fontFamily: 'Inter, Roboto, Arial, sans-serif', position: 'relative', overflow: 'hidden' };
const glow1: React.CSSProperties = { position: 'absolute', width: 400, height: 400, borderRadius: '999px', background: 'rgba(56,189,248,0.07)', filter: 'blur(80px)', top: '5%', left: '5%', pointerEvents: 'none' };
const glow2: React.CSSProperties = { position: 'absolute', width: 350, height: 350, borderRadius: '999px', background: 'rgba(249,115,22,0.07)', filter: 'blur(80px)', bottom: '10%', right: '5%', pointerEvents: 'none' };
const container: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 };
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 };
const badge: React.CSSProperties = { display: 'inline-flex', padding: '6px 12px', borderRadius: 999, background: 'rgba(56,189,248,0.12)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.18)', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 };
const heading: React.CSSProperties = { fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: '#f8fafc', margin: '0 0 8px', letterSpacing: '-0.02em' };
const subheading: React.CSSProperties = { fontSize: 15, color: '#94a3b8', margin: 0, lineHeight: 1.7 };
const analyzeBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', padding: '12px 24px', borderRadius: 14, fontWeight: 700, fontSize: 15, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(249,115,22,0.25)' };
const statsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 };
const statCard: React.CSSProperties = { background: 'rgba(15,23,42,0.86)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 20, padding: '24px 28px', backdropFilter: 'blur(14px)' };
const statLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 };
const statValue: React.CSSProperties = { fontSize: 36, fontWeight: 800, color: '#f8fafc', lineHeight: 1 };
const statUnit: React.CSSProperties = { fontSize: 18, color: '#64748b', fontWeight: 600 };
const card: React.CSSProperties = { background: 'rgba(15,23,42,0.86)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 20, padding: 28, marginBottom: 24, backdropFilter: 'blur(14px)' };
const cardHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 };
const cardTitle: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0 };
const linkBtn: React.CSSProperties = { color: '#f97316', fontSize: 14, fontWeight: 600, textDecoration: 'none' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(148,163,184,0.1)' };
const tr: React.CSSProperties = { borderBottom: '1px solid rgba(148,163,184,0.06)' };
const td: React.CSSProperties = { padding: '14px 12px', fontSize: 14, color: '#e2e8f0' };