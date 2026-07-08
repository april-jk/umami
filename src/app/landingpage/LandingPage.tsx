'use client';

import {
  ArrowRight,
  CheckCircle,
  Copy,
  EyeSlash,
  Key,
  LockKey,
  ShieldCheck,
  TerminalWindow,
} from '@phosphor-icons/react';
import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useState } from 'react';
import styles from './landingpage.module.css';

const pageAnchors = [
  { id: 'top', label: 'Hero', shortLabel: '01' },
  { id: 'demo', label: 'Demo', shortLabel: '02' },
  { id: 'install', label: 'Install', shortLabel: '03' },
  { id: 'tools', label: 'Tools', shortLabel: '04' },
  { id: 'security', label: 'Security', shortLabel: '05' },
  { id: 'waitlist', label: 'Waitlist', shortLabel: '06' },
];

const examples = [
  {
    label: 'Traffic check',
    query: 'How was traffic last week?',
    answer: 'Traffic rose 27.4%. The docs install page and pricing page created most of the lift.',
  },
  {
    label: 'Top pages',
    query: 'Which pages performed best this month?',
    answer: '/docs/mcp, /pricing, and /blog/launch carried 63.8% of pageviews this month.',
  },
  {
    label: 'Live traffic',
    query: 'How many people are active right now?',
    answer:
      '12 visitors are active. Most are reading install docs from Cursor and Claude Desktop referrals.',
  },
];

const installCommands = [
  {
    id: 'skill',
    label: 'Skill',
    title: 'Install as a global skill',
    command: `# Install as a global skill
npx -y @amami/cli install

# Or view source on GitHub
https://github.com/amami-dev/amami-mcp/tree/main/skills/amami`,
  },
  {
    id: 'mcp',
    label: 'MCP',
    title: 'Add directly to Claude Desktop',
    command:
      'claude mcp add amami -e UMAMI_API_KEY=your_cloud_api_key -- npx -y umami-analytics-mcp',
  },
  {
    id: 'config',
    label: 'Config',
    title: 'Cursor / Claude Desktop config',
    command: `{
  "mcpServers": {
    "amami": {
      "command": "npx",
      "args": ["-y", "umami-analytics-mcp"],
      "env": {
        "UMAMI_API_KEY": "your_api_key_here"
      }
    }
  }
}`,
  },
];

const tools = [
  ['list_websites', 'Retrieves all websites accessible to the provided API key.'],
  ['get_website_stats', 'Gets high-level metrics (pageviews, visitors, bounces) for a site.'],
  ['get_pageviews', 'Fetches a time-series array of pageviews over a specific date range.'],
  ['get_top_pages', 'Lists the most visited URLs for a given period, sorted by views.'],
  ['get_active_visitors', 'Returns the real-time count of currently active visitors on the site.'],
  ['get_traffic_sources', 'Identifies referrers and sources driving traffic to your domain.'],
];

const trustPoints = [
  {
    title: '0 writes.',
    body: 'The MCP server only implements GET requests. It cannot modify data.',
    tone: 'secondary',
  },
  {
    title: 'No dashboard changes.',
    body: 'Your Umami instance remains untouched. Amami just reads the API.',
    tone: 'primary',
  },
  {
    title: 'Credentials stay local.',
    body: "API keys remain in your MCP client's environment variables.",
    tone: 'secondary',
  },
  {
    title: 'Aggregate analytics only.',
    body: "Leverages Umami's privacy-focused metrics without exposing PII.",
    tone: 'primary',
  },
];

const trustBadges = [
  { label: 'Secure', Icon: LockKey },
  { label: 'Private', Icon: EyeSlash },
  { label: 'Read Only', Icon: ShieldCheck },
  { label: 'Local Keys', Icon: Key },
];

