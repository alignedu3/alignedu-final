"use client";

import { useEffect, useState } from "react";
import { readCoachingReminders } from "@/components/CoachingReminder";

export default function NotificationCenter({ triggerStyle }: { triggerStyle?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const [reminders, setReminders] = useState<ReturnType<typeof readCoachingReminders>>([]);
  useEffect(() => {
    const refresh = () => setReminders(readCoachingReminders().sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
    refresh(); window.addEventListener("alignedu-reminders-updated", refresh); return () => window.removeEventListener("alignedu-reminders-updated", refresh);
  }, []);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  return (
    <div style={wrap}>
      <button type="button" onClick={() => setOpen((value) => !value)} style={{ ...trigger, ...triggerStyle }} aria-expanded={open} aria-haspopup="dialog" aria-label={`Follow-ups, ${reminders.length} reminders`}>
        Follow-ups {reminders.length > 0 && <span style={count}>{reminders.length}</span>}
      </button>
      {open && (
        <div style={overlay} onMouseDown={() => setOpen(false)} role="presentation">
          <div style={panel} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="follow-up-heading">
            <div style={panelHeader}>
              <div><div style={eyebrow}>Instructional Coaching</div><h2 id="follow-up-heading" style={heading}>Coaching follow-ups</h2></div>
              <button type="button" style={closeButton} onClick={() => setOpen(false)} aria-label="Close follow-ups">×</button>
            </div>
            <div style={list}>
              {reminders.length ? reminders.slice(0, 8).map((item) => <div key={item.id} style={row}><div><strong style={name}>{item.teacherName}</strong><div style={meta}>{item.lessonTitle}</div></div><time style={date}>{new Date(`${item.dueDate}T12:00:00`).toLocaleDateString()}</time></div>) : <p style={empty}>No follow-ups scheduled. Open a teacher lesson report to add one.</p>}
            </div>
            <button type="button" onClick={() => setOpen(false)} style={doneButton}>Done</button>
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
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--border)" };
const name: React.CSSProperties = { color: "var(--text-primary)", fontSize: 12 };
const meta: React.CSSProperties = { color: "var(--text-secondary)", fontSize: 11, marginTop: 2 };
const date: React.CSSProperties = { color: "#ea580c", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" };
const empty: React.CSSProperties = { color: "var(--text-secondary)", fontSize: 12, marginBottom: 0 };
const doneButton: React.CSSProperties = { marginTop: 14, width: "100%", padding: "11px 14px", border: 0, borderRadius: 12, background: "#f97316", color: "#fff", fontWeight: 800, cursor: "pointer" };
