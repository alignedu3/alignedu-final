'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  sampleReports,
  getDashboardSummary,
  getTrendData,
  calculateLessonScore
} from '@/lib/dashboardData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';

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
          setReady(true);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name');

        if (profileError) throw profileError;

        setProfiles(profileData ?? []);

        const { data, error: reportError } = await supabase
          .from('analyses')
          .select('*')
          .order('created_at', { ascending: false });

        if (reportError) throw reportError;

        setDbReports(data ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setReady(true);
      }
    }

    loadData();
  }, []);

  const teacherStats = useMemo(() => {
    const map: Record<string, any[]> = {};

    (dbReports ?? []).forEach((r: any) => {
      const key = r.user_id;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });

    return Object.entries(map).map(([id, reps]) => {
      const profile = profiles.find(p => p.id === id);

      const totalScore = reps.reduce(
        (acc, r) => acc + calculateLessonScore(r),
        0
      );

      const avgScore = reps.length ? totalScore / reps.length : 0;

      return {
        name: profile?.name || 'Unknown Teacher',
        avgScore: Math.round(avgScore),
        count: reps.length,
        needsAttention: avgScore < 75,
      };
    });
  }, [dbReports, profiles]);

  // =========================
  // ✅ ALL MISSING STYLES FIXED
  // =========================

  const page: React.CSSProperties = {
    minHeight: '100vh',
    background: '#0b1220',
    position: 'relative',
    overflow: 'hidden',
  };

  const container: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  };

  const glow1: React.CSSProperties = {
    position: 'absolute',
    top: '-120px',
    left: '-120px',
    width: '320px',
    height: '320px',
    background: 'transparent, transparent)',
    filter: 'blur(60px)',
  };

  const glow2: React.CSSProperties = {
    position: 'absolute',
    bottom: '-140px',
    right: '-140px',
    width: '360px',
    height: '360px',
    background: 'transparent, transparent)',
    filter: 'blur(80px)',
  };

  const loadingContainer: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0b1220',
  };

  const loadingText: React.CSSProperties = {
    color: '#f8fafc',
    fontSize: '16px',
  };

  const header: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  };

  const heading: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 700,
    color: '#f8fafc',
  };

  const subheading: React.CSSProperties = {
    color: '#94a3b8',
    marginTop: '4px',
  };

  const actionButtons: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
  };

  const primaryBtn: React.CSSProperties = {
    padding: '10px 14px',
    background: '#f97316',
    color: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 600,
  };

  const secondaryBtn: React.CSSProperties = {
    padding: '10px 14px',
    background: 'transparent',
    color: '#f8fafc',
    border: '1px solid rgba(148,163,184,0.3)',
    borderRadius: '8px',
    textDecoration: 'none',
  };

  const statsGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '30px',
  };

  const statCard: React.CSSProperties = {
    padding: '16px',
    background: 'rgba(15,23,42,0.8)',
    borderRadius: '12px',
    border: '1px solid rgba(148,163,184,0.1)',
  };

  const statLabel: React.CSSProperties = {
    color: '#94a3b8',
    fontSize: '13px',
  };

  const statValue: React.CSSProperties = {
    color: '#f8fafc',
    fontSize: '22px',
    fontWeight: 700,
  };

  const statUnit: React.CSSProperties = {
    fontSize: '14px',
    color: '#64748b',
  };

  const card: React.CSSProperties = {
    background: 'rgba(15,23,42,0.8)',
    borderRadius: '14px',
    padding: '20px',
    border: '1px solid rgba(148,163,184,0.1)',
    marginBottom: '20px',
  };

  const cardHeader: React.CSSProperties = {
    marginBottom: '12px',
  };

  const cardTitle: React.CSSProperties = {
    color: '#f8fafc',
    fontSize: '18px',
    fontWeight: 600,
  };

  const tableWrapper: React.CSSProperties = {
    overflowX: 'auto',
  };

  const table: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
  };

  const th: React.CSSProperties = {
    textAlign: 'left',
    color: '#94a3b8',
    padding: '10px',
    fontSize: '13px',
  };

  const td: React.CSSProperties = {
    padding: '10px',
    color: '#f8fafc',
    borderTop: '1px solid rgba(148,163,184,0.1)',
  };

  const tr: React.CSSProperties = {};

  const badgeRed: React.CSSProperties = {
    color: '#ef4444',
    fontWeight: 600,
  };

  const badgeGreen: React.CSSProperties = {
    color: '#22c55e',
    fontWeight: 600,
  };

  // =========================

  if (!ready) {
    return (
      <div style={loadingContainer}>
        <p style={loadingText}>Loading...</p>
      </div>
    );
  }

  const reports = dbReports.length ? dbReports : sampleReports;
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
            <h1 style={heading}>Admin Dashboard</h1>
            <p style={subheading}>
              System-wide instructional insights across all teachers.
            </p>
          </div>

          <div style={actionButtons}>
            <Link href="/analyze" style={primaryBtn}>+ Analyze Lesson</Link>
            <Link href="/admin/invite" style={secondaryBtn}>Invite Users</Link>
          </div>
        </div>

        {/* STATS */}
        <div style={statsGrid}>
          <div style={statCard}>
            <div style={statLabel}>System Avg Score</div>
            <div style={statValue}>
              {summary.averageScore}<span style={statUnit}>/100</span>
            </div>
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
            <div style={statValue}>
              {teacherStats.filter(t => t.needsAttention).length}
            </div>
          </div>
        </div>

        {/* TABLES & CHART */}
        <div style={card}>
          <div style={cardHeader}>
            <h2 style={cardTitle}>Teacher Performance</h2>
          </div>

          <div style={tableWrapper}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Teacher</th>
                  <th style={th}>Avg Score</th>
                  <th style={th}>Lessons</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {teacherStats.map((t, i) => (
                  <tr key={i}>
                    <td style={td}>{t.name}</td>
                    <td style={td}>{t.avgScore}/100</td>
                    <td style={td}>{t.count}</td>
                    <td style={td}>
                      <span style={t.needsAttention ? badgeRed : badgeGreen}>
                        {t.needsAttention ? 'Needs Support' : 'Strong'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={card}>
          <div style={cardHeader}>
            <h2 style={cardTitle}>System Trend</h2>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#f97316" />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>
    </main>
  );
}