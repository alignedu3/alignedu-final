"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { completeCoachingReminder, readCoachingReminders, type CoachingReminderItem } from "@/components/CoachingReminder";

const SAMPLE_COMPLETED_KEY = "alignedu-sample-follow-up-completed-v1";

export default function NotificationCenter({ triggerStyle, sampleMode = false, ownerId }: { triggerStyle?: React.CSSProperties; sampleMode?: boolean; ownerId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [reminders, setReminders] = useState<ReturnType<typeof readCoachingReminders>>([]);
  const [sampleCompleted, setSampleCompleted] = useState(() =>
    typeof window !== "undefined" && window.localStorage.getItem(SAMPLE_COMPLETED_KEY) === "true"
  );
  const [sampleDueDate] = useState(() => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);
    return dueDate.toISOString().slice(0, 10);
  });
  const sampleReminder: CoachingReminderItem = {
    id: "sample-report-41",
    teacherId: "sample-teacher-1",
    teacherName: "Ms. Carter",
    lessonTitle: "Scientific Investigation and Evidence",
    dueDate: sampleDueDate,
    note: "Review whether students independently justify claims with evidence during the closing check.",
    createdAt: new Date().toISOString(),
  };
  const visibleReminders = sampleMode && !sampleCompleted ? [sampleReminder, ...reminders] : reminders;
  useEffect(() => {
    const refresh = () => setReminders(
      readCoachingReminders()
        .filter((item) => !item.completedAt && Boolean(item.ownerId) && item.ownerId === ownerId)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    );
    refresh(); window.addEventListener("alignedu-reminders-updated", refresh); return () => window.removeEventListener("alignedu-reminders-updated", refresh);
  }, [ownerId]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  const markComplete = (item: CoachingReminderItem) => {
    if (sampleMode && item.id === sampleReminder.id) {
      window.localStorage.setItem(SAMPLE_COMPLETED_KEY, "true");
      setSampleCompleted(true);
      return;
    }
    completeCoachingReminder(item.id, item.ownerId);
  };
  return (
    <div style={wrap}>
      <button type="button" onClick={() => setOpen((value) => !value)} style={{ ...trigger, ...triggerStyle }} aria-expanded={open} aria-haspopup="dialog" aria-label={`Follow-ups, ${visibleReminders.length} reminders`}>
        Follow-ups {visibleReminders.length > 0 && <span style={count}>{visibleReminders.length}</span>}
      </button>
      {open && (
        <div style={overlay} onMouseDown={() => setOpen(false)} role="presentation">
          <div style={panel} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="follow-up-heading">
            <div style={panelHeader}>
              <div><div style={eyebrow}>Instructional Coaching</div><h2 id="follow-up-heading" style={heading}>Coaching follow-ups</h2></div>
              <button type="button" style={closeButton} onClick={() => setOpen(false)} aria-label="Close follow-ups">×</button>
            </div>
            <div style={list}>
              {visibleReminders.length ? visibleReminders.slice(0, 8).map((item) => (
                <div key={`${item.ownerId || 'sample'}-${item.id}`} style={row}>
                  <div style={reminderMain}>
                    <div>
                      <strong style={name}>{item.teacherName}</strong>
                      {item.id.startsWith("sample-report-") ? <span style={sampleBadge}>Sample</span> : null}
                      <div style={meta}>{item.lessonTitle}</div>
                      <time style={date}>{new Date(`${item.dueDate}T12:00:00`).toLocaleDateString()}</time>
                      {item.note ? <div style={reminderNote}>{item.note}</div> : null}
                    </div>
                    <div style={rowActions}>
                      {item.teacherId ? (
                        <Link href={`/admin/teacher/${item.teacherId}/lesson/${item.id}`} onClick={() => setOpen(false)} style={openButton}>Open Lesson</Link>
                      ) : null}
                      <button type="button" style={completeButton} onClick={() => markComplete(item)}>Mark Complete</button>
                    </div>
                  </div>
                </div>
              )) : <p style={empty}>No active follow-ups. Open a teacher lesson report to schedule one.</p>}
            </div>
            <button type="button" onClick={() => setOpen(false)} style={doneButton}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
const wrap: React.CSSProperties = { position: "relative", width: "100%" };
const trigger: React.CSSProperties = { width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 13px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface-card-solid)", color: "var(--text-primary)", fontWeight: 700, cursor: "pointer" };
const count: React.CSSProperties = { display: "grid", placeItems: "center", minWidth: 20, height: 20, borderRadius: 999, background: "#f97316", color: "#fff", fontSize: 10 };
const overlay: React.CSSProperties = { position: "fixed", zIndex: 1000, inset: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "clamp(72px, 12vh, 120px) 16px 24px", background: "rgba(15,23,42,0.48)", backdropFilter: "blur(4px)" };
const panel: React.CSSProperties = { width: 440, maxWidth: "100%", maxHeight: "calc(100vh - 110px)", overflow: "hidden", display: "flex", flexDirection: "column", padding: 20, border: "1px solid var(--border)", borderRadius: 20, background: "var(--surface-card-solid)", boxShadow: "0 28px 90px rgba(2,6,23,0.35)" };
const panelHeader: React.CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, paddingBottom: 12, borderBottom: "1px solid var(--border)" };
const eyebrow: React.CSSProperties = { color: "#ea580c", fontSize: 10, fontWeight: 800, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 4 };
const heading: React.CSSProperties = { color: "var(--text-primary)", fontSize: 19, margin: 0 };
const closeButton: React.CSSProperties = { display: "grid", placeItems: "center", flex: "0 0 36px", width: 36, height: 36, border: "1px solid var(--border)", borderRadius: 11, background: "var(--surface-chip)", color: "var(--text-primary)", cursor: "pointer", fontSize: 24, lineHeight: 1 };
const list: React.CSSProperties = { overflowY: "auto", paddingRight: 3 };
const row: React.CSSProperties = { padding: "13px 0", borderBottom: "1px solid var(--border)" };
const reminderMain: React.CSSProperties = { display: "grid", gap: 10 };
const name: React.CSSProperties = { color: "var(--text-primary)", fontSize: 12 };
const sampleBadge: React.CSSProperties = { display: "inline-flex", marginLeft: 7, padding: "2px 6px", borderRadius: 999, border: "1px solid rgba(249,115,22,0.24)", background: "rgba(249,115,22,0.08)", color: "#ea580c", fontSize: 9, fontWeight: 800, letterSpacing: 0.45, textTransform: "uppercase", verticalAlign: "middle" };
const meta: React.CSSProperties = { color: "var(--text-secondary)", fontSize: 11, marginTop: 2 };
const date: React.CSSProperties = { display: "block", color: "#ea580c", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", marginTop: 5 };
const reminderNote: React.CSSProperties = { marginTop: 8, padding: "9px 10px", borderLeft: "2px solid rgba(249,115,22,0.55)", borderRadius: "0 9px 9px 0", background: "var(--surface-chip)", color: "var(--text-secondary)", fontSize: 11, lineHeight: 1.5, overflowWrap: "anywhere" };
const rowActions: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const openButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 34, padding: "7px 11px", borderRadius: 10, border: "1px solid rgba(249,115,22,0.28)", background: "rgba(249,115,22,0.09)", color: "#ea580c", textDecoration: "none", fontSize: 11, fontWeight: 800 };
const completeButton: React.CSSProperties = { minHeight: 34, padding: "7px 11px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-chip)", color: "var(--text-primary)", cursor: "pointer", fontSize: 11, fontWeight: 800 };
const empty: React.CSSProperties = { color: "var(--text-secondary)", fontSize: 12, marginBottom: 0 };
const doneButton: React.CSSProperties = { marginTop: 14, width: "100%", padding: "11px 14px", border: 0, borderRadius: 12, background: "#f97316", color: "#fff", fontWeight: 800, cursor: "pointer" };
