'use client';

import {
  CheckCircle,
  Copy,
  EyeSlash,
  Key,
  LockKey,
  ShieldCheck,
  TerminalWindow,
} from '@phosphor-icons/react';
import { type KeyboardEvent, useEffect, useState } from 'react';
import styles from './landingpage.module.css';

const pageAnchors = [
  { id: 'top', label: 'Hero' },
  { id: 'demo', label: 'Demo' },
  { id: 'install', label: 'Install' },
  { id: 'tools', label: 'Tools' },
  { id: 'security', label: 'Security' },
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
    body: 'Your analytics instance remains untouched. Amami just reads the API.',
    tone: 'primary',
  },
  {
    title: 'Credentials stay local.',
    body: "API keys remain in your MCP client's environment variables.",
    tone: 'secondary',
  },
  {
    title: 'Aggregate analytics only.',
    body: 'Uses privacy-focused aggregate metrics without exposing PII.',
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
  const [copiedCommand, setCopiedCommand] = useState('');

  const selectedInstall = installCommands[activeInstall];

  useEffect(() => {
    const root = document.documentElement;

    function syncViewportVars() {
      const navHeight = 74;
      root.style.setProperty('--landing-nav-height', `${navHeight}px`);
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
    const pointerQuery = window.matchMedia('(pointer: fine)');

    if (!pointerQuery.matches) {
      return;
    }

    const root = document.documentElement;
    let frame = 0;
    let nextX = window.innerWidth / 2;
    let nextY = window.innerHeight * 0.28;

    function syncGlow() {
      root.style.setProperty('--landing-cursor-x', `${nextX}px`);
      root.style.setProperty('--landing-cursor-y', `${nextY}px`);
      root.style.setProperty('--landing-glow-opacity', '1');
      frame = 0;
    }

    function syncIdleGlow() {
      root.style.setProperty('--landing-cursor-x', `${nextX}px`);
      root.style.setProperty('--landing-cursor-y', `${nextY}px`);
      root.style.setProperty('--landing-glow-opacity', '0.32');
    }

    function handlePointerMove(event: PointerEvent) {
      nextX = event.clientX;
      nextY = event.clientY;

      if (!frame) {
        frame = window.requestAnimationFrame(syncGlow);
      }
    }

    function hideGlow() {
      root.style.setProperty('--landing-glow-opacity', '0');
    }

    syncIdleGlow();
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', hideGlow);
    window.addEventListener('blur', hideGlow);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', hideGlow);
      window.removeEventListener('blur', hideGlow);
      root.style.removeProperty('--landing-cursor-x');
      root.style.removeProperty('--landing-cursor-y');
      root.style.removeProperty('--landing-glow-opacity');
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
          <a className={styles.primaryButton} href="/login">
            Get Started
          </a>
        </div>
      </nav>

      <section className={`${styles.hero} ${styles.pageSection}`} id="top">
        <div className={styles.heroCopy}>
          <h1>
            Stop clicking dashboards.
            <span>Ask your analytics.</span>
          </h1>
          <p>
            &gt; Amami connects Cursor, Claude Desktop, and other MCP clients to your analytics
            data, allowing you to query traffic metrics directly from your editor.
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

      <section className={`${styles.section} ${styles.pageSection}`} id="demo">
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

      <section className={`${styles.section} ${styles.pageSection}`} id="install">
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
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.pageSection}`} id="tools">
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

      <footer className={styles.footer}>
        <span>Amami</span>
        <p>© 2024 Amami AI. High-performance analytics for the modern developer.</p>
        <div>
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
