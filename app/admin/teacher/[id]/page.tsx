'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client'; // Fixed import path
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';

import { calculateLessonScore } from '@/lib/dashboardData';

export default function TeacherDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [reports, setReports] = useState<any[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Fetch teacher profile based on the ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', id as string) // ✅ FIX
        .maybeSingle();

      setName(profile?.name || 'Teacher');

      // Fetch analyses data for the teacher based on the ID
      const { data: analyses } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', id as string) // ✅ FIX
        .order('created_at', { ascending: false });

      setReports(analyses || []);
    }

    if (id) load();
  }, [id]);

  const summary = useMemo(() => {
    if (!reports.length) {
      return { avg: 0, trend: 0, risk: 'Unknown' };
    }

    const scores = reports.map(r => calculateLessonScore(r));

    const avg =
      scores.reduce((a, b) => a + b, 0) / scores.length;

    const trend =
      scores.length > 1
        ? scores[0] - scores[scores.length - 1]
        : 0;

    const risk =
      avg < 70 ? 'High Risk'
      : avg < 80 ? 'Medium Risk'
      : 'Strong';

    return { avg: Math.round(avg), trend: Math.round(trend), risk };
  }, [reports]);

  const chartData = useMemo(() => {
    return reports
      .slice()
      .reverse()
      .map((r, i) => ({
        index: i + 1,
        score: calculateLessonScore(r),
        date: new Date(r.created_at).toLocaleDateString()
      }));
  }, [reports]);

  /* ================================
     AI COACHING ENGINE (NEW)
  ================================= */
  const aiInsight = useMemo(() => {
    if (!reports.length) {
      return {
        strengths: ["No data yet"],
        weaknesses: ["No data yet"],
        recommendation: "No recommendation available",
        summary: "Not enough data to evaluate performance.",
        avg: 0,
        trend: 0
      };
    }

    const scores = reports.map(r => calculateLessonScore(r));

    const avg =
      scores.reduce((a, b) => a + b, 0) / scores.length;

    const trend =
      scores.length > 2
        ? (scores.slice(-3).reduce((a, b) => a + b, 0) / 3) -
          (scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3)
        : 0;

    let strengths: string[] = [];
    let weaknesses: string[] = [];
    let recommendation = "";
    let summary = "";

    if (avg >= 85) {
      strengths.push("Strong instructional delivery");
      strengths.push("Clear lesson execution");
    } else if (avg >= 75) {
      strengths.push("Consistent instructional practice");
    } else {
      strengths.push("Basic instructional structure present");
    }

    if (avg < 75) {
      weaknesses.push("Weak lesson closure");
      weaknesses.push("Inconsistent concept reinforcement");
    }

    if (trend < 0) {
      weaknesses.push("Declining performance trend");
    }

    if (trend > 5) {
      strengths.push("Strong improvement trend");
    }

    if (avg < 70) {
      recommendation =
        "Immediate coaching required: focus on clarity, pacing, and student comprehension checks.";
      summary = "High-risk instructional profile.";
    } else if (avg < 80) {
      recommendation =
        "Targeted coaching recommended: strengthen closure and reinforcement strategies.";
      summary = "Moderate support needed.";
    } else {
      recommendation =
        "Maintain performance and introduce higher-order questioning strategies.";
      summary = "Strong instructional performance.";
    }

    return {
      strengths,
      weaknesses,
      recommendation,
      summary,
      avg: Math.round(avg),
      trend: Math.round(trend)
    };
  }, [reports]);

  return (
    <main style={page} className="dashboard-page">
      <div style={container} className="dashboard-container">

        {/* HEADER */}
        <div style={header}>
          <h1 style={heading}>{name}</h1>
          <p style={subheading}>{reports.length} lessons analyzed</p>
        </div>

        {/* STATS */}
        <div style={grid}>
          <div style={card}>
            <div style={label}>Average Score</div>
            <div style={big}>{summary.avg}/100</div>
          </div>

          <div style={card}>
            <div style={label}>Trend</div>
            <div style={big}>
              {summary.trend > 0 ? `↓ ${summary.trend}` : `↑ +${Math.abs(summary.trend)}`}
            </div>
          </div>

          <div style={card}>
            <div style={label}>Risk Level</div>
            <div
              style={{
                ...big,
                color:
                  summary.risk === 'Strong'
                    ? '#22c55e'
                    : summary.risk === 'Medium Risk'
                    ? '#f59e0b'
                    : '#ef4444'
              }}
            >
              {summary.risk}
            </div>
          </div>
        </div>

        {/* AI INSIGHT */}
        <div style={cardFull}>
          <h2 style={title}>AI Coaching Insight</h2>

          <p style={text}>{aiInsight.summary}</p>

          <div style={{ marginTop: 12 }}>
            <strong style={{ color: '#fff' }}>Strengths:</strong>
            <ul>
              {aiInsight.strengths.map((s, i) => (
                <li key={i} style={text}>{s}</li>
              ))}
            </ul>

            <strong style={{ color: '#fff' }}>Weaknesses:</strong>
            <ul>
              {aiInsight.weaknesses.map((w, i) => (
                <li key={i} style={text}>{w}</li>
              ))}
            </ul>

            <strong style={{ color: '#fff' }}>Recommendation:</strong>
            <p style={text}>{aiInsight.recommendation}</p>
          </div>
        </div>

        {/* CHART */}
        <div style={cardFull}>
          <h2 style={title}>Performance Trend</h2>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="index" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#f97316" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* LESSON LIST */}
        <div style={cardFull}>
          <h2 style={title}>Lesson History</h2>

          {reports.map((r, i) => {
            const grade = r.grade || 'Grade';
            const subject = r.subject || 'Subject';
            const date = new Date(r.created_at).toLocaleDateString();
            return (
              <a
                key={i}
                href={`/admin/teacher/${id}/lesson/${r.id}`}
                style={{ ...item, textDecoration: 'none', display: 'block', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 'bold', color: '#fff', fontSize: 16 }}>
                  {grade} &mdash; {subject} &mdash; {date}
                </div>
                <div style={{ color: '#94a3b8', fontWeight: 'normal', marginTop: 2 }}>
                  Score: {calculateLessonScore(r)}
                </div>
              </a>
            );
          })}
        </div>

      </div>
    </main>
  );
}

/* ===== STYLES ===== */

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: '#081120',
};

const container: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto'
};

const header: React.CSSProperties = {
  marginBottom: 24
};

const heading: React.CSSProperties = {
  color: '#fff',
  fontSize: 28
};

const subheading: React.CSSProperties = {
  color: '#94a3b8'
};

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 16,
  marginBottom: 24
};

const card: React.CSSProperties = {
  background: '#111827',
  padding: 18,
  borderRadius: 12
};

const cardFull: React.CSSProperties = {
  background: '#111827',
  padding: 20,
  borderRadius: 12,
  marginBottom: 20
};

const label: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 13
};

const big: React.CSSProperties = {
  color: '#fff',
  fontSize: 24,
  marginTop: 6
};

const title: React.CSSProperties = {
  color: '#fff',
  marginBottom: 10
};

const text: React.CSSProperties = {
  color: '#94a3b8'
};

const muted: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12
};

const item: React.CSSProperties = {
  padding: 10,
  borderBottom: '1px solid #1f2937',
  color: '#fff'
};