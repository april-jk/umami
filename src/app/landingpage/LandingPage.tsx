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
  { id: 'demo', label: 'Questions' },
  { id: 'install', label: 'Install' },
  { id: 'tools', label: 'Tools' },
  { id: 'security', label: 'Read-only' },
];

const examples = [
  {
    label: 'Traffic summary',
    query: 'How was traffic last week?',
    answer:
      'I can read visits, pageviews, bounces, and time on site for the selected period, then summarize what changed.',
  },
  {
    label: 'Top pages',
    query: 'Which pages performed best this month?',
    answer:
      'I can compare the pages receiving attention and keep the underlying metrics in the response for you to inspect.',
  },
  {
    label: 'Traffic sources',
    query: 'Where did visitors come from?',
    answer:
      'I can group referrers and countries from your Umami data, then point out the changes worth investigating.',
  },
];

const installDocUrl = 'https://analytics.amami.dev/install/mcp-install.md';

const installCommands = [
  {
    id: 'mcp',
    label: 'MCP',
    title: 'Ask your agent to install the read-only Amami MCP server',
    command: `Copy this prompt and send it to your AI:

Install the read-only Amami MCP server, then guide me through browser login and authorization for my Umami analytics.
${installDocUrl}`,
  },
  {
    id: 'skill',
    label: 'Skill',
    title: 'Ask Codex to install Amami analytics skills',
    command: `Copy the instruction below and send it to Codex to install Amami Skills:

Install Amami Skills (amami-mcp-setup and amami-analytics), then help me query my Umami analytics with read-only access.
${installDocUrl}#codex-skills`,
  },
  {
    id: 'config',
    label: 'Config',
    title: 'MCP client config options',
    command: `// Read-only MCP client configuration
{
  "mcpServers": {
    "amami": {
      "command": "npx",
      "args": [
        "-y",
        "amami-analytics-mcp@latest"
      ]
    }
  }
}

// Manual API key configuration, if you already have a key
{
  "mcpServers": {
    "amami": {
      "command": "npx",
      "args": ["-y", "amami-analytics-mcp@latest"],
      "env": {
        "AMAMI_API_KEY": "your_api_key_here"
      }
    }
  }
}`,
  },
];

const tools = [
  ['List websites', 'Find the Umami sites your assistant is allowed to analyze.'],
  ['Read traffic stats', 'Pull visitors, pageviews, visits, bounces, and time on site.'],
  ['Inspect trends', 'Read traffic patterns by day or hour for the period you choose.'],
  ['Find top pages', 'See which pages are receiving attention.'],
  ['Check active visitors', 'Read the current active-visitor count.'],
  ['Trace traffic sources', 'Inspect where visitors came from.'],
];

const trustPoints = [
  {
    title: 'Browser consent stays with you',
    body: 'Login, registration, and MCP authorization happen in your browser. Your agent does not perform them for you.',
    tone: 'secondary',
  },
  {
    title: 'Credentials stay in local configuration',
    body: 'Your API key is stored by your MCP client on your machine, rather than supplied to an AI conversation.',
    tone: 'primary',
  },
  {
    title: 'Read-only by design',
    body: 'The public MCP workflow uses focused, aggregate analytics reads. It does not create websites or change your Umami setup.',
    tone: 'secondary',
  },
  {
    title: 'Keep the dashboard',
    body: 'Amami is an AI-native read layer for Umami, not a dashboard or BI replacement.',
    tone: 'primary',
  },
];

const trustBadges = [
  { label: 'Secure', Icon: LockKey },
  { label: 'Private', Icon: EyeSlash },
  { label: 'Scoped', Icon: ShieldCheck },
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
          <a className={styles.primaryButton} href="https://docs.amami.dev">
            Read docs
          </a>
        </div>
      </nav>

      <section className={`${styles.hero} ${styles.pageSection}`} id="top">
        <div className={styles.heroCopy}>
          <h1>
            Ask your Umami analytics <span>from your AI coding assistant.</span>
          </h1>
          <p>
            Amami is a read-only MCP server for Cursor, Claude Desktop, and other MCP clients. Ask
            about traffic, top pages, active visitors, and referrers without leaving the place where
            you build.
            <br />
            <br />
            &gt; Keep Umami. Add an AI-native read layer for the analytics questions you already
            have.
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
              <span className={styles.userRole}>user:</span>
              <p>Which pages performed best this week?</p>
            </div>
            <div className={styles.terminalRow}>
              <span className={styles.systemRole}>system:</span>
              <p className={styles.toolTrace}>
                &gt; Listing available websites
                <br />
                &gt; Reading top pages for the selected period
                <br />
                &gt; Returning aggregate analytics data
              </p>
            </div>
            <div className={styles.terminalRow}>
              <span className={styles.assistantRole}>assistant:</span>
              <p>
                I found the pages receiving attention for the date range. I can show their visitors
                and pageviews, then help you decide what to inspect next.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.pageSection}`} id="demo">
        <SectionHeader
          eyebrow="// Ask the questions you already have, then inspect the underlying Umami metrics."
          title="Ask. Read. Decide."
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
        <SectionHeader
          title="A read-only analytics layer for your agent."
          eyebrow="// Install the MCP server, authorize it in your browser, then ask a question."
        />
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
            <h3>Install, authorize, then ask.</h3>
            <p>
              Amami gives your assistant a focused set of Umami analytics reads. Login,
              registration, and authorization stay in your browser, under your control.
            </p>
            <ul>
              {[
                'Read-only MCP installation',
                'Your existing Umami websites',
                'Browser-based user authorization',
              ].map(item => (
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
        <SectionHeader
          title="What your AI can do once connected."
          eyebrow="// Six focused analytics reads, designed for natural-language questions."
        />
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
          title="Read-only, local, and scoped."
          eyebrow="// Your agent can inspect analytics. You retain control of credentials and authorization."
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
        <p>© 2026 Amami. Read-only analytics for AI coding assistants.</p>
        <div>
          <a href="https://docs.amami.dev">Docs</a>
          <a
            href="https://github.com/april-jk/umami-analytics-mcp"
            rel="noreferrer"
            target="_blank"
          >
            MCP GitHub
          </a>
          <a href="https://github.com/april-jk/amami-skills" rel="noreferrer" target="_blank">
            Skills
          </a>
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
