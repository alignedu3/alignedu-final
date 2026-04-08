'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
const [isDarkMode, setIsDarkMode] = useState(false);
const router = useRouter();

useEffect(() => {
const savedMode = localStorage.getItem('theme');
const prefersDark =
typeof window !== 'undefined' &&
window.matchMedia('(prefers-color-scheme: dark)').matches;

```
const resolvedDarkMode = savedMode === 'dark' || (savedMode === null && prefersDark);

setIsDarkMode(resolvedDarkMode);
document.documentElement.setAttribute('data-theme', resolvedDarkMode ? 'dark' : 'light');
```

}, []);

const toggleTheme = () => {
const newMode = isDarkMode ? 'light' : 'dark';
setIsDarkMode(!isDarkMode);
localStorage.setItem('theme', newMode);
document.documentElement.setAttribute('data-theme', newMode);
};

const handleBookDemo = () => {
window.location.href =
'mailto:support@alignedu.net?subject=AlignEDU Demo Request&body=I would like to schedule a demo.';
};

const theme = {
pageBg: isDarkMode ? '#081120' : '#f8fafc',
text: isDarkMode ? '#f8fafc' : '#0f172a',
mutedText: isDarkMode ? '#94a3b8' : '#475569',
cardBg: isDarkMode ? 'rgba(15, 23, 42, 0.82)' : '#ffffff',
cardBorder: isDarkMode ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.08)',
sectionSoft: isDarkMode ? '#0f172a' : '#ffffff',
sectionAlt: isDarkMode ? '#0b1526' : '#eef4ff',
heroText: '#ffffff',
heroSubtext: 'rgba(255,255,255,0.82)',
heroBg:
'radial-gradient(circle at top left, rgba(59,130,246,0.45), transparent 30%), radial-gradient(circle at top right, rgba(16,185,129,0.28), transparent 28%), linear-gradient(135deg, #06101f 0%, #0b1730 45%, #0e7490 100%)',
};

const features = [
{
title: 'AI-Powered Lesson Analysis',
desc: 'Turn a recorded lesson into structured insight in minutes, without manual observation notes.',
},
{
title: 'Curriculum Alignment Visibility',
desc: 'See which standards and concepts were covered, where coverage was weak, and what may have been missed.',
},
{
title: 'Actionable Instructional Feedback',
desc: 'Give teachers and leaders immediate next steps they can actually use to improve instruction.',
},
];

const outcomes = [
'Coverage insights by lesson',
'Missed concepts flagged instantly',
'Clear instructional feedback',
'District-ready reporting potential',
];

const process = [
{
step: '01',
title: 'Upload a lesson',
desc: 'Record a live lesson or upload existing classroom instruction to begin analysis.',
},
{
step: '02',
title: 'Run AI analysis',
desc: 'AlignEDU reviews the lesson for coverage, clarity, and instructional effectiveness.',
},
{
step: '03',
title: 'Review results',
desc: 'Get immediate feedback, insight summaries, and improvement opportunities in one place.',
},
];

const audiences = [
{
title: 'Teachers',
desc: 'Reflect on lesson delivery, identify gaps, and improve classroom instruction with faster feedback.',
},
{
title: 'Administrators',
desc: 'Support coaching and evaluation with more consistent, objective, and scalable insight.',
},
{
title: 'Districts',
desc: 'Monitor curriculum alignment across campuses without adding more manual workload.',
},
];

return (
<main
style={{
fontFamily: 'Inter, Roboto, Arial, sans-serif',
background: theme.pageBg,
color: theme.text,
minHeight: '100vh',
}}
>
<section
style={{
position: 'relative',
overflow: 'hidden',
background: theme.heroBg,
color: theme.heroText,
padding: '110px 20px 90px',
}}
> <div style={container}>
<div
style={{
maxWidth: '1180px',
margin: '0 auto',
display: 'grid',
gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
gap: '40px',
alignItems: 'center',
}}
> <div> <div style={eyebrowDark}>AI for instructional visibility</div>

```
          <h1
            style={{
              fontSize: 'clamp(2.6rem, 5vw, 4.5rem)',
              lineHeight: '1.05',
              margin: '0 0 22px',
              fontWeight: 750,
              letterSpacing: '-0.03em',
              maxWidth: '780px',
            }}
          >
            AI That Shows Exactly What Was Taught—and What Was Missed
          </h1>

          <p
            style={{
              fontSize: '18px',
              lineHeight: '1.8',
              maxWidth: '760px',
              margin: '0 0 28px',
              color: theme.heroSubtext,
            }}
          >
            Upload a lecture and instantly see curriculum alignment, instructional gaps,
            and actionable feedback for teachers, administrators, and districts.
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/analyze')} style={primaryBtn}>
              Try It Now
            </button>

            <button onClick={handleBookDemo} style={secondaryBtnDark}>
              Book Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
```

);
}

const primaryBtn: React.CSSProperties = {
background: 'linear-gradient(135deg, #f97316, #ea580c)',
color: '#ffffff',
padding: '0 24px',
borderRadius: '14px',
border: 'none',
fontWeight: 700,
fontSize: '15px',
height: '52px',
minWidth: '160px',
cursor: 'pointer',
display: 'inline-flex',
alignItems: 'center',
justifyContent: 'center',
lineHeight: '1',
whiteSpace: 'nowrap',
boxShadow: '0 14px 30px rgba(249, 115, 22, 0.28)',
};

const secondaryBtnDark: React.CSSProperties = {
background: 'rgba(255,255,255,0.08)',
color: '#ffffff',
padding: '0 24px',
borderRadius: '14px',
border: '1px solid rgba(255,255,255,0.18)',
fontWeight: 700,
fontSize: '15px',
height: '52px',
minWidth: '160px',
cursor: 'pointer',
display: 'inline-flex',
alignItems: 'center',
justifyContent: 'center',
lineHeight: '1',
whiteSpace: 'nowrap',
backdropFilter: 'blur(8px)',
};

const container: React.CSSProperties = {
width: '100%',
maxWidth: '1200px',
margin: '0 auto',
};
