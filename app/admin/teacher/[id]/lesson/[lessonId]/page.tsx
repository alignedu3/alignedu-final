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

  return (
    <main style={{ maxWidth: 700, margin: '40px auto', background: '#0f172a', borderRadius: 18, padding: 32, color: '#fff' }}>
      <h1 style={{ color: '#f97316', fontSize: 24, marginBottom: 8 }}>Lesson Report</h1>
      <div style={{ color: '#94a3b8', marginBottom: 18 }}>
        Teacher: {teacher?.name || 'Unknown'}<br />
        Date: {lesson.created_at ? new Date(lesson.created_at).toLocaleString() : '—'}
      </div>
      <div style={{ marginBottom: 18 }}>
        <strong>Grade:</strong> {lesson.grade || '—'}<br />
        <strong>Subject:</strong> {lesson.subject || '—'}
      </div>
      <div style={{ marginBottom: 18 }}>
        <strong>Instructional Score:</strong> {lesson.coverage_score || '—'}<br />
        <strong>Coverage:</strong> {lesson.coverage_score || '—'}<br />
        <strong>Clarity:</strong> {lesson.clarity_rating || '—'}<br />
        <strong>Engagement:</strong> {lesson.engagement_level || '—'}<br />
        <strong>Gaps Flagged:</strong> {lesson.gaps_detected || '—'}
      </div>
      <div style={{ marginBottom: 18 }}>
        <strong>Transcript:</strong>
        <div style={{ background: '#111827', borderRadius: 8, padding: 12, marginTop: 6, color: '#e5e7eb', fontSize: 15 }}>{lesson.transcript || '—'}</div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <strong>AI Analysis:</strong>
        <div style={{ background: '#111827', borderRadius: 8, padding: 12, marginTop: 6, color: '#e5e7eb', fontSize: 15 }}>{lesson.result || '—'}</div>
      </div>
    </main>
  );
}