export default function LandingPage() {
  const [activePage, setActivePage] = useState(pageAnchors[0].id);
  const [activeInstall, setActiveInstall] = useState(0);
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState('');

  const selectedInstall = installCommands[activeInstall];
  const formLabel = useMemo(() => {
    if (submittedEmail) {
      return 'Joined';
    }

    return 'Submit';
  }, [submittedEmail]);

  useEffect(() => {
    const root = document.documentElement;

    function syncViewportVars() {
      const navHeight = 74;
      const viewportHeight = window.innerHeight;
      const isCompactHeight = viewportHeight < 760;
      root.style.setProperty('--landing-vh', `${viewportHeight}px`);
      root.style.setProperty('--landing-nav-height', `${navHeight}px`);
      root.style.setProperty(
        '--landing-page-min-height',
        `${Math.max(Math.round((viewportHeight - navHeight) * 0.82), 560)}px`,
      );
      root.style.setProperty('--landing-page-pad', isCompactHeight ? '52px' : '74px');
      root.style.setProperty('--landing-scroll-margin', `${navHeight + 28}px`);
    }

    syncViewportVars();
    window.setTimeout(() => {
      const targetId = window.location.hash.slice(1);
      const target = targetId ? document.getElementById(targetId) : null;
      target?.scrollIntoView({ block: 'start' });
    }, 0);
    window.addEventListener('resize', syncViewportVars);
    window.addEventListener('orientationchange', syncViewportVars);

    return () => {
      window.removeEventListener('resize', syncViewportVars);
      window.removeEventListener('orientationchange', syncViewportVars);
    };
  }, []);

  useEffect(() => {
    let snapTimer = 0;
    let lastWheelAt = 0;
    let lastWheelDelta = 0;

    function snapToNearestSection() {
      const now = window.performance.now();

      if (now - lastWheelAt < 140) {
        return;
      }

      const viewportHeight = window.innerHeight;
      const snapLine = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--landing-scroll-margin'),
      );
      const sections = pageAnchors
        .map(anchor => document.getElementById(anchor.id))
        .filter((section): section is HTMLElement => Boolean(section));
      const candidates = sections.map(section => ({
        section,
        top: section.getBoundingClientRect().top,
        distance: Math.abs(section.getBoundingClientRect().top - snapLine),
      }));
      const directional =
        lastWheelDelta > 0
          ? candidates.find(
              candidate => candidate.top > snapLine + 32 && candidate.top < viewportHeight * 0.86,
            )
          : candidates
              .filter(
                candidate => candidate.top < snapLine - 32 && candidate.top > -viewportHeight * 0.6,
              )
              .at(-1);
      const nearest = directional ?? candidates.sort((a, b) => a.distance - b.distance)[0];

      if (nearest && (directional || nearest.distance < viewportHeight * 0.22)) {
        nearest.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', `#${nearest.section.id}`);
      }
    }

    function handleWheel(event: WheelEvent) {
      lastWheelAt = window.performance.now();
      lastWheelDelta = event.deltaY;
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(snapToNearestSection, 180);
    }

    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.clearTimeout(snapTimer);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    const sections = pageAnchors
      .map(anchor => document.getElementById(anchor.id))
      .filter((section): section is HTMLElement => Boolean(section));

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActivePage(visible.target.id);
        }
      },
      {
        rootMargin: '-34% 0px -48% 0px',
        threshold: [0.15, 0.3, 0.55, 0.75],
      },
    );

    sections.forEach(section => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  function selectInstall(index: number) {
    setCopiedCommand('');
    setActiveInstall(index);
  }

  function handleInstallKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }

    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + installCommands.length) % installCommands.length;
    selectInstall(nextIndex);
  }

  async function copyCommand() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectedInstall.command);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = selectedInstall.command;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }

    setCopiedCommand(selectedInstall.id);
    window.setTimeout(() => {
      setCopiedCommand(current => (current === selectedInstall.id ? '' : current));
    }, 1800);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail || isSubmitting) {
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/landingpage/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Unable to join the waitlist.');
      }

      setSubmittedEmail(normalizedEmail);
      setEmail('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to join the waitlist.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Primary navigation">
        <a className={styles.brand} href="#top" aria-label="Amami home">
          Amami
        </a>
        <div className={styles.navLinks}>
          {pageAnchors.slice(1).map(anchor => (
            <a
              aria-current={activePage === anchor.id ? 'page' : undefined}
              href={`#${anchor.id}`}
              key={anchor.id}
            >
              {anchor.label === 'Tools' ? 'MCP tools' : anchor.label}
            </a>
          ))}
        </div>
        <div className={styles.navAction}>
          <TerminalWindow size={22} weight="duotone" />
          <a className={styles.primaryButton} href="#waitlist">
            Get Started
          </a>
        </div>
      </nav>

      <section
        className={`${styles.hero} ${styles.pageSection}`}
        data-page-index="01"
        data-page-label="Hero"
        id="top"
      >
        <div className={styles.heroCopy}>
          <h1>
            Stop clicking dashboards.
            <span>Ask your analytics.</span>
          </h1>
          <p>
            &gt; Amami connects Cursor, Claude Desktop, and other MCP clients to your Umami data,
            allowing you to query traffic metrics directly from your editor.
          </p>
        </div>

        <div className={styles.terminal} aria-label="MCP terminal demo">
          <div className={styles.terminalTop}>
            <div className={styles.windowDots} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span>mcp-client --session=cursor</span>
          </div>
          <div className={styles.terminalBody}>
            <div className={styles.terminalRow}>
              <span className={styles.userRole}>usr:</span>
              <p>Which pages performed best this month?</p>
            </div>
            <div className={styles.terminalRow}>
              <span className={styles.systemRole}>sys:</span>
              <p className={styles.toolTrace}>
                &gt; Executing tool: list_websites
                <br />
                &gt; Executing tool: get_top_pages
              </p>
            </div>
            <div className={styles.terminalRow}>
              <span className={styles.assistantRole}>ast:</span>
              <p>
                /docs/mcp and /pricing drove <strong>63.8%</strong> of pageviews. Inspect referral
                quality before changing copy.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.pageSection}`}
        data-page-index="02"
        data-page-label="Demo"
        id="demo"
      >
        <SectionHeader
          eyebrow="// Compact, normalized analytics data for LLMs."
          title="Ask the questions you already have."
        />
        <div className={styles.exampleStack}>
          {examples.map(example => (
            <article className={styles.exampleCard} key={example.label}>
              <span>{example.label}</span>
              <h3>&gt; &quot;{example.query}&quot;</h3>
              <p>&quot;{example.answer}&quot;</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.pageSection}`}
        data-page-index="03"
        data-page-label="Install"
        id="install"
      >
        <SectionHeader title="Quick integration." eyebrow="// Setup path for MCP clients." />
        <div className={styles.installLayout}>
          <div className={styles.installWorkbench}>
            <div className={styles.tabs} role="tablist" aria-label="Install method">
              {installCommands.map((item, index) => (
                <button
                  aria-controls="install-panel"
                  aria-selected={index === activeInstall}
                  className={index === activeInstall ? styles.tabActive : styles.tab}
                  id={`install-tab-${item.id}`}
                  key={item.id}
                  onClick={() => selectInstall(index)}
                  onKeyDown={event => handleInstallKeyDown(event, index)}
                  role="tab"
                  tabIndex={index === activeInstall ? 0 : -1}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div
              aria-labelledby={`install-tab-${selectedInstall.id}`}
              className={styles.codeWindow}
              id="install-panel"
              key={selectedInstall.id}
              role="tabpanel"
            >
              <div className={styles.codeTop}>
                <div className={styles.windowDots} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <button className={styles.copyButton} onClick={copyCommand} type="button">
                  <Copy size={16} weight="bold" />
                  {copiedCommand === selectedInstall.id ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className={styles.codeBlock}>
                <code>{selectedInstall.command}</code>
              </pre>
            </div>
          </div>
          <div className={styles.installCopy}>
            <h3>Integrate anywhere.</h3>
            <p>
              Amami is built on the Model Context Protocol (MCP). It works universally across modern
              AI assistants and editors.
            </p>
            <ul>
              {['Cursor', 'Claude Desktop', 'Custom Scripts'].map(item => (
                <li key={item}>
                  <CheckCircle size={20} weight="fill" />
                  {item}
                </li>
              ))}
            </ul>
            <a className={styles.secondaryButton} href="#waitlist">
              View Documentation
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.pageSection}`}
        data-page-index="04"
        data-page-label="Tools"
        id="tools"
      >
        <SectionHeader title="Exposed tools." eyebrow="// One analytics layer for AI." />
        <div className={styles.toolsGrid}>
          {tools.map(([name, description]) => (
            <article className={styles.toolCard} key={name}>
              <h3>{name}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.pageSection}`}
        aria-label="Security and privacy"
        data-page-index="05"
        data-page-label="Security"
        id="security"
      >
        <SectionHeader
          title="Security & Privacy."
          eyebrow="// Read-only by design. Small enough to trust."
        />
        <div className={styles.trustLayout}>
          <div className={styles.trustList}>
            {trustPoints.map(point => (
              <article className={styles.trustItem} key={point.title}>
                <span
                  className={point.tone === 'primary' ? styles.dotPrimary : styles.dotSecondary}
                />
                <div>
                  <h3>{point.title}</h3>
                  <p>{point.body}</p>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.trustVisual} aria-label="Security promises">
            {trustBadges.map(({ label, Icon }) => (
              <div className={styles.trustBadge} key={label}>
                <Icon size={48} weight="light" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className={`${styles.waitlistSection} ${styles.pageSection}`}
        data-page-index="06"
        data-page-label="Waitlist"
        id="waitlist"
      >
        <div className={styles.waitlistCard}>
          <h2>Join the Waitlist</h2>
          <p>Get early access to the managed Amami cloud service.</p>
          <form className={styles.waitlistForm} onSubmit={handleSubmit}>
            <input
              aria-label="Work email"
              name="email"
              onChange={event => setEmail(event.target.value)}
              placeholder="Work email"
              required
              type="email"
              value={email}
            />
            <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Submitting...' : formLabel}
            </button>
          </form>
          <p
            className={
              formError ? styles.formError : submittedEmail ? styles.formSuccess : styles.formHint
            }
          >
            {formError
              ? formError
              : submittedEmail
                ? `${submittedEmail} is queued for early access.`
                : 'No spam. Unsubscribe anytime.'}
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>Amami</span>
        <p>© 2024 Amami AI. High-performance analytics for the modern developer.</p>
        <div>
          <a href="#waitlist">Privacy</a>
          <a href="#waitlist">Terms</a>
          <a href="https://github.com/amami-dev/amami-mcp" rel="noreferrer" target="_blank">
            GitHub
          </a>
          <a href="#install">Docs</a>
        </div>
      </footer>
    </main>
  );
}

function SectionHeader({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <div className={styles.sectionHeader}>
      <h2>{title}</h2>
      <p>{eyebrow}</p>
    </div>
  );
}
