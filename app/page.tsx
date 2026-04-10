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

    const resolvedDarkMode = savedMode === 'dark' || (savedMode === null && prefersDark);

    setIsDarkMode(resolvedDarkMode);
    document.documentElement.setAttribute('data-theme', resolvedDarkMode ? 'dark' : 'light');
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
        fontFamily:
          'Inter, Roboto, Arial, sans-serif',
        background: theme.pageBg,
        color: theme.text,
        minHeight: '100vh',
      }}
    >
      {/* HERO */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: theme.heroBg,
          color: theme.heroText,
          padding: '110px 20px 90px',
        }}
      >
        <div style={container}>
          <div
            style={{
              maxWidth: '1180px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '40px',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={eyebrowDark}>AI for instructional visibility</div>

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

              <div
                className="hero-cta-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  flexWrap: 'wrap',
                  marginBottom: '18px',
                }}
              >
                <button
                  onClick={() => router.push('/analyze')}
                  style={primaryBtn}
                  className="hero-cta hero-cta-unified"
                >
                  Try It Now
                </button>

                <button
                  onClick={handleBookDemo}
                  style={primaryBtn}
                  className="hero-cta hero-cta-unified"
                >
                  Book Demo
                </button>
              </div>

              <p
                style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.72)',
                  margin: 0,
                }}
              >
                Built to help schools verify instruction, strengthen coaching, and scale insight.
              </p>
            </div>

            <div>
              <div
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '24px',
                  padding: '20px',
                  backdropFilter: 'blur(14px)',
                  boxShadow: '0 30px 80px rgba(2, 6, 23, 0.35)',
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)',
                  }}
                >
                  <div
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <span>Analysis Preview</span>
                    <span style={{ color: '#93c5fd' }}>Lesson Summary</span>
                  </div>

                  <div style={{ padding: '22px' }}>
                    <div
                      style={{
                        marginBottom: '16px',
                        padding: '18px 20px',
                        borderRadius: '18px',
                        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                        border: '1px solid rgba(148, 163, 184, 0.18)',
                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.16)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '14px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              letterSpacing: '0.10em',
                              color: '#94a3b8',
                              textTransform: 'uppercase',
                              marginBottom: '8px',
                            }}
                          >
                            Instructional Score
                          </div>
                          <div
                            style={{
                              fontSize: '34px',
                              fontWeight: 800,
                              lineHeight: 1,
                              color: '#f8fafc',
                            }}
                          >
                            87/100
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderRadius: '999px',
                            background: 'rgba(34, 197, 94, 0.14)',
                            border: '1px solid rgba(34, 197, 94, 0.24)',
                            color: '#22c55e',
                            fontSize: '13px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ↑ +5 from last lesson
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: '12px',
                        marginBottom: '18px',
                      }}
                    >
                      <div style={dashboardStatCard}>
                        



