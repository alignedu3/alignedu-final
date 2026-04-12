'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from './context/ThemeContext';

export default function HomePage() {
  const { theme: currentTheme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(currentTheme === 'dark');
  const router = useRouter();

  useEffect(() => {
    setIsDarkMode(currentTheme === 'dark');
  }, [currentTheme]);

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
          padding: 'clamp(86px, 11vw, 108px) 20px clamp(64px, 9vw, 78px)',
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
                className="hero-dashboard-shell"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '28px',
                  padding: '18px',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 35px 90px rgba(2, 6, 23, 0.45)',
                }}
              >
                <div
                  className="hero-dashboard-frame"
                  style={{
                    background: 'linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.24)',
                  }}
                >
                  <div
                    style={{
                      background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
                      color: '#ffffff',
                      padding: '13px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <span>District Dashboard</span>
                  </div>

                  <div className="preview-inner-body" style={{ padding: '18px' }}>
                    <div className="preview-kpi-row" style={previewTopRow}>
                      <div className="preview-card-up" style={previewKpiPrimary}>
                        <div style={previewKpiLabel}>District Instruction Score</div>
                        <div className="preview-kpi-value" style={previewKpiValue}>92.4%</div>
                        <div style={previewKpiDelta}>+8.1% this month</div>
                      </div>

                      <div className="preview-card-up preview-delay-2" style={previewKpiSecondary}>
                        <div style={previewKpiLabel}>At-Risk Standards</div>
                        <div className="preview-kpi-value" style={{ ...previewKpiValue, color: '#0f172a' }}>4</div>
                        <div style={{ ...previewKpiDelta, color: '#b45309' }}>Needs review in 2 schools</div>
                      </div>
                    </div>

                    <div className="preview-card-up preview-delay-2" style={previewChartCard}>
                      <div style={previewSectionHeader}>
                        <span>Subject Coverage by School</span>
                        <span style={{ color: '#0369a1' }}>Q2 Benchmark</span>
                      </div>
                      <div className="preview-legend-row" style={previewSchoolLegend}>
                        {[
                          { name: 'Mathematics', color: '#0ea5e9' },
                          { name: 'Science', color: '#3b82f6' },
                          { name: 'English', color: '#14b8a6' },
                          { name: 'Social Studies', color: '#f59e0b' },
                        ].map((subject) => (
                          <div key={subject.name} className="preview-legend-item" style={previewLegendItem}>
                            <span style={{ ...previewLegendDot, background: subject.color }} />
                            <span>{subject.name}</span>
                          </div>
                        ))}
                      </div>

                      <div className="preview-subject-row" style={previewSubjectCardsRow}>
                        {[
                          {
                            name: 'Elementary',
                            subjects: [
                              { subject: 'Math', value: 92, color: '#0ea5e9' },
                              { subject: 'Science', value: 88, color: '#3b82f6' },
                              { subject: 'English', value: 83, color: '#14b8a6' },
                              { subject: 'Social', value: 77, color: '#f59e0b' },
                            ],
                          },
                          {
                            name: 'Middle School',
                            subjects: [
                              { subject: 'Math', value: 86, color: '#0ea5e9' },
                              { subject: 'Science', value: 84, color: '#3b82f6' },
                              { subject: 'English', value: 90, color: '#14b8a6' },
                              { subject: 'Social', value: 81, color: '#f59e0b' },
                            ],
                          },
                          {
                            name: 'High School',
                            subjects: [
                              { subject: 'Math', value: 79, color: '#0ea5e9' },
                              { subject: 'Science', value: 91, color: '#3b82f6' },
                              { subject: 'English', value: 86, color: '#14b8a6' },
                              { subject: 'Social', value: 88, color: '#f59e0b' },
                            ],
                          },
                        ].map((schoolGroup, schoolIndex) => (
                          <div key={schoolGroup.name} className="preview-school-card" style={previewSubjectCard}>
                            <div style={previewSubjectTitle}>{schoolGroup.name}</div>
                            <div className="preview-coverage-wrap" style={previewCoverageChartWrap}>
                              <div style={previewCoverageYAxis}>
                                {[100, 75, 50, 25].map((tick) => (
                                  <span key={tick}>{tick}</span>
                                ))}
                              </div>
                              <div style={previewCoveragePlotArea}>
                                <div style={previewCoverageChartGrid} />
                                <div style={{ ...previewCoverageBenchmarkLine, bottom: 'calc(14px + 85%)' }}>
                                  <span style={previewCoverageBenchmarkLabel}>85%</span>
                                </div>
                                <div style={previewCoverageBarsWrap}>
                                  {schoolGroup.subjects.map((item, subjectIndex) => (
                                    <div key={item.subject} style={previewCoverageBarCol}>
                                      <div style={previewCoverageBarTrack}>
                                        <div
                                          className="preview-subject-bar-fill"
                                          style={{
                                            ...previewCoverageBarFill,
                                            height: `${item.value}%`,
                                            background: `linear-gradient(180deg, ${item.color}, ${item.color}CC)`,
                                            animationDelay: `${170 + schoolIndex * 110 + subjectIndex * 75}ms`,
                                          }}
                                        >
                                          <span className="preview-coverage-top-value" style={previewCoverageBarValue}>{item.value}%</span>
                                        </div>
                                      </div>
                                      <span style={previewCoverageBarLabel}>{item.subject}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="preview-bottom-grid" style={previewBottomGrid}>
                      <div className="preview-card-up preview-delay-3" style={previewProgressCard}>
                        <div style={previewSectionHeader}>Standard Mastery</div>
                        {[
                          {
                            school: 'Elementary',
                            subject: 'Math (Grade 4)',
                            teks: ['4.4(A)', '4.5(B)'],
                            mastery: 89,
                          },
                          {
                            school: 'Middle School',
                            subject: 'Science (Grade 8)',
                            teks: ['8.6(A)', '8.7(C)'],
                            mastery: 82,
                          },
                          {
                            school: 'High School',
                            subject: 'Algebra I',
                            teks: ['A.5(A)', 'A.9(D)'],
                            mastery: 78,
                          },
                        ].map((item) => (
                          <div key={item.school} style={previewMasteryBlock}>
                            <div style={previewMasterySchool}>{item.school}</div>
                            <div style={previewProgressRow}>
                              <span style={previewProgressLabel}>{item.subject}</span>
                              <span style={previewProgressValue}>{item.mastery}%</span>
                            </div>
                            <div style={previewMasteryTeks}>TEKS: {item.teks.join(' · ')}</div>
                            <div style={previewProgressTrack}>
                              <div style={{ ...previewProgressFill, width: `${item.mastery}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="preview-card-up preview-delay-4" style={previewActivityCard}>
                        <div style={previewSectionHeader}>Recent Flags</div>
                        <div style={previewActivityItem}>
                          <span style={previewActivityDotWarn} />
                          <span>STAAR-tested TEKS A.7(C) not observed in 4 of 6 Algebra I classrooms</span>
                        </div>
                        <div style={previewActivityItem}>
                          <span style={previewActivityDotWarn} />
                          <span>Grade 5 Science — 3 campuses below 70% mastery on TEKS 5.6(A)</span>
                        </div>
                        <div style={previewActivityItem}>
                          <span style={previewActivityDotWarn} />
                          <span>Curriculum pacing gap detected: 8th grade ELA 3 weeks behind district scope</span>
                        </div>
                        <div style={previewActivityItem}>
                          <span style={previewActivityDotWarn} />
                          <span>Low instructional alignment in Grade 3 Reading across two campuses</span>
                        </div>
                        <div style={previewActivityItem}>
                          <span style={previewActivityDotGood} />
                          <span>Middle school Math TEKS coverage up 11% after targeted coaching cycle</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '34px',
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
          padding: 'clamp(30px, 4vw, 38px) 20px',
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
          padding: 'clamp(58px, 8vw, 78px) 20px',
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
          padding: 'clamp(58px, 8vw, 78px) 20px',
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
          padding: 'clamp(58px, 8vw, 78px) 20px',
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
          padding: 'clamp(58px, 8vw, 78px) 20px',
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
          padding: 'clamp(58px, 8vw, 78px) 20px',
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
          padding: 'clamp(58px, 8vw, 78px) 20px',
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
          padding: 'clamp(68px, 9vw, 88px) 20px',
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
        <p style={{ margin: '0 0 18px', color: theme.mutedText }}>support@alignedu.net</p>
        <div className="legal-links-row">
          <Link href="/faq" className="legal-link">FAQ</Link>
          <Link href="/terms" className="legal-link">Terms of Use</Link>
          <Link href="/privacy" className="legal-link">Privacy Policy</Link>
          <Link href="/security" className="legal-link">Security</Link>
          <Link href="/disclaimer" className="legal-link">Disclaimer</Link>
        </div>
        <p style={{ margin: '18px 0 0', color: theme.mutedText, fontSize: 13 }}>
          © {new Date().getFullYear()} AlignEDU. All rights reserved.
        </p>
      </footer>

      <style jsx>{`
        .hero-dashboard-shell {
          animation: dashboardFloatIn 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .hero-dashboard-frame {
          animation: dashboardFadeIn 760ms ease-out 80ms both;
        }

        .preview-kpi-row {
          animation: dashboardFadeIn 620ms ease-out 120ms both;
        }

        .preview-card-up {
          animation: cardRiseIn 560ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .preview-delay-2 {
          animation-delay: 160ms;
        }

        .preview-delay-3 {
          animation-delay: 220ms;
        }

        .preview-delay-4 {
          animation-delay: 280ms;
        }

        .preview-subject-bar-fill {
          transform-origin: bottom;
          transform: scaleY(0.2);
          animation: growCoverageBar 780ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        @keyframes dashboardFloatIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes dashboardFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes cardRiseIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes growCoverageBar {
          from {
            transform: scaleY(0.2);
            filter: saturate(1.15);
          }
          to {
            transform: scaleY(1);
            filter: saturate(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-dashboard-shell,
          .hero-dashboard-frame,
          .preview-kpi-row,
          .preview-card-up,
          .preview-subject-bar-fill {
            animation: none !important;
            transform: none !important;
          }
        }

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

        .legal-links-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .legal-link {
          color: ${theme.mutedText};
          font-size: 13px;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: color 0.2s ease, border-color 0.2s ease;
        }

        .legal-link:hover {
          color: ${theme.text};
          border-color: ${theme.text};
        }

        @media (max-width: 1024px) {
          .preview-inner-body {
            padding: 14px !important;
          }

          .preview-kpi-value {
            font-size: 22px !important;
          }

          /* Stack Mastery + Flags on tablets too */
          .preview-bottom-grid {
            grid-template-columns: 1fr !important;
          }

          /* Legend 2×2 on tablet */
          .preview-legend-row {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          /* School charts: 2 per row on tablet, last one spans full */
          .preview-subject-row {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .preview-school-card:last-child {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 767px) {
          .hero-dashboard-shell {
            padding: 12px !important;
          }

          .preview-inner-body {
            padding: 12px !important;
          }

          .preview-kpi-value {
            font-size: 20px !important;
          }

          .preview-bottom-grid {
            grid-template-columns: 1fr !important;
          }

          .preview-legend-row {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6px !important;
            padding: 8px 10px !important;
          }

          .preview-legend-item {
            font-size: 10px;
          }

          /* School charts: 2 per row, last one full-width */
          .preview-subject-row {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }

          .preview-school-card:last-child {
            grid-column: 1 / -1;
          }

          .preview-coverage-top-value {
            top: -13px;
            font-size: 8px;
          }

          .preview-coverage-wrap {
            height: 104px !important;
          }

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
          .hero-dashboard-shell {
            padding: 10px !important;
          }

          .preview-inner-body {
            padding: 10px !important;
          }

          .preview-kpi-value {
            font-size: 18px !important;
          }

          .preview-legend-row {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 5px !important;
            padding: 7px 8px !important;
          }

          .preview-legend-item {
            font-size: 9px;
          }

          /* All 3 school charts stack full-width on small mobile */
          .preview-subject-row {
            grid-template-columns: 1fr !important;
          }

          .preview-coverage-wrap {
            height: 96px !important;
            padding: 8px 7px 7px !important;
          }

          .preview-school-card:last-child {
            grid-column: auto;
          }

          .preview-coverage-top-value {
            top: -12px;
            font-size: 8px;
          }

          .hero-cta-row {
            gap: 6px !important;
          }

          .hero-cta-unified {
            height: 40px !important;
            padding: 0 8px !important;
            font-size: 13px !important;
          }

          .legal-links-row {
            gap: 8px;
          }

          .legal-link {
            font-size: 12px;
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
  margin: '0 auto 44px',
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

const previewTopRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.35fr 1fr',
  gap: '10px',
  marginBottom: '12px',
};

const previewKpiPrimary: React.CSSProperties = {
  background: 'linear-gradient(145deg, #0f172a, #1e293b)',
  color: '#ffffff',
  borderRadius: '14px',
  border: '1px solid rgba(148,163,184,0.24)',
  padding: '12px',
};

const previewKpiSecondary: React.CSSProperties = {
  background: '#ffffff',
  color: '#0f172a',
  borderRadius: '14px',
  border: '1px solid rgba(148,163,184,0.26)',
  padding: '12px',
};

const previewKpiLabel: React.CSSProperties = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#94a3b8',
  fontWeight: 700,
  marginBottom: '6px',
};

const previewKpiValue: React.CSSProperties = {
  fontSize: '27px',
  fontWeight: 800,
  lineHeight: 1.1,
  marginBottom: '4px',
  color: '#ffffff',
};

const previewKpiDelta: React.CSSProperties = {
  fontSize: '12px',
  color: '#34d399',
  fontWeight: 600,
};

const previewChartCard: React.CSSProperties = {
  borderRadius: '14px',
  border: '1px solid rgba(14,116,144,0.18)',
  background: 'linear-gradient(180deg, #ffffff 0%, #f4f9ff 100%)',
  padding: '12px',
  marginBottom: '10px',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 18px rgba(15,23,42,0.06)',
};

const previewSectionHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '12px',
  color: '#0f172a',
  fontWeight: 700,
  marginBottom: '9px',
};

const previewSchoolLegend: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  alignItems: 'center',
  gap: '6px',
  marginBottom: '10px',
  padding: '8px 10px',
  borderRadius: '12px',
  background: 'rgba(248,250,252,0.9)',
  border: '1px solid rgba(148,163,184,0.18)',
};

const previewLegendItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '10px',
  color: '#334155',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
};

const previewLegendDot: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '999px',
  flexShrink: 0,
};

const previewCoverageChartWrap: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'stretch',
  gap: '6px',
  borderRadius: '9px',
  background: 'rgba(255,255,255,0.8)',
  border: '1px solid rgba(148,163,184,0.24)',
  padding: '8px 8px 6px',
  height: '108px',
};

const previewCoverageYAxis: React.CSSProperties = {
  width: '20px',
  display: 'grid',
  gridTemplateRows: 'repeat(4, 1fr)',
  alignItems: 'end',
  justifyItems: 'end',
  fontSize: '7px',
  color: '#64748b',
  fontWeight: 700,
  lineHeight: 1,
  paddingBottom: '16px',
};

const previewCoveragePlotArea: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  height: '100%',
  paddingBottom: '14px',
};

const previewCoverageChartGrid: React.CSSProperties = {
  position: 'absolute',
  top: '0',
  left: '0',
  right: '0',
  bottom: '14px',
  pointerEvents: 'none',
  backgroundImage:
    'linear-gradient(to top, rgba(148,163,184,0.18) 1px, transparent 1px)',
  backgroundSize: '100% 33%',
};

const previewCoverageBenchmarkLine: React.CSSProperties = {
  position: 'absolute',
  left: '0',
  right: '0',
  borderTop: '1px dashed rgba(14,116,144,0.55)',
  pointerEvents: 'none',
};

const previewCoverageBenchmarkLabel: React.CSSProperties = {
  position: 'absolute',
  right: '2px',
  top: '-10px',
  fontSize: '7px',
  color: '#0369a1',
  fontWeight: 700,
  background: 'rgba(255,255,255,0.9)',
  padding: '0 2px',
};

const previewSubjectCardsRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '8px',
};

const previewSubjectCard: React.CSSProperties = {
  borderRadius: '10px',
  border: '1px solid rgba(148,163,184,0.2)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,250,252,0.9))',
  padding: '6px',
  boxShadow: '0 4px 10px rgba(15,23,42,0.04)',
};

const previewSubjectTitle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 800,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  marginBottom: '6px',
  textAlign: 'center',
  color: '#0f172a',
};

const previewCoverageBarsWrap: React.CSSProperties = {
  width: '100%',
  height: 'calc(100% - 14px)',
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '4px',
  alignItems: 'stretch',
  position: 'relative',
  zIndex: 1,
};

const previewCoverageBarCol: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '3px',
  minWidth: 0,
};

const previewCoverageBarTrack: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
};

const previewCoverageBarFill: React.CSSProperties = {
  width: '46%',
  borderRadius: '999px 999px 3px 3px',
  minHeight: '9px',
  boxShadow: '0 4px 8px rgba(14,116,144,0.16)',
  position: 'relative',
  overflow: 'visible',
};

const previewCoverageBarValue: React.CSSProperties = {
  position: 'absolute',
  top: '-15px',
  left: '50%',
  transform: 'translateX(-50%)',
  fontSize: '8px',
  color: '#334155',
  fontWeight: 700,
};

const previewCoverageBarLabel: React.CSSProperties = {
  fontSize: '7px',
  color: '#64748b',
  fontWeight: 700,
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

const previewCoverageSchoolLabel: React.CSSProperties = {
  fontSize: '9px',
  color: '#334155',
  fontWeight: 700,
  textAlign: 'center',
  lineHeight: 1,
  marginTop: '4px',
  whiteSpace: 'nowrap',
  width: '100%',
};

const previewBottomGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr',
  gap: '10px',
};

const previewProgressCard: React.CSSProperties = {
  borderRadius: '14px',
  border: '1px solid rgba(148,163,184,0.24)',
  background: '#ffffff',
  padding: '12px',
};

const previewMasteryBlock: React.CSSProperties = {
  marginBottom: '10px',
};

const previewMasterySchool: React.CSSProperties = {
  fontSize: '10px',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  fontWeight: 800,
  color: '#0369a1',
  marginBottom: '6px',
};

const previewProgressRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '4px',
};

const previewProgressLabel: React.CSSProperties = {
  fontSize: '11px',
  color: '#334155',
  fontWeight: 600,
};

const previewProgressValue: React.CSSProperties = {
  fontSize: '11px',
  color: '#0f172a',
  fontWeight: 700,
};

const previewMasteryTeks: React.CSSProperties = {
  fontSize: '10px',
  color: '#475569',
  marginBottom: '6px',
  fontWeight: 600,
};

const previewProgressTrack: React.CSSProperties = {
  width: '100%',
  height: '8px',
  borderRadius: '999px',
  background: '#e2e8f0',
  overflow: 'hidden',
  marginBottom: '9px',
};

const previewProgressFill: React.CSSProperties = {
  height: '100%',
  borderRadius: '999px',
  background: 'linear-gradient(90deg, #22d3ee, #2563eb)',
};

const previewActivityCard: React.CSSProperties = {
  borderRadius: '14px',
  border: '1px solid rgba(148,163,184,0.24)',
  background: '#ffffff',
  padding: '12px',
};

const previewActivityItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  fontSize: '11px',
  lineHeight: '1.5',
  color: '#334155',
  marginBottom: '8px',
};

const previewActivityDotWarn: React.CSSProperties = {
  width: '8px',
  height: '8px',
  marginTop: '4px',
  borderRadius: '999px',
  background: '#f59e0b',
  flexShrink: 0,
};

const previewActivityDotGood: React.CSSProperties = {
  width: '8px',
  height: '8px',
  marginTop: '4px',
  borderRadius: '999px',
  background: '#10b981',
  flexShrink: 0,
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
