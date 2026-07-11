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
    label: 'One-step setup',
    query: 'Add analytics to this project.',
    answer:
      'Created a tracked website, generated the script, and wired it into your app. Tracking starts now.',
  },
  {
    label: 'Traffic diagnosis',
    query: 'What drove visitors this week?',
    answer:
      'GitHub, docs, and X are your top sources. GitHub visitors stay 42% longer. Double down there.',
  },
  {
    label: 'Conversion optimization',
    query: 'What should we fix next?',
    answer:
      'Move the signup CTA above the fold on /install. Track pricing clicks. Create a clearer path for GitHub traffic.',
  },
];

const installDocUrl = 'https://dashboard.amami.dev/install/mcp-install.md';

const installCommands = [
  {
    id: 'mcp',
    label: 'MCP',
    title: 'Ask your agent to install Amami MCP',
    command: `Copy this prompt and send it to your AI:

Install the Amami MCP server, then guide me through browser login and authorization.
${installDocUrl}`,
  },
  {
    id: 'skill',
    label: 'Skill',
    title: 'Ask Codex to install Amami skills',
    command: `Copy the instruction below and send it to Codex to install Amami Skills:

Install Amami Skills (amami-mcp-setup and amami-analytics), then connect my website.
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
  ['Discover sites', 'Find every analytics project your account can access.'],
  ['Create tracking', 'Spin up a new tracked website for any app you are building.'],
  ['Get stats', 'Pull visitors, pageviews, bounce rate, and session time for any date range.'],
  ['Inspect trends', 'View traffic patterns by minute, hour, day, or month.'],
  ['Analyze performance', 'Rank pages, referrers, countries, devices, events, and UTM campaigns.'],
  ['Verify tracking', 'Send test or server-side events to confirm your data pipeline is healthy.'],
];

const trustPoints = [
  {
    title: 'Browser consent required',
    body: 'Login, registration, and MCP authorization happen in your browser. You operate them, not your AI.',
    tone: 'secondary',
  },
  {
    title: 'Credentials stay local',
    body: 'Your API key is stored in your local environment, never pasted into chat.',
    tone: 'primary',
  },
  {
    title: 'Read-only by default',
    body: 'Your AI can inspect data safely. Write access is only enabled when you explicitly request setup.',
    tone: 'secondary',
  },
  {
    title: 'Recommendations from your data',
    body: 'Every insight is based on your actual traffic, pages, referrers, and events. No generic advice.',
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
          <a className={styles.primaryButton} href="/login">
            Get Started
          </a>
        </div>
      </nav>

      <section className={`${styles.hero} ${styles.pageSection}`} id="top">
        <div className={styles.heroCopy}>
          <h1>
            Your AI can now see
            <span>your website data.</span>
          </h1>
          <p>
            Ask Cursor, Claude, or your coding agent about traffic, referrers, pages, and
            conversions. Get answers and recommendations without opening a dashboard.
            <br />
            <br />
            &gt; Amami connects your AI assistant to website analytics in one step. Natural
            questions. Instant insights. No context switching.
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
              <p>Connect this website to Amami and analyze what is happening.</p>
            </div>
            <div className={styles.terminalRow}>
              <span className={styles.systemRole}>system:</span>
              <p className={styles.toolTrace}>
                &gt; Installing Amami MCP
                <br />
                &gt; Creating tracked website
                <br />
                &gt; Reading traffic and referrer data
              </p>
            </div>
            <div className={styles.terminalRow}>
              <span className={styles.assistantRole}>assistant:</span>
              <p>
                Amami connected. I found your site, analyzed traffic and referrers, and surfaced
                three recommendations:
                <br />- Improve the docs CTA placement
                <br />- Optimize the GitHub landing path
                <br />- Track signup events on the install page
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.pageSection}`} id="demo">
        <SectionHeader
          eyebrow="// Your AI discovers your sites, reads the data, and tells you what to fix."
          title="Ask. Analyze. Improve."
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
          title="One prompt. Zero config."
          eyebrow="// Copy one sentence. Your AI handles installation, browser auth, and setup."
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
            <h3>One sentence. Your AI does the rest.</h3>
            <p>
              Your AI assistant can create analytics projects, inject tracking, analyze traffic, and
              suggest improvements. Sensitive steps like login, registration, and authorization stay
              in your browser, under your control.
            </p>
            <ul>
              {[
                'Single-prompt installation',
                'Automatic site discovery and tracking setup',
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
          eyebrow="// Turn your AI assistant into a website data analyst."
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
          title="Your AI works. You approve."
          eyebrow="// Agents can analyze, but you control the keys."
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
        <p>© 2024 Amami AI. Analytics for the agent era.</p>
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