<div style={statLabel}>Coverage</div>
                        <div style={statValue}>87%</div>
                      </div>
                      <div style={dashboardStatCard}>
                        <div style={statLabel}>Clarity</div>
                        <div style={statValue}>Strong</div>
                      </div>
                      <div style={dashboardStatCard}>
                        <div style={statLabel}>Gaps Flagged</div>
                        <div style={statValue}>3</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={miniSectionTitle}>Key findings</div>
                      <div style={miniListItem}>Standards covered were clearly introduced and modeled.</div>
                      <div style={miniListItem}>Two supporting concepts need stronger reinforcement.</div>
                      <div style={miniListItem}>Lesson pacing was effective, but closure was limited.</div>
                    </div>

                    <div>
                      <div style={miniSectionTitle}>Suggested next step</div>
                      <div style={miniActionCard}>
                        Revisit the missed concept in the next lesson and strengthen the closing check for understanding.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '44px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            {outcomes.map((item) => (
              <div key={item} style={heroMetricCard}>
                <span style={heroMetricDot} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST / POSITIONING */}
      <section
        style={{
          padding: '28px 20px',
          background: isDarkMode ? '#09111f' : '#ffffff',
          borderTop: `1px solid ${theme.cardBorder}`,
          borderBottom: `1px solid ${theme.cardBorder}`,
        }}
      >
        <div style={container}>
          <div
            style={{
              textAlign: 'center',
              maxWidth: '960px',
              margin: '0 auto',
              color: theme.mutedText,
              fontSize: '16px',
              lineHeight: '1.8',
            }}
          >
            The first AI platform designed to verify what is actually taught in the classroom and turn instruction into measurable, scalable insight.
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        style={{
          padding: '90px 20px',
          background: theme.sectionSoft,
        }}
      >
        <div style={container}>
          <div style={sectionHeader}>
            <div style={eyebrowLight}>Why AlignEDU</div>
            <h2 style={{ ...sectionTitle, color: theme.text }}>
              Built to make classroom insight faster, clearer, and more scalable
            </h2>
            <p style={{ ...sectionSubtitle, color: theme.mutedText }}>
              Replace vague impressions and delayed reviews with a system that turns instruction into usable data.
            </p>
          </div>

          <div style={cardGrid}>
            {features.map((feature) => (
              <div
                key={feature.title}
                style={{
                  ...glassCard,
                  background: theme.cardBg,
                  border: `1px solid ${theme.cardBorder}`,
                }}
              >
                <div style={featureIconWrap}>✦</div>
                <h3 style={{ fontSize: '22px', margin: '0 0 12px', color: theme.text }}>
                  {feature.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: theme.mutedText,
                    lineHeight: '1.8',
                    fontSize: '15px',
                  }}
                >
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section
        style={{
          padding: '90px 20px',
          background: theme.sectionAlt,
        }}
      >
        <div style={container}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '30px',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={eyebrowLight}>What you get</div>
              <h2 style={{ ...sectionTitle, color: theme.text, textAlign: 'left' }}>
                One upload can turn a classroom lesson into a clear improvement plan
              </h2>
              <p style={{ ...sectionSubtitle, color: theme.mutedText, textAlign: 'left', margin: 0 }}>
                AlignEDU is designed to give teachers and school leaders immediate visibility into what happened during instruction and what to do next.
              </p>
            </div>

            <div
              style={{
                ...glassCard,
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                padding: '28px',
              }}
            >
              {[
                'Percent of standards or concepts visibly covered',
                'Potential instructional gaps and missed content',
                'Clear feedback on lesson delivery and pacing',
                'A more consistent, scalable review process for schools',
              ].map((item) => (
                <div key={item} style={benefitRow}>
                  <span style={checkPill}>✓</span>
                  <span style={{ color: theme.text, lineHeight: '1.7' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section
        style={{
          padding: '90px 20px',
          background: theme.sectionSoft,
        }}
      >
        <div style={container}>
          <div style={sectionHeader}>
            <div style={eyebrowLight}>Why it matters</div>
            <h2 style={{ ...sectionTitle, color: theme.text }}>
              Move from inconsistent observation to measurable instructional visibility
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '22px',
            }}
          >
            <div
              style={{
                ...glassCard,
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
              }}
            >
              <h3 style={{ marginTop: 0, fontSize: '22px', color: theme.text }}>Without AlignEDU</h3>
              <ul style={listStyle(theme.mutedText)}>
                <li>Manual classroom observations</li>
                <li>Delayed or inconsistent feedback</li>
                <li>Limited visibility into what was actually taught</li>
                <li>Harder to scale across schools or districts</li>
              </ul>
            </div>

            <div
              style={{
                ...glassCard,
                background:
                  'linear-gradient(135deg, rgba(37,99,235,0.14), rgba(16,185,129,0.12))',
                border: `1px solid ${theme.cardBorder}`,
              }}
            >
              <h3 style={{ marginTop: 0, fontSize: '22px', color: theme.text }}>With AlignEDU</h3>
              <ul style={listStyle(theme.text)}>
                <li>Immediate AI-supported analysis</li>
                <li>Clear, objective instructional insight</li>
                <li>Faster coaching and better follow-up</li>
                <li>District-ready scalability without extra admin burden</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        style={{
          padding: '90px 20px',
          background: theme.sectionAlt,
        }}
      >
        <div style={container}>
          <div style={sectionHeader}>
            <div style={eyebrowLight}>How it works</div>
            <h2 style={{ ...sectionTitle, color: theme.text }}>
              A simple workflow built for real classrooms
            </h2>
          </div>

          <div style={cardGrid}>
            {process.map((item) => (
              <div
                key={item.step}
                style={{
                  ...glassCard,
                  background: theme.cardBg,
                  border: `1px solid ${theme.cardBorder}`,
                }}
              >
                <div style={stepBadge}>{item.step}</div>
                <h3 style={{ fontSize: '22px', margin: '0 0 12px', color: theme.text }}>
                  {item.title}
                </h3>
                <p style={{ margin: 0, color: theme.mutedText, lineHeight: '1.8', fontSize: '15px' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section
        style={{
          padding: '90px 20px',
          background:
            isDarkMode
              ? 'linear-gradient(135deg, #0b1730 0%, #0f3d5e 100%)'
              : 'linear-gradient(135deg, #eaf2ff 0%, #eefbf5 100%)',
        }}
      >
        <div style={container}>
          <div style={sectionHeader}>
            <div style={eyebrowLight}>Who it’s for</div>
            <h2 style={{ ...sectionTitle, color: theme.text }}>
              Designed for teachers, school leaders, and district decision-makers
            </h2>
          </div>

          <div style={cardGrid}>
            {audiences.map((item) => (
              <div
                key={item.title}
                style={{
                  ...glassCard,
                  background: theme.cardBg,
                  border: `1px solid ${theme.cardBorder}`,
                }}
              >
                <h3 style={{ fontSize: '24px', margin: '0 0 12px', color: theme.text }}>
                  {item.title}
                </h3>
                <p style={{ margin: 0, color: theme.mutedText, lineHeight: '1.8', fontSize: '15px' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DISTRICT SCALE */}
      <section
        style={{
          padding: '90px 20px',
          background: theme.sectionSoft,
        }}
      >
        <div style={container}>
          <div
            style={{
              ...glassCard,
              background:
                isDarkMode
                  ? 'linear-gradient(135deg, rgba(15,23,42,0.92), rgba(8,47,73,0.92))'
                  : 'linear-gradient(135deg, #ffffff, #f8fbff)',
              border: `1px solid ${theme.cardBorder}`,
              padding: '40px',
            }}
          >
            <div style={eyebrowLight}>Built for district scale</div>
            <h2 style={{ ...sectionTitle, color: theme.text, textAlign: 'left', marginBottom: '16px' }}>
              Built to analyze classrooms across schools and districts—without adding administrative workload
            </h2>
            <p style={{ color: theme.mutedText, lineHeight: '1.9', fontSize: '16px', margin: 0 }}>
              AlignEDU is positioned to help educational organizations move from isolated observations to scalable instructional visibility. That means faster insight, more consistency, and stronger decision-making over time.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        style={{
          padding: '100px 20px',
          background:
            'linear-gradient(135deg, #020617 0%, #0f172a 50%, #0f766e 100%)',
          color: '#ffffff',
          textAlign: 'center',
        }}
      >
        <div style={container}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <div style={eyebrowDark}>Get started</div>
            <h2
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.4rem)',
                lineHeight: '1.15',
                margin: '0 0 18px',
                fontWeight: 750,
              }}
            >
              Ready to turn classroom instruction into measurable insight?
            </h2>

            <p
              style={{
                margin: '0 auto 28px',
                maxWidth: '700px',
                color: 'rgba(255,255,255,0.80)',
                lineHeight: '1.8',
                fontSize: '17px',
              }}
            >
              Start with one lesson or request a demo to see how AlignEDU can support teachers, administrators, and district leaders.
            </p>

            <div
              className="bottom-demo-row"
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap',
                width: '100%',
                margin: '0 auto',
                maxWidth: '400px',
              }}
            >
              <button
                onClick={handleBookDemo}
                style={primaryBtn}
                className="hero-cta"
              >
                Book Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          textAlign: 'center',
          padding: '36px 20px 50px',
          background: isDarkMode ? '#050b16' : '#ffffff',
          borderTop: `1px solid ${theme.cardBorder}`,
        }}
      >
        <p style={{ margin: '0 0 8px', fontWeight: 700, color: theme.text }}>AlignEDU</p>
        <p style={{ margin: 0, color: theme.mutedText }}>support@alignedu.net</p>
      </footer>

      {/* THEME TOGGLE */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          padding: '11px 16px',
          fontSize: '14px',
          cursor: 'pointer',
          background: isDarkMode ? '#ffffff' : '#0f172a',
          color: isDarkMode ? '#0f172a' : '#ffffff',
          borderRadius: '999px',
          border: '1px solid rgba(148,163,184,0.25)',
          boxShadow: '0 10px 30px rgba(2,6,23,0.18)',
          zIndex: 50,
          fontWeight: 600,
        }}
      >
        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
      </button>
      <style jsx>{`
        .hero-cta,
        .hero-cta-unified {
          white-space: nowrap !important;
        }

        .hero-cta-row {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        @media (max-width: 767px) {
          .hero-cta-row {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px !important;
            width: 100%;
            max-width: 100%;
          }

          .hero-cta-unified {
            height: 42px !important;
            min-width: 0 !important;
            width: 100% !important;
            padding: 0 10px !important;
            font-size: 14px !important;
            border-radius: 12px !important;
            justify-content: center !important;
          }

          .bottom-demo-row {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            width: 100% !important;
            max-width: 400px !important;
            margin: 0 auto !important;
          }

          .bottom-demo-row .hero-cta {
            width: auto !important;
            min-width: 160px !important;
          }
        }

        @media (max-width: 480px) {
          .hero-cta-row {
            gap: 6px !important;
          }

          .hero-cta-unified {
            height: 40px !important;
            padding: 0 8px !important;
            font-size: 13px !important;
          }
        }
      `}</style>
    </main>
  );
}

const container: React.CSSProperties = {
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
};

const sectionHeader: React.CSSProperties = {
  textAlign: 'center',
  maxWidth: '860px',
  margin: '0 auto 52px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 'clamp(2rem, 4vw, 3rem)',
  lineHeight: '1.15',
  margin: '0 0 14px',
  fontWeight: 750,
  letterSpacing: '-0.02em',
};

const sectionSubtitle: React.CSSProperties = {
  fontSize: '17px',
  lineHeight: '1.8',
  margin: 0,
};

const eyebrowLight: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '14px',
  padding: '7px 12px',
  borderRadius: '999px',
  background: 'rgba(37, 99, 235, 0.08)',
  color: '#2563eb',
  fontWeight: 700,
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const eyebrowDark: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '14px',
  padding: '7px 12px',
  borderRadius: '999px',
  background: 'rgba(255,255,255,0.10)',
  color: '#dbeafe',
  fontWeight: 700,
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const primaryBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #f97316, #ea580c)',
  color: '#ffffff',
  padding: '0 20px',
  borderRadius: '12px',
  border: 'none',
  fontWeight: 700,
  fontSize: '15px',
  height: '48px',
  minWidth: '120px',
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


const cardGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '22px',
};

const glassCard: React.CSSProperties = {
  borderRadius: '22px',
  padding: '28px',
  boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
};

const featureIconWrap: React.CSSProperties = {
  width: '52px',
  height: '52px',
  borderRadius: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '18px',
  background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(16,185,129,0.12))',
  color: '#2563eb',
  fontSize: '22px',
  fontWeight: 700,
};

const heroMetricCard: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '14px 16px',
  borderRadius: '14px',
  background: 'rgba(255,255,255,0.08)',
  color: '#ffffff',
  border: '1px solid rgba(255,255,255,0.10)',
  backdropFilter: 'blur(10px)',
  fontSize: '14px',
  fontWeight: 600,
};

const heroMetricDot: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '999px',
  background: '#34d399',
  flexShrink: 0,
};

