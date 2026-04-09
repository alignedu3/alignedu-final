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
  const [profiles, setProfiles] = useState<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase.from('profiles').select('id, name');
      setProfiles(profileData || []);

      const { data } = await supabase.from('analyses').select('*').order('created_at');
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

  const reports = dbReports.length > 0 ? dbReports : sampleReports;
  const summary = getDashboardSummary(reports);
  const trendData = getTrendData(reports);

  const teacherStats = useMemo(() => {
    const map: Record<string, any[]> = {};
    reports.forEach((r: any) => {
      const key = r.user_id;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return Object.entries(map).map(([id, reps]) => {
      const profile = profiles.find(p => p.id === id);
      const avgScore = reps.reduce((acc, r) => acc + calculateLessonScore(r), 0) / reps.length;
      return {
        name: profile?.name || 'Unknown Teacher',
        avgScore: Math.round(avgScore),
        count: reps.length,
        needsAttention: avgScore < 75,
      };
    });
  }, [reports, profiles]);

  return (
    <main style={page}>
      <div style={glow1} />
      <div style={glow2} />

      <div style={container}>

        {/* HEADER */}
        <div style={header}>
          <div>
            <div style={badge}>Admin Control Center</div>
            <h1 style={heading}>🛠 System Dashboard</h1>
            <p style={subheading}>System-wide instructional insights across all teachers.</p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/analyze" style={analyzeBtn}>+ Analyze Lesson</Link>
            <Link href="/admin/invite" style={secondaryBtn}>Invite Users</Link>
          </div>
        </div>

        {/* STATS */}
        <div style={statsGrid}>
          <div style={statCard}>
            <div style={statLabel}>System Avg Score</div>
            <div style={statValue}>{summary.averageScore}<span style={statUnit}>/100</span></div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Total Lessons</div>
            <div style={statValue}>{reports.length}</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Active Teachers</div>
            <div style={statValue}>{teacherStats.length}</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Needing Support</div>
            <div style={statValue}>{teacherStats.filter(t => t.needsAttention).length}</div>
          </div>
        </div>

        {/* TEACHER TABLE */}
        <div style={card}>
          <div style={cardHeader}>
            <h2 style={cardTitle}>👩‍🏫 Teacher Performance</h2>
          </div>
          <table style={table}>
            <thead>
              <tr>{['Teacher', 'Avg Score', 'Lessons', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {teacherStats.map((t) => (
                <tr key={t.name} style={tr}>
                  <td style={td}>{t.name}</td>
                  <td style={td}>{t.avgScore}/100</td>
                  <td style={td}>{t.count}</td>
                  <td style={td}>
                    <span style={t.needsAttention ? badgeRed : badgeGreen}>
                      {t.needsAttention ? '⚠️ Needs Support' : '✅ Strong'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CHART */}
        <div style={card}>
          <div style={cardHeader}>
            <h2 style={cardTitle}>📈 System Score Trend</h2>
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

        {/* ALL LESSONS */}
        <div style={card}>
          <div style={cardHeader}>
            <h2 style={cardTitle}>📋 All Lessons</h2>
          </div>
          <table style={table}>
            <thead>
              <tr>{['Title', 'Grade', 'Subject', 'Score'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {reports.slice(-15).reverse().map((r: any, i: number) => (
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

      </div>
    </main>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', background: 'radial-gradient(circle at top left, rgba(59,130,246,0.10), transparent 30%), linear-gradient(180deg, #07111f 0%, #081120 100%)', padding: '40px 20px', fontFamily: 'Inter, Roboto, Arial, sans-serif', position: 'relative', overflow: 'hidden' };
const glow1: React.CSSProperties = { position: 'absolute', width: 400, height: 400, borderRadius: '999px', background: 'rgba(56,189,248,0.07)', filter: 'blur(80px)', top: '5%', left: '5%', pointerEvents: 'none' };
const glow2: React.CSSProperties = { position: 'absolute', width: 350, height: 350, borderRadius: '999px', background: 'rgba(249,115,22,0.07)', filter: 'blur(80px)', bottom: '10%', right: '5%', pointerEvents: 'none' };
const container: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 };
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 };
const badge: React.CSSProperties = { display: 'inline-flex', padding: '6px 12px', borderRadius: 999, background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.18)', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 };
const heading: React.CSSProperties = { fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: '#f8fafc', margin: '0 0 8px', letterSpacing: '-0.02em' };
const subheading: React.CSSProperties = { fontSize: 15, color: '#94a3b8', margin: 0, lineHeight: 1.7 };
const analyzeBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', padding: '12px 24px', borderRadius: 14, fontWeight: 700, fontSize: 15, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(249,115,22,0.25)' };
const secondaryBtn: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', color: '#f8fafc', padding: '12px 24px', borderRadius: 14, fontWeight: 700, fontSize: 15, textDecoration: 'none', border: '1px solid rgba(148,163,184,0.16)' };
const statsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 };
const statCard: React.CSSProperties = { background: 'rgba(15,23,42,0.86)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 20, padding: '24px 28px', backdropFilter: 'blur(14px)' };
const statLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 };
const statValue: React.CSSProperties = { fontSize: 36, fontWeight: 800, color: '#f8fafc', lineHeight: 1 };
const statUnit: React.CSSProperties = { fontSize: 18, color: '#64748b', fontWeight: 600 };
const card: React.CSSProperties = { background: 'rgba(15,23,42,0.86)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 20, padding: 28, marginBottom: 24, backdropFilter: 'blur(14px)' };
const cardHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 };
const cardTitle: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0 };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(148,163,184,0.1)' };
const tr: React.CSSProperties = { borderBottom: '1px solid rgba(148,163,184,0.06)' };
const td: React.CSSProperties = { padding: '14px 12px', fontSize: 14, color: '#e2e8f0' };
const badgeGreen: React.CSSProperties = { background: 'rgba(34,197,94,0.12)', color: '#22c55e', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 };
const badgeRed: React.CSSProperties = { background: 'rgba(239,68,68,0.12)', color: '#ef4444', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 };