// app/analyze/Login/page.tsx
"use client";  // Ensure this is at the very top

import React, { useState } from 'react';

const LoginPage = () => {
  const [email, setEmail] = useState('');

  return (
    <div>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        placeholder="Enter your email" 
      />
      <button>Login</button>
    </div>
  );
};

export default LoginPage;
