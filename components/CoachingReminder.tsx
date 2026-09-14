"use client";

import { useEffect, useState } from "react";

export type CoachingReminderItem = {
  id: string;
  ownerId?: string;
  teacherId?: string;
  teacherName: string;
  lessonTitle: string;
  dueDate: string;
  note?: string;
  createdAt: string;
  completedAt?: string;
};
const KEY = "alignedu-coaching-reminders-v1";

export function readCoachingReminders(): CoachingReminderItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) || "[]") as CoachingReminderItem[]; } catch { return []; }
}

function writeCoachingReminders(reminders: CoachingReminderItem[]) {
  window.localStorage.setItem(KEY, JSON.stringify(reminders));
  window.dispatchEvent(new Event("alignedu-reminders-updated"));
}

export function completeCoachingReminder(id: string, ownerId?: string) {
  writeCoachingReminders(
    readCoachingReminders().map((item) =>
      item.id === id && (!ownerId || item.ownerId === ownerId) ? { ...item, completedAt: new Date().toISOString() } : item
    )
  );
}

export default function CoachingReminder({ lessonId, ownerId, teacherId, teacherName, lessonTitle }: { lessonId: string; ownerId: string; teacherId: string; teacherName: string; lessonTitle: string }) {
  const [dueDate, setDueDate] = useState(() => {
    const existing = readCoachingReminders().find((item) => item.id === lessonId && (!item.ownerId || item.ownerId === ownerId) && !item.completedAt);
    return existing?.dueDate || "";
  });
  const [saved, setSaved] = useState(() =>
    readCoachingReminders().some((item) => item.id === lessonId && (!item.ownerId || item.ownerId === ownerId) && !item.completedAt)
  );
  const [note, setNote] = useState(() => {
    const existing = readCoachingReminders().find((item) => item.id === lessonId && (!item.ownerId || item.ownerId === ownerId) && !item.completedAt);
    return existing?.note || "";
  });

  useEffect(() => {
    const existing = readCoachingReminders().find((item) => item.id === lessonId && (!item.ownerId || item.ownerId === ownerId));
    if (existing && !existing.completedAt) {
      if (!existing.teacherId || !existing.ownerId) {
        writeCoachingReminders(
          readCoachingReminders().map((item) => item.id === lessonId && (!item.ownerId || item.ownerId === ownerId) ? { ...item, teacherId, ownerId: item.ownerId || ownerId } : item)
        );
      }
    }
  }, [lessonId, ownerId, teacherId]);

  const save = () => {
    if (!dueDate) return;
    const next = readCoachingReminders().filter((item) => !(item.id === lessonId && item.ownerId === ownerId));
    next.push({ id: lessonId, ownerId, teacherId, teacherName, lessonTitle, dueDate, note: note.trim() || undefined, createdAt: new Date().toISOString() });
    writeCoachingReminders(next);
    setSaved(true);
  };

  return (
    <div style={wrap} className="coaching-reminder-card">
      <div><strong style={title}>Coaching follow-up</strong><p style={text}>Schedule when you want to revisit this instructional action.</p></div>
      <div style={controls} className="coaching-reminder-controls">
        <label style={noteField} className="coaching-reminder-note-field">
          <span style={fieldLabel}>Follow-up note <span style={optionalLabel}>Optional</span></span>
          <textarea
            value={note}
            onChange={(event) => { setNote(event.target.value.slice(0, 280)); setSaved(false); }}
            placeholder="What should you review or look for?"
            style={noteInput}
            className="coaching-reminder-note-input"
            rows={2}
          />
        </label>
        <label style={dateField} className="coaching-reminder-date-field">
          <span style={fieldLabel}>Follow-up date</span>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => { setDueDate(event.target.value); setSaved(false); }}
            onClick={(event) => event.currentTarget.showPicker?.()}
            style={input}
            className="coaching-reminder-date-input"
            aria-label="Coaching follow-up date"
          />
        </label>
        <button
          type="button"
          onClick={save}
          disabled={!dueDate}
          className="coaching-reminder-save-button"
          style={{ ...button, opacity: dueDate ? 1 : 0.56, cursor: dueDate ? "pointer" : "not-allowed" }}
        >
          {saved ? "Saved" : "Set reminder"}
        </button>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = { display: "grid", gap: 18, width: "100%", maxWidth: "100%", minWidth: 0, padding: 18, border: "1px solid var(--border)", borderRadius: 16, background: "var(--surface-chip)", boxSizing: "border-box" };
const title: React.CSSProperties = { color: "var(--text-primary)", fontSize: 14 };
const text: React.CSSProperties = { color: "var(--text-secondary)", fontSize: 12, margin: "3px 0 0" };
const controls: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(210px, 260px) auto", alignItems: "end", justifyContent: "start", width: "100%", maxWidth: "100%", minWidth: 0, columnGap: 12, rowGap: 16 };
const noteField: React.CSSProperties = { display: "grid", gridColumn: "1 / -1", gap: 7, width: "100%", minWidth: 0 };
const dateField: React.CSSProperties = { display: "grid", gap: 7, minWidth: 0 };
const fieldLabel: React.CSSProperties = { color: "var(--text-secondary)", fontSize: 10, fontWeight: 800, letterSpacing: 0.55, textTransform: "uppercase" };
const optionalLabel: React.CSSProperties = { marginLeft: 5, color: "var(--text-muted)", fontWeight: 650, letterSpacing: 0, textTransform: "none" };
const noteInput: React.CSSProperties = { width: "100%", minHeight: 66, padding: "10px 11px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--surface-input)", color: "var(--text-primary)", font: "inherit", fontSize: 12, lineHeight: 1.5, resize: "vertical", boxSizing: "border-box" };
const input: React.CSSProperties = { width: "100%", minHeight: 46, padding: "10px 12px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--surface-input)", color: "var(--text-primary)", font: "inherit", fontSize: 14, cursor: "pointer", colorScheme: "light dark", boxSizing: "border-box" };
const button: React.CSSProperties = { minHeight: 46, padding: "10px 18px", borderRadius: 11, border: 0, background: "#f97316", color: "#fff", fontWeight: 800, whiteSpace: "nowrap", boxShadow: "0 8px 18px rgba(249,115,22,0.18)", transition: "opacity 160ms ease, transform 160ms ease" };
