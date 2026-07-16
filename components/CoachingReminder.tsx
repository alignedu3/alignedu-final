"use client";

import { useEffect, useState } from "react";

type Reminder = { id: string; teacherName: string; lessonTitle: string; dueDate: string; createdAt: string };
const KEY = "alignedu-coaching-reminders-v1";

export function readCoachingReminders(): Reminder[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) || "[]") as Reminder[]; } catch { return []; }
}

export default function CoachingReminder({ lessonId, teacherName, lessonTitle }: { lessonId: string; teacherName: string; lessonTitle: string }) {
  const [dueDate, setDueDate] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = readCoachingReminders().find((item) => item.id === lessonId);
    if (existing) { setDueDate(existing.dueDate); setSaved(true); }
  }, [lessonId]);

  const save = () => {
    if (!dueDate) return;
    const next = readCoachingReminders().filter((item) => item.id !== lessonId);
    next.push({ id: lessonId, teacherName, lessonTitle, dueDate, createdAt: new Date().toISOString() });
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("alignedu-reminders-updated"));
    setSaved(true);
  };

  return (
    <div style={wrap}>
      <div><strong style={title}>Coaching follow-up</strong><p style={text}>Schedule when you want to revisit this instructional action.</p></div>
      <div style={controls}>
        <input type="date" value={dueDate} onChange={(event) => { setDueDate(event.target.value); setSaved(false); }} style={input} aria-label="Coaching follow-up date" />
        <button type="button" onClick={save} disabled={!dueDate} style={button}>{saved ? "Saved" : "Set reminder"}</button>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", padding: 16, border: "1px solid var(--border)", borderRadius: 16, background: "var(--surface-chip)" };
const title: React.CSSProperties = { color: "var(--text-primary)", fontSize: 14 };
const text: React.CSSProperties = { color: "var(--text-secondary)", fontSize: 12, margin: "3px 0 0" };
const controls: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };
const input: React.CSSProperties = { padding: "9px 11px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-input)", color: "var(--text-primary)" };
const button: React.CSSProperties = { padding: "9px 12px", borderRadius: 10, border: 0, background: "#f97316", color: "#fff", fontWeight: 800, cursor: "pointer" };
