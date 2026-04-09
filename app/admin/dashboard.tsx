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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();

        // 🔥 DO NOT BLOCK UI IF USER FAILS
        if (!user) {
          console.warn('No user found');
        }

        const { data: profileData, error: profileError } =
          await supabase.from('profiles').select('id, name');

        if (profileError) throw profileError;

        setProfiles(profileData || []);

        const { data, error: reportError } =
          await supabase.from('analyses').select('*').order('created_at', { ascending: false });

        if (reportError) throw reportError;

        setDbReports(data || []);
      } catch (err: any) {
        console.error('ADMIN DASHBOARD ERROR:', err);
        setError(err.message || 'Something went wrong');
      } finally {
        setReady(true);
      }
    }

    loadData();
  }, []);

  if (!ready) {
    return (
      <div style={loadingContainer}>
        <p style={loadingText}>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={loadingContainer}>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  const reports = dbReports.length > 0 ? dbReports : sampleReports;
  const summary = getDashboardSummary(reports);
  const trendData = getTrendData(reports);

  const teacherStats = useMemo(() => {
    const map: Record<string, any[]> = {};

    reports.forEach((r: any) => {
      const key = r.user_id || 'unknown';
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });

    return Object.entries(map).map(([id, reps]) => {
      const profile = profiles.find(p => p.id === id);

      const avgScore =
        reps.reduce((acc, r) => acc + calculateLessonScore(r), 0) / reps.length;

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
      <div style={container}>

        <h1 style={{ color: '#fff', marginBottom: 20 }}>
          Admin Dashboard
        </h1>

        <p style={{ color: '#94a3b8', marginBottom: 20 }}>
          System-wide insights
        </p>

        <div style={statsGrid}>
          <div style={statCard}>
            <p style={statLabel}>Avg Score</p>
            <h2 style={statValue}>{summary.averageScore}/100</h2>
          </div>

          <div style={statCard}>
            <p style={statLabel}>Lessons</p>
            <h2 style={statValue}>{reports.length}</h2>
          </div>

          <div style={statCard}>
            <p style={statLabel}>Teachers</p>
            <h2 style={statValue}>{teacherStats.length}</h2>
          </div>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Score Trend</h2>

          <ResponsiveContainer width="100%" height={250}>
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

/* STYLES */

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: '#081120',
  padding: '40px',
};

const container: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto',
};

const statsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 16,
  marginBottom: 30,
};

const statCard: React.CSSProperties = {
  background: '#0f172a',
  padding: 20,
  borderRadius: 12,
};

const statLabel: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 12,
};

const statValue: React.CSSProperties = {
  color: '#fff',
  fontSize: 24,
};

const card: React.CSSProperties = {
  background: '#0f172a',
  padding: 20,
  borderRadius: 12,
};

const cardTitle: React.CSSProperties = {
  color: '#fff',
  marginBottom: 10,
};

const loadingContainer: React.CSSProperties = {
  height: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const loadingText: React.CSSProperties = {
  color: '#94a3b8',
};