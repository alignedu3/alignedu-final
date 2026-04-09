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
      if (!user) {
        setReady(true);
        return;
      }

      const { data: profileData } = await supabase.from('profiles').select('id, name');
      setProfiles(profileData || []);

      const { data } = await supabase.from('analyses').select('*').order('created_at', { ascending: false });
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
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 30%), linear-gradient(180deg, #07111f 0%, #081120 100%)',
      padding: '40px 24px',
      fontFamily: 'Inter, Roboto, Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* The rest of your component remains unchanged */}
      {/* ... copy your header, cards, tables, charts here ... */}
    </main>
  );
}