const dashboardStatCard: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid rgba(148,163,184,0.22)',
  borderRadius: '14px',
  padding: '14px',
};

const statLabel: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
  marginBottom: '6px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const statValue: React.CSSProperties = {
  fontSize: '20px',
  color: '#0f172a',
  fontWeight: 750,
};

const miniSectionTitle: React.CSSProperties = {
  fontSize: '13px',
  color: '#334155',
  marginBottom: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const miniListItem: React.CSSProperties = {
  background: '#f8fafc',
  color: '#0f172a',
  padding: '10px 12px',
  borderRadius: '12px',
  marginBottom: '10px',
  fontSize: '14px',
  lineHeight: '1.6',
  border: '1px solid rgba(148,163,184,0.18)',
};

const miniActionCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(16,185,129,0.08))',
  color: '#0f172a',
  padding: '14px',
  borderRadius: '14px',
  fontSize: '14px',
  lineHeight: '1.7',
  border: '1px solid rgba(148,163,184,0.18)',
};

const benefitRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  marginBottom: '16px',
};

const checkPill: React.CSSProperties = {
  width: '24px',
  height: '24px',
  minWidth: '24px',
  borderRadius: '999px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #2563eb, #10b981)',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 700,
  marginTop: '2px',
};

const stepBadge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '48px',
  height: '48px',
  borderRadius: '14px',
  background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(16,185,129,0.12))',
  color: '#2563eb',
  fontSize: '15px',
  fontWeight: 800,
  marginBottom: '18px',
};

const listStyle = (color: string): React.CSSProperties => ({
  margin: 0,
  paddingLeft: '20px',
  color,
  lineHeight: '2',
  fontSize: '15px',
});
