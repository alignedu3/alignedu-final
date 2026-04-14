'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AnalysisReport, ProfileRecord } from '@/lib/dashboardData';

export default function DistrictDashboard() {
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('role', 'teacher');

      setProfiles(profileData || []);

      const teacherIds = (profileData || []).map(p => p.id);

      const { data: analysisData } = await supabase
        .from('analyses')
        .select('*')
        .in('user_id', teacherIds)
        .order('created_at', { ascending: false });

      setReports(analysisData || []);
    }

    load();
  }, []);

  const teacherStats = useMemo(() => {
    const map: Record<string, AnalysisReport[]> = {};

    reports.forEach((r) => {
      const userId = r.user_id;
      if (!userId) return;
      if (!map[userId]) map[userId] = [];
      map[userId].push(r);
    });

    return Object.entries(map).map(([id, reps]) => {
      const scores = reps.map(r => {
        const v = r.score;
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0; }
        return 0;
      });

      const avg =
        scores.reduce((a, b) => a + b, 0) / scores.length;

      const trend =
        scores.length > 2
          ? (scores.slice(-3).reduce((a, b) => a + b, 0) / 3) -
            (scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3)
          : 0;

      const profile = profiles.find(p => p.id === id);

      return {
        name: profile?.name || 'Unknown',
        avg: Math.round(avg),
        trend: Math.round(trend),
        count: reps.length,
        risk: avg < 70 ? 'High' : avg < 80 ? 'Medium' : 'Strong'
      };
    });
  }, [reports, profiles]);

  const sorted = useMemo(() => {
    return [...teacherStats].sort((a, b) => a.avg - b.avg);
  }, [teacherStats]);

  const atRisk = sorted.filter(t => t.risk === 'High');
  const strong = sorted.filter(t => t.risk === 'Strong');

  const systemAvg =
    teacherStats.length
      ? teacherStats.reduce((a, b) => a + b.avg, 0) / teacherStats.length
      : 0;

  const systemInsight =
    systemAvg < 70
      ? "District performance is below standard. Immediate intervention required."
      : systemAvg < 80
      ? "District is developing but inconsistent across classrooms."
      : "District performance is strong and stable.";

  return (
    <main style={page}>
      <div style={container}>

        <h1 style={heading}>District Intelligence Dashboard</h1>
        <p style={subheading}>System-wide instructional performance overview</p>

        {/* SYSTEM SCORE */}
        <div style={card}>
          <div style={big}>
            System Average: {Math.round(systemAvg)}/100
          </div>
          <p style={text}>{systemInsight}</p>
        </div>

        {/* AT RISK */}
        <div style={card}>
          <h2 style={title}>At-Risk Teachers</h2>
          {atRisk.length === 0 ? (
            <p style={text}>No high-risk teachers 🎉</p>
          ) : (
            atRisk.map((t, i) => (
              <div key={i} style={item}>
                {t.name} — {t.avg}/100
              </div>
            ))
          )}
        </div>

        {/* TOP PERFORMERS */}
        <div style={card}>
          <h2 style={title}>Top Performers</h2>
          {strong.map((t, i) => (
            <div key={i} style={item}>
              {t.name} — {t.avg}/100
            </div>
          ))}
        </div>

        {/* FULL RANKING */}
        <div style={card}>
          <h2 style={title}>Full Teacher Ranking</h2>

          {sorted.map((t, i) => (
            <div key={i} style={item}>
              #{i + 1} {t.name} — {t.avg}/100 ({t.trend > 0 ? `↑ ${t.trend}` : t.trend < 0 ? `↓ ${Math.abs(t.trend)}` : '→ 0'})
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}

/* ===== STYLES ===== */

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: '#081120',
  padding: 40
};

const container: React.CSSProperties = {
  maxWidth: 1000,
  margin: '0 auto'
};

const heading: React.CSSProperties = {
  color: '#fff',
  fontSize: 30,
  marginBottom: 6
};

const subheading: React.CSSProperties = {
  color: '#94a3b8',
  marginBottom: 20
};

const card: React.CSSProperties = {
  background: '#111827',
  padding: 20,
  borderRadius: 12,
  marginBottom: 20
};

const title: React.CSSProperties = {
  color: '#fff',
  marginBottom: 10
};

const text: React.CSSProperties = {
  color: '#94a3b8'
};

const big: React.CSSProperties = {
  color: '#fff',
  fontSize: 22,
  marginBottom: 10
};

const item: React.CSSProperties = {
  padding: 10,
  borderBottom: '1px solid #1f2937',
  color: '#fff'
};