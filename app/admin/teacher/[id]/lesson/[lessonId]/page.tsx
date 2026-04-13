"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getLessonInsights } from "@/lib/dashboardData";

export default function LessonReportPage() {
  const params = useParams<{ id: string; lessonId: string }>();
  const teacherId = params?.id;
  const lessonId = params?.lessonId;

  const [lesson, setLesson] = useState<any>(null);
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: lessonData } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", lessonId)
        .maybeSingle();
      setLesson(lessonData);

      if (lessonData?.user_id) {
        const { data: teacherData } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", lessonData.user_id)
          .maybeSingle();
        setTeacher(teacherData);
      }
      setLoading(false);
    }
    if (lessonId) load();
  }, [lessonId]);

  if (loading) return <div style={loadingState}>Loading lesson report...</div>;
  if (!lesson) return <div style={loadingState}>Lesson not found.</div>;

  const insights = getLessonInsights(lesson);
  const lessonDate = lesson.created_at ? new Date(lesson.created_at).toLocaleString() : '—';
  const titleText = lesson.title || `${lesson.grade || 'Grade'} ${lesson.subject || 'Lesson'}`;

  return (
    <main style={page}>
      <div style={container}>
        <div style={heroCard}>
          <div style={heroTop}>
            <div>
              <div style={eyebrow}>Admin Lesson Report</div>
              <h1 style={heading}>{titleText}</h1>
              <p style={subheading}>{teacher?.name || 'Unknown'} · {lessonDate}</p>
            </div>
            <Link href={`/admin/teacher/${teacherId}`} style={backLink}>Back to Teacher</Link>
          </div>

          <div style={summaryBanner}>
            <div style={summaryScore}>{insights.score}/100</div>
            <div>
              <div style={summaryTitle}>Executive Summary</div>
              <div style={summaryText}>{insights.summary}</div>
            </div>
          </div>
        </div>

        <div style={metricGrid}>
          <div style={metricCard}>
            <div style={metricLabel}>Coverage</div>
            <div style={metricValue}>{insights.coverage}%</div>
          </div>
          <div style={metricCard}>
            <div style={metricLabel}>Clarity</div>
            <div style={metricValue}>{insights.clarity}%</div>
          </div>
          <div style={metricCard}>
            <div style={metricLabel}>Engagement</div>
            <div style={metricValue}>{insights.engagement}%</div>
          </div>
          <div style={metricCard}>
            <div style={metricLabel}>Gaps</div>
            <div style={metricValue}>{insights.gaps}</div>
          </div>
        </div>

        <div style={sectionCard}>
          <h2 style={sectionTitle}>Lesson Context</h2>
          <div style={contextGrid}>
            <div style={contextBox}>
              <div style={metricLabel}>Grade</div>
              <div style={contextValue}>{lesson.grade || '—'}</div>
            </div>
            <div style={contextBox}>
              <div style={metricLabel}>Subject</div>
              <div style={contextValue}>{lesson.subject || '—'}</div>
            </div>
            <div style={contextBox}>
              <div style={metricLabel}>Title</div>
              <div style={contextValue}>{lesson.title || '—'}</div>
            </div>
          </div>
        </div>

        <div style={sectionCard}>
          <h2 style={sectionTitle}>Key Findings</h2>
          <ul style={findingsList}>
            {insights.findings.map((finding, index) => (
              <li key={index} style={findingItem}>{finding}</li>
            ))}
          </ul>
        </div>

        <div style={sectionCard}>
          <h2 style={sectionTitle}>Next Best Action</h2>
          <p style={bodyText}>{insights.nextAction}</p>
        </div>

        <div style={sectionCard}>
          <h2 style={sectionTitle}>AI Analysis</h2>
          <div style={longformText}>{lesson.result || lesson.analysis_result || 'No saved analysis text available.'}</div>
        </div>

        <div style={sectionCard}>
          <h2 style={sectionTitle}>Transcript</h2>
          <div style={longformText}>{lesson.transcript || 'No transcript available.'}</div>
        </div>
      </div>
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: '#081120',
};

const container: React.CSSProperties = {
  maxWidth: 980,
  margin: '0 auto',
};

const heroCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(17,24,39,0.98) 0%, rgba(15,23,42,0.98) 100%)',
  border: '1px solid rgba(148,163,184,0.16)',
  borderRadius: 18,
  padding: 28,
  marginBottom: 22,
};

const heroTop: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap',
};

const eyebrow: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.7,
  fontWeight: 700,
};

const heading: React.CSSProperties = {
  color: '#fff',
  fontSize: 30,
  margin: '8px 0 6px 0',
};

const subheading: React.CSSProperties = {
  color: '#94a3b8',
  margin: 0,
};

const backLink: React.CSSProperties = {
  color: '#f97316',
  textDecoration: 'none',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const summaryBanner: React.CSSProperties = {
  marginTop: 18,
  display: 'grid',
  gridTemplateColumns: '120px 1fr',
  gap: 16,
  alignItems: 'center',
  padding: 18,
  borderRadius: 14,
  background: 'rgba(15,23,42,0.55)',
  border: '1px solid rgba(148,163,184,0.14)',
};

const summaryScore: React.CSSProperties = {
  color: '#f97316',
  fontSize: 34,
  fontWeight: 800,
};

const summaryTitle: React.CSSProperties = {
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 6,
};

const summaryText: React.CSSProperties = {
  color: '#d1d5db',
  lineHeight: 1.6,
};

const metricGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 14,
  marginBottom: 22,
};

const metricCard: React.CSSProperties = {
  background: '#111827',
  border: '1px solid rgba(148,163,184,0.14)',
  borderRadius: 14,
  padding: 18,
};

const metricLabel: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  fontWeight: 700,
};

const metricValue: React.CSSProperties = {
  color: '#fff',
  fontSize: 26,
  marginTop: 8,
  fontWeight: 700,
};

const sectionCard: React.CSSProperties = {
  background: '#111827',
  border: '1px solid rgba(148,163,184,0.14)',
  borderRadius: 14,
  padding: 22,
  marginBottom: 18,
};

const sectionTitle: React.CSSProperties = {
  color: '#fff',
  margin: '0 0 12px 0',
};

const contextGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
};

const contextBox: React.CSSProperties = {
  border: '1px solid rgba(148,163,184,0.14)',
  borderRadius: 12,
  padding: 14,
  background: 'rgba(15,23,42,0.48)',
};

const contextValue: React.CSSProperties = {
  color: '#fff',
  fontSize: 15,
  marginTop: 6,
  fontWeight: 600,
};

const findingsList: React.CSSProperties = {
  color: '#d1d5db',
  margin: 0,
  paddingLeft: 18,
};

const findingItem: React.CSSProperties = {
  marginBottom: 10,
  lineHeight: 1.65,
};

const bodyText: React.CSSProperties = {
  color: '#d1d5db',
  lineHeight: 1.7,
  margin: 0,
};

const longformText: React.CSSProperties = {
  color: '#e5e7eb',
  fontSize: 15,
  lineHeight: 1.75,
  whiteSpace: 'pre-wrap',
};

const loadingState: React.CSSProperties = {
  color: '#fff',
  padding: 32,
};
