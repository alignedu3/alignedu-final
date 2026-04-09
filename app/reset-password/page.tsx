'use client';

import { useState } from "react";
import { createClient } from '@supabase/supabase-js';

// ✅ Initialize Supabase client properly
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleUpdate = async () => {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage("Error updating password");
    } else {
      setMessage("Password updated! Redirecting...");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Set Your Password</h1>

      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleUpdate}>Set Password</button>

      <p>{message}</p>
    </div>
  );
}
