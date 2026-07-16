"use client";

import { useEffect, useState } from "react";
import { readCoachingReminders } from "@/components/CoachingReminder";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [reminders, setReminders] = useState<ReturnType<typeof readCoachingReminders>>([]);
  useEffect(() => {
    const refresh = () => setReminders(readCoachingReminders().sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
    refresh(); window.addEventListener("alignedu-reminders-updated", refresh); return () => window.removeEventListener("alignedu-reminders-updated", refresh);
  }, []);
  return (
    <div style={wrap}>
      <button type="button" onClick={() => setOpen((value) => !value)} style={trigger} aria-expanded={open} aria-label={`Notifications, ${reminders.length} reminders`}>
        Follow-ups {reminders.length > 0 && <span style={count}>{reminders.length}</span>}
      </button>
      {open && <div style={panel}>
        <strong style={heading}>Coaching follow-ups</strong>
        {reminders.length ? reminders.slice(0, 6).map((item) => <div key={item.id} style={row}><div><strong style={name}>{item.teacherName}</strong><div style={meta}>{item.lessonTitle}</div></div><time style={date}>{new Date(`${item.dueDate}T12:00:00`).toLocaleDateString()}</time></div>) : <p style={empty}>No follow-ups scheduled.</p>}
      </div>}
    </div>
  );
}
const wrap: React.CSSProperties = { position: "relative" };
const trigger: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 13px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface-card-solid)", color: "var(--text-primary)", fontWeight: 700, cursor: "pointer" };
const count: React.CSSProperties = { display: "grid", placeItems: "center", minWidth: 20, height: 20, borderRadius: 999, background: "#f97316", color: "#fff", fontSize: 10 };
const panel: React.CSSProperties = { position: "absolute", zIndex: 30, right: 0, top: 48, width: 320, maxWidth: "calc(100vw - 40px)", padding: 16, border: "1px solid var(--border)", borderRadius: 16, background: "var(--surface-card-solid)", boxShadow: "var(--shadow-card)" };
const heading: React.CSSProperties = { color: "var(--text-primary)", fontSize: 14 };
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--border)" };
const name: React.CSSProperties = { color: "var(--text-primary)", fontSize: 12 };
const meta: React.CSSProperties = { color: "var(--text-secondary)", fontSize: 11, marginTop: 2 };
const date: React.CSSProperties = { color: "#ea580c", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" };
const empty: React.CSSProperties = { color: "var(--text-secondary)", fontSize: 12, marginBottom: 0 };
