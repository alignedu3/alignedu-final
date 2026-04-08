'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  sampleReports,
  getDashboardSummary,
  getTrendData,
  calculateLessonScore,
} from '@/lib/dashboardData';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [dbReports, setDbReports] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Get role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role || 'teacher';
      setRole(userRole);

      // Get ALL profiles (for names)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name');

      setProfiles(profileData || []);

      // Get lesson data
      let query = supabase.from('analyses').select('*').order('created_at');

      if (userRole !== 'admin') {
        query = query.eq('user_id', user.id);
      }

      const { data } = await query;
      setDbReports(data || []);
    }

    loadData();
  }, []);

  if (!role) return <p>Loading...</p>;

  const reports =
    dbReports.length > 0
      ? dbReports
      : role === 'admin'
      ? sampleReports
      : sampleReports.filter(r => r.teacherId === userId);

  const summary = getDashboardSummary(reports);
  const trendData = getTrendData(reports);

  // 🔥 ADMIN TEACHER GROUPING (REAL NAMES)
  const teacherStats = useMemo(() => {
    const map: Record<string, any[]> = {};

    reports.forEach((r: any) => {
      const key = r.user_id;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });

    return Object.entries(map).map(([id, reps]) => {
      const profile = profiles.find(p => p.id === id);

      const avgScore =
        reps.reduce((acc, r) => acc + calculateLessonScore(r), 0) / reps.length;

      return {
        name: profile?.name || "Unknown Teacher",
        avgScore: Math.round(avgScore),
        count: reps.length,
        needsAttention: avgScore < 75,
      };
    });
  }, [reports, profiles]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32 }}>

      {/* 🔥 ADMIN PANEL */}
      {role === 'admin' && (
        <>
          <div style={{ background: '#111827', color: '#fff', padding: 20, borderRadius: 16 }}>
            <h1>🛠 Admin Control Center</h1>
            <p>System-wide instructional insights</p>

            <div style={{ display: 'flex', gap: 12 }}>
              <Link href="/dashboard">Teaching View</Link>
              <Link href="/admin">Invite Users</Link>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <h2>👩‍🏫 Teacher Performance</h2>
            <table style={{ width: '100%', marginTop: 10 }}>
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Avg Score</th>
                  <th>Lessons</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {teacherStats.map((t) => (
                  <tr key={t.name}>
                    <td>{t.name}</td>
                    <td>{t.avgScore}</td>
                    <td>{t.count}</td>
                    <td>{t.needsAttention ? '⚠️ Needs Support' : '✅ Strong'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 🔥 DASHBOARD */}
      <div style={{ marginTop: 20, padding: 20, background: '#0f172a', color: '#fff', borderRadius: 16 }}>
        <h1>{summary.averageScore}/100</h1>
        <Link href="/analyze">Analyze Lesson</Link>
      </div>

      {/* 🔥 CHART */}
      <div style={{ marginTop: 20, background: '#fff', padding: 20 }}>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="score" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}