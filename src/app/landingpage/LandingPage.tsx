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
    label: 'One-step analytics setup',
    query: 'Add analytics to this project.',
    answer:
      'Amami MCP created a website, generated the tracking script, and helped wire it into your app.',
  },
  {
    label: 'Traffic insight',
    query: 'What is driving visitors this week?',
    answer:
      'GitHub, docs, and X are the top sources. GitHub visitors spend 42% longer than average.',
  },
  {
    label: 'Conversion recommendation',
    query: 'What should we improve next?',
    answer:
      'Move the signup CTA higher on the install page, track pricing clicks, and create a clearer path for GitHub visitors.',
  },
];

const installDocUrl = 'https://dashboard.amami.dev/install/mcp-install.md';

const installCommands = [
  {
    id: 'mcp',
    label: 'MCP',
    title: 'Ask your agent to install Amami MCP',
    command: `Copy the instruction below and send it to your agent for automatic installation:

Please follow the guide to install Amami MCP, then walk me through browser login, registration, and authorization.
${installDocUrl}`,
  },
  {
    id: 'skill',
    label: 'Skill',
    title: 'Ask Codex to install Amami skills',
    command: `Copy the instruction below and send it to Codex to install Amami Skills:

Please follow the guide to install Amami Codex Skills, including amami-mcp-setup and amami-analytics.
${installDocUrl}#codex-skills`,
  },
  {
    id: 'config',
    label: 'Config',
    title: 'MCP client config options',
    command: `// Recommended after running: amami-analytics-mcp setup --write
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
        "AMAMI_API_KEY": "your_api_key_here",
        "AMAMI_ENABLE_WRITE": "1"
      }
    }
  }
}`,
  },
];

const tools = [
  ['list_websites', 'Let the agent find the analytics projects your account can access.'],
  ['create_website', 'Let the agent create a tracked website for the app you are building.'],
  ['get_stats', 'Ask for visitors, pageviews, visits, bounce rate, and total time.'],
  ['get_pageviews', 'Inspect traffic trends by minute, hour, day, or month.'],
  ['get_metrics', 'Analyze pages, referrers, countries, devices, events, and UTM performance.'],
  [
    'send_event',
    'Send test or server-side events so your agent can verify tracking and measure growth actions.',
  ],
];

const trustPoints = [
  {
    title: 'Browser consent required.',
    body: 'Login, registration, and MCP authorization happen in the browser, operated by the user.',
    tone: 'secondary',
  },
  {
    title: 'Local credentials.',
    body: 'Generated API keys are stored locally for the MCP client, not pasted into chat.',
    tone: 'primary',
  },
  {
    title: 'Read-first analytics.',
    body: 'Agents can inspect analytics safely, with write access enabled only when setup requests it.',
    tone: 'secondary',
  },
  {
    title: 'Recommendations from your data.',
    body: 'Recommendations are based on your site traffic, pages, referrers, and events.',
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
          <a className={styles.primaryButton} href="/dashboard">
            Get Started
          </a>
        </div>
      </nav>

      <section className={`${styles.hero} ${styles.pageSection}`} id="top">
        <div className={styles.heroCopy}>
          <h1>
            Connect your agent to Amami.
            <span>Find and analyze any website.</span>
          </h1>
          <p>
            &gt; Amami lets coding agents connect website analytics in one step, then analyze
            traffic, referrers, pages, conversions, and the recommendations that can improve them.
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
              <p>Connect this website to Amami and analyze what is happening.</p>
            </div>
            <div className={styles.terminalRow}>
              <span className={styles.systemRole}>sys:</span>
              <p className={styles.toolTrace}>
                &gt; Installing Amami MCP
                <br />
                &gt; Creating tracking website
                <br />
                &gt; Reading traffic and referrer data
              </p>
            </div>
            <div className={styles.terminalRow}>
              <span className={styles.assistantRole}>ast:</span>
              <p>
                Amami is connected. I found the site, analyzed traffic and referrers, and surfaced
                recommendations to improve the docs CTA, GitHub landing path, and signup events.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.pageSection}`} id="demo">
        <SectionHeader
          eyebrow="// Your agent can connect analytics, find websites, analyze behavior, and recommend what to improve."
          title="From one-click connection to website analysis."
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
          title="Install once. Let your agent handle analytics."
          eyebrow="// Copy one prompt to set up MCP, browser authorization, and agent tools."
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
            <h3>One prompt. Amami connected to your agent.</h3>
            <p>
              Amami MCP lets your coding agent create analytics projects, connect your current app,
              find websites, analyze traffic and conversions, and request AI recommendations while
              login and authorization stay in your browser.
            </p>
            <ul>
              {[
                'One-click connection to Amami',
                'Website discovery and analysis',
                'User-controlled browser authorization',
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
          title="Website analysis tools for agents."
          eyebrow="// Connect Amami, inspect traffic, and understand what is working."
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
          title="Built for human-approved agent workflows."
          eyebrow="// Your agent can act, but you stay in control."
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
