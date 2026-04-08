"use client";

import { useState } from "react";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("teacher");
  const [message, setMessage] = useState("");

  const handleInvite = async () => {
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        role,
        adminId: "4e013ecb-2530-47b2-acc9-7a2973c3371b"
      }),
    });

    const data = await res.json();

    if (data.error) {
      setMessage("Error: " + data.error);
    } else {
      setMessage("Invite sent!");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Admin Invite Panel</h1>

      <input
        type="email"
        placeholder="Enter email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="teacher">Teacher</option>
        <option value="admin">Admin</option>
      </select>

      <button onClick={handleInvite}>Send Invite</button>

      <p>{message}</p>
    </div>
  );
}
