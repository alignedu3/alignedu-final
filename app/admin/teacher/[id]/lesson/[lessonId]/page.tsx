"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

  if (loading) return <div style={{ color: '#fff', padding: 32 }}>Loading...</div>;
  if (!lesson) return <div style={{ color: '#fff', padding: 32 }}>Lesson not found.</div>;

  // Calculate summary and findings similar to teacher dashboard
  const score = lesson.coverage_score || 0;
  const clarity = lesson.clarity_rating || '—';
  const engagement = lesson.engagement_level || '—';
  const gaps = lesson.gaps_detected || 0;
  const keyFindings = gaps > 0
    ? [
        'Some supporting concepts need stronger reinforcement.',
        'Lesson closure could be improved for retention.',
        'Standards were introduced but not fully mastered.'
      ]
    : [
        'Standards are clearly introduced and modeled.',
        'Lesson pacing is effective.',
        'Students are likely meeting expectations.'
      ];
  const nextAction =
    gaps > 0
      ? 'Revisit missed concepts and strengthen lesson closure with a quick exit check.'
      : 'Maintain strong instruction and consider adding deeper checks for understanding.';

  return (
    <main style={{ maxWidth: 700, margin: '40px auto', background: '#0f172a', borderRadius: 18, padding: 32, color: '#fff' }}>
      <h1 style={{ color: '#f97316', fontSize: 24, marginBottom: 8 }}>Lesson Report</h1>
      <div style={{ color: '#94a3b8', marginBottom: 18 }}>
        <strong>Teacher:</strong> {teacher?.name || 'Unknown'}<br />
        <strong>Date:</strong> {lesson.created_at ? new Date(lesson.created_at).toLocaleString() : '—'}
      </div>
      <div style={{ marginBottom: 18 }}>
        <strong>Grade:</strong> {lesson.grade || '—'}<br />
        <strong>Subject:</strong> {lesson.subject || '—'}
      </div>
      <div style={{ background: '#111827', borderRadius: 12, padding: 18, marginBottom: 18 }}>
        <h2 style={{ color: '#fff', marginBottom: 8 }}>Summary</h2>
        <div style={{ color: '#f97316', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Score: {score}/100</div>
        <div style={{ color: '#94a3b8', marginBottom: 4 }}>Clarity: {clarity} &nbsp;|&nbsp; Engagement: {engagement} &nbsp;|&nbsp; Gaps: {gaps}</div>
      </div>
      <div style={{ background: '#111827', borderRadius: 12, padding: 18, marginBottom: 18 }}>
        <h2 style={{ color: '#fff', marginBottom: 8 }}>Key Findings</h2>
        <ul style={{ color: '#94a3b8', margin: 0, paddingLeft: 18 }}>
          {keyFindings.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </div>
      <div style={{ background: '#111827', borderRadius: 12, padding: 18, marginBottom: 18 }}>
        <h2 style={{ color: '#fff', marginBottom: 8 }}>Next Best Action</h2>
        <div style={{ color: '#94a3b8' }}>{nextAction}</div>
      </div>
      <div style={{ background: '#111827', borderRadius: 12, padding: 18, marginBottom: 18 }}>
        <h2 style={{ color: '#fff', marginBottom: 8 }}>AI Analysis</h2>
        <div style={{ color: '#e5e7eb', fontSize: 15 }}>{lesson.result || '—'}</div>
      </div>
      <div style={{ background: '#111827', borderRadius: 12, padding: 18, marginBottom: 0 }}>
        <h2 style={{ color: '#fff', marginBottom: 8 }}>Transcript</h2>
        <div style={{ color: '#e5e7eb', fontSize: 15 }}>{lesson.transcript || '—'}</div>
      </div>
    </main>
  );
}
