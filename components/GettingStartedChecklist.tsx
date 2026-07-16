"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ChecklistItem = { label: string; detail: string; href: string; action: string };

export default function GettingStartedChecklist({ role }: { role: "teacher" | "admin" }) {
  const storageKey = `alignedu-onboarding-dismissed-${role}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(storageKey) !== "true");
  }, [storageKey]);

  if (!visible) return null;

  const items: ChecklistItem[] = role === "admin"
    ? [
        { label: "Build your team", detail: "Invite a teacher or administrator.", href: "/admin/invite", action: "Add user" },
        { label: "Observe instruction", detail: "Capture evidence from a classroom lesson.", href: "/admin/observe", action: "Observe" },
        { label: "Review priorities", detail: "Use your dashboard to plan coaching follow-up.", href: "/admin#performance", action: "Review" },
      ]
    : [
        { label: "Analyze a lesson", detail: "Upload notes, audio, or record directly.", href: "/analyze", action: "Analyze" },
        { label: "Review your growth", detail: "Explore scores, evidence, and next steps.", href: "/dashboard", action: "Review" },
        { label: "Improve future feedback", detail: "Rate reports and tell the AI what it missed.", href: "/dashboard", action: "Give feedback" },
      ];

  return (
    <section style={wrap} aria-label="Getting started checklist">
      <div style={header}>
        <div>
          <div style={eyebrow}>Getting Started</div>
          <h2 style={title}>{role === "admin" ? "Lead your first coaching cycle" : "Build your instructional growth record"}</h2>
        </div>
        <button
          type="button"
          style={dismiss}
          onClick={() => { window.localStorage.setItem(storageKey, "true"); setVisible(false); }}
          aria-label="Dismiss getting started checklist"
        >
          Dismiss
        </button>
      </div>
      <div style={grid}>
        {items.map((item, index) => (
          <div key={item.label} style={itemCard}>
            <span style={number}>{index + 1}</span>
            <div style={{ flex: 1 }}><strong style={itemTitle}>{item.label}</strong><p style={detail}>{item.detail}</p></div>
            <Link href={item.href} style={action}>{item.action}</Link>
          </div>
        ))}
      </div>
    </section>
  );
}

const wrap: React.CSSProperties = { padding: 20, marginBottom: 20, border: "1px solid rgba(249,115,22,0.22)", borderRadius: 22, background: "linear-gradient(135deg, var(--surface-card-solid), rgba(249,115,22,0.06))", boxShadow: "var(--shadow-soft)" };
const header: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 14 };
const eyebrow: React.CSSProperties = { color: "#ea580c", fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 5 };
const title: React.CSSProperties = { color: "var(--text-primary)", fontSize: 19, margin: 0 };
const dismiss: React.CSSProperties = { border: "none", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, textDecoration: "underline" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 };
const itemCard: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: 12, border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface-card-solid)" };
const number: React.CSSProperties = { display: "grid", placeItems: "center", width: 28, height: 28, flex: "0 0 28px", borderRadius: 9, background: "rgba(249,115,22,0.14)", color: "#ea580c", fontWeight: 800, fontSize: 12 };
const itemTitle: React.CSSProperties = { color: "var(--text-primary)", fontSize: 13 };
const detail: React.CSSProperties = { color: "var(--text-secondary)", fontSize: 11, lineHeight: 1.4, margin: "2px 0 0" };
const action: React.CSSProperties = { color: "#ea580c", fontSize: 11, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" };
