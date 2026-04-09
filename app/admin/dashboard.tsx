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

      // ✅ FIX: prevent infinite loading
      if (!user) {
        setReady(true);
        return;
      }

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
      {/* ✅ MOVED TEST LINE HERE */}
      <h1 style={{ color: 'red' }}>ADMIN LIVE VERSION</h1>

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