'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { sampleReports, getDashboardSummary, getTrendData, calculateLessonScore } from '@/lib/dashboardData';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [dbReports, setDbReports] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('No user found. Redirecting...');
          setReady(true);
          return;
        }

        const { data: profileData, error: profileError } = await supabase.from('profiles').select('id, name');
        if (profileError) throw profileError;
        
        setProfiles(profileData || []);

        const { data, error: reportError } = await supabase.from('analyses').select('*').order('created_at', { ascending: false });
        if (reportError) throw reportError;

        setDbReports(data || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setReady(true);
      }
    }

    loadData();
  }, []);

  const teacherStats = useMemo(() => {
    const map: Record<string, any[]> = {};
    dbReports.forEach((r: any) => {
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
  }, [dbReports, profiles]);

  if (!ready) {
    return (
      <div style={loadingContainer}>
        <p style={loadingText}>Loading...</p>
      </div>
    );
  }

  const reports = dbReports.length > 0 ? dbReports : sampleReports;
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
            <h1 style={heading}>Admin Dashboard</h1> {/* Updated heading */}
            <p style={subheading}>System-wide instructional insights across all teachers.</p>
          </div>
          <div style={actionButtons}>
            <Link href="/analyze" style={primaryBtn}>+ Analyze Lesson</Link>
            <Link href="/admin/invite" style={secondaryBtn}>Invite Users</Link>
          </div>
        </div>

        {/* SUMMARY CARDS */}
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

        {/* TEACHER PERFORMANCE */}
        <div style={{ ...card, marginTop: '40px' }}> {/* Added marginTop to create space */}
          <div style={cardHeader}>
            <h2 style={cardTitle}>👩‍🏫 Teacher Performance</h2>
          </div>
          <div style={tableWrapper}>
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
        </div>

        {/* SYSTEM TREND CHART */}
        <div style={card}>
          <div style={cardHeader}>
            <h2 style={cardTitle}>📈 System Score Trend</h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 13 }} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 13 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12, color: '#f8fafc', padding: 10 }} />
              <Line type="monotone" dataKey="score" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ALL LESSONS */}
        <div style={card}>
          <div style={cardHeader}>
            <h2 style={cardTitle}>📋 All Lessons</h2>
          </div>
          <div style={tableWrapper}>
            <table style={table}>
              <thead>
                <tr>{['Title', 'Grade', 'Subject', 'Score'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {reports.slice(0, 15).map((r: any, i: number) => (
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

const header: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, marginBottom: 32
};

const heading: React.CSSProperties = { fontSize: 40, fontWeight: 700, color: '#fff' };

const subheading: React.CSSProperties = { fontSize: 18, color: '#94a3b8' };

const primaryBtn: React.CSSProperties = {
  backgroundColor: '#f97316', color: '#fff', padding: '10px 24px', borderRadius: 8, fontSize: 16,
  textDecoration: 'none', display: 'inline-block', cursor: 'pointer'
};

const secondaryBtn: React.CSSProperties = {
  backgroundColor: '#1f2937', color: '#fff', padding: '10px 24px', borderRadius: 8, fontSize: 16,
  textDecoration: 'none', display: 'inline-block', cursor: 'pointer'
};

const actionButtons: React.CSSProperties = {
  display: 'flex', gap: 14, flexWrap: 'wrap'
};

const statsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 };

const statCard: React.CSSProperties = {
  background: '#1f2937', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
};

const statLabel: React.CSSProperties = { fontSize: 14, color: '#94a3b8' };

const statValue: React.CSSProperties = { fontSize: 24, color: '#fff', fontWeight: 700 };

const statUnit: React.CSSProperties = { fontSize: 18, color: '#94a3b8' };

const card: React.CSSProperties = { background: '#1f2937', borderRadius: 12, padding: 24, marginBottom: 32 };

const cardHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: 16 };

const cardTitle: React.CSSProperties = { fontSize: 22, color: '#fff' };

const tableWrapper: React.CSSProperties = { overflowX: 'auto', marginTop: 16 };

const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };

const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 14, color: '#94a3b8' };

const tr: React.CSSProperties = { borderBottom: '1px solid #e2e8f0' };

const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#fff' };

const badgeRed: React.CSSProperties = { color: '#ef4444' };

const badgeGreen: React.CSSProperties = { color: '#22c55e' };

const loadingContainer: React.CSSProperties = {
  display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a'
};

const loadingText: React.CSSProperties = { fontSize: 24, color: '#fff' };