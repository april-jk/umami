'use client';

import {
  ArrowRight,
  CaretRight,
  ChartLineUp,
  CheckCircle,
  Code,
  CursorClick,
  Database,
  EnvelopeSimple,
  GitFork,
  LockKey,
  PlugsConnected,
  Robot,
  Sparkle,
  TerminalWindow,
} from '@phosphor-icons/react';
import { type FormEvent, type KeyboardEvent, useMemo, useState } from 'react';
import styles from './landingpage.module.css';

const mcpTools = [
  ['list_websites', 'Find the Umami sites your assistant can analyze.'],
  ['get_website_stats', 'Pull pageviews, visitors, visits, bounces, and time on site.'],
  ['get_pageviews', 'Inspect traffic trends by day or hour.'],
  ['get_top_pages', 'Find the pages getting attention.'],
  ['get_active_visitors', 'Check live traffic without opening a dashboard.'],
  ['get_traffic_sources', 'See where visitors came from.'],
];

const prompts = [
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

const proof = [
  ['5%+', 'landing page signup target'],
  ['read-only', 'safe MCP access model'],
  ['6 tools', 'focused analytics surface'],
  ['npx', 'local-first install path'],
];

const installCommands = [
  {
    id: 'skill',
    title: 'Install Amami Skill',
    eyebrow: 'Agent skill',
    command: `Install the Amami analytics skill in this coding agent.

Source: https://github.com/amami-dev/amami-mcp/tree/main/skills/amami

Use it for:
- Asking Umami analytics questions from Cursor, Claude Desktop, or another MCP client.
- Keeping Amami read-only by default.
- Installing the Amami MCP server with npx when I provide Umami credentials.`,
    body: 'Copies an agent-ready prompt for installing Amami workflow guidance and using the MCP setup path.',
  },
  {
    id: 'mcp',
    title: 'Install Amami MCP',
    eyebrow: 'MCP server',
    command:
      'claude mcp add amami \\\n  -e UMAMI_API_KEY=your_cloud_api_key \\\n  -- npx -y umami-analytics-mcp',
    body: 'Registers the current read-only MCP package with credentials kept in your local MCP client config.',
  },
  {
    id: 'config',
    title: 'Cursor / Claude Desktop config',
    eyebrow: 'JSON config',
    command: `{
  "mcpServers": {
    "amami": {
      "command": "npx",
      "args": ["-y", "umami-analytics-mcp"],
      "env": {
        "UMAMI_API_KEY": "your_cloud_api_key"
      }
    }
  }
}`,
    body: 'Copies a config block for .cursor/mcp.json or claude_desktop_config.json.',
  },
];

export default function LandingPage() {
  const [activePrompt, setActivePrompt] = useState(0);
  const [activeInstall, setActiveInstall] = useState(0);
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState('');

  const selected = prompts[activePrompt];
  const selectedInstall = installCommands[activeInstall];
  const commandLines = selectedInstall.command.split('\n');

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

  const formLabel = useMemo(() => {
    if (submittedEmail) {
      return 'You are on the list';
    }

    return 'Get early access';
  }, [submittedEmail]);

  async function copyCommand(id: string, command: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(command);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = command;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }

    setCopiedCommand(id);
    window.setTimeout(() => {
      setCopiedCommand(current => (current === id ? '' : current));
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
          <span className={styles.brandMark}>a</span>
          <span>Amami</span>
        </a>
        <div className={styles.navLinks}>
          <a href="#demo">Demo</a>
          <a href="#install">Install</a>
          <a href="#mcp">MCP tools</a>
          <a href="#waitlist">Waitlist</a>
        </div>
        <a className={styles.navCta} href="#waitlist">
          Get early access
          <ArrowRight size={16} />
        </a>
      </nav>

      <section id="top" className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>
            <Sparkle size={16} weight="bold" />
            AI-native analytics for Umami
          </div>
          <h1>Stop clicking dashboards. Ask your analytics.</h1>
          <p className={styles.heroText}>
            Amami lets Cursor, Claude Desktop, and other MCP clients answer traffic questions from
            your Umami data.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#waitlist">
              Get early access
              <ArrowRight size={18} />
            </a>
            <a className={styles.secondaryButton} href="#install">
              Copy install
              <CaretRight size={18} />
            </a>
          </div>
          <div className={styles.trustRow} aria-label="Key product promises">
            <span>
              <LockKey size={15} weight="bold" />
              privacy-first
            </span>
            <span>
              <PlugsConnected size={15} weight="bold" />
              stdio MCP
            </span>
            <span>
              <Code size={15} weight="bold" />
              Cursor ready
            </span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="AI analytics console preview">
          <div className={styles.consoleWindow}>
            <div className={styles.consoleHeader}>
              <span />
              <span />
              <span />
              <strong>Cursor asks Amami</strong>
            </div>
            <div className={styles.chatBlock}>
              <div className={styles.promptLine}>
                <Robot size={18} weight="bold" />
                Which pages performed best this month?
              </div>
              <div className={styles.toolCall}>
                <TerminalWindow size={18} weight="bold" />
                list_websites + get_top_pages
              </div>
              <div className={styles.answerCard}>
                <span className={styles.answerKicker}>Answer</span>
                /docs/mcp and /pricing drove 63.8% of pageviews. Inspect referral quality before
                changing copy.
              </div>
            </div>
            <div className={styles.metricGrid}>
              {proof.map(([value, label]) => (
                <div className={styles.metricTile} key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className={styles.chart} aria-hidden="true">
              <span style={{ height: '36%' }} />
              <span style={{ height: '58%' }} />
              <span style={{ height: '42%' }} />
              <span style={{ height: '74%' }} />
              <span style={{ height: '64%' }} />
              <span style={{ height: '92%' }} />
              <span style={{ height: '69%' }} />
              <span style={{ height: '84%' }} />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.band} aria-label="Market positioning">
        <p>
          Built for vibecoding developers shipping with Cursor, Claude Desktop, Next.js, Vercel,
          Supabase, and Umami.
        </p>
        <div className={styles.bandItems}>
          <span>Not another GA replacement</span>
          <span>Read-only by design</span>
          <span>Umami data where you build</span>
        </div>
      </section>

      <section id="demo" className={styles.demoSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>AI query demo</span>
          <h2>Ask the questions you already have.</h2>
          <p>
            Amami gives your assistant compact, normalized analytics data so it can summarize what
            changed and suggest what to inspect next.
          </p>
        </div>

        <div className={styles.demoGrid}>
          <div className={styles.promptPanel}>
            {prompts.map((prompt, index) => (
              <button
                className={index === activePrompt ? styles.promptButtonActive : styles.promptButton}
                key={prompt.label}
                onClick={() => setActivePrompt(index)}
                type="button"
              >
                <span>{prompt.label}</span>
                <strong>{prompt.query}</strong>
              </button>
            ))}
          </div>
          <div className={styles.resultPanel}>
            <div className={styles.resultToolbar}>
              <span>
                <CursorClick size={16} />
                Agent run
              </span>
              <span className={styles.statusPill}>ready</span>
            </div>
            <p className={styles.queryText}>{selected.query}</p>
            <div className={styles.steps}>
              <span>
                <CheckCircle size={16} />
                list_websites
              </span>
              <span>
                <CheckCircle size={16} />
                get_website_stats
              </span>
              <span>
                <CheckCircle size={16} />
                get_traffic_sources
              </span>
            </div>
            <div className={styles.answerBox}>
              <ChartLineUp size={22} />
              <p>{selected.answer}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="install" className={styles.installSection}>
        <div className={styles.quickIntegrationShell}>
          <div className={styles.quickIntegrationPreview}>
            <div className={styles.integrationBackdrop} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className={styles.installTabs} role="tablist" aria-label="Install method">
              {installCommands.map((item, index) => (
                <button
                  aria-controls="install-code-panel"
                  aria-selected={index === activeInstall}
                  className={index === activeInstall ? styles.installTabActive : styles.installTab}
                  id={`install-tab-${item.id}`}
                  key={item.id}
                  onClick={() => selectInstall(index)}
                  onKeyDown={event => handleInstallKeyDown(event, index)}
                  role="tab"
                  tabIndex={index === activeInstall ? 0 : -1}
                  type="button"
                >
                  {item.id === 'skill' ? 'Skill' : item.id === 'mcp' ? 'MCP' : 'Config'}
                </button>
              ))}
            </div>
            <div
              aria-labelledby={`install-tab-${selectedInstall.id}`}
              className={styles.installCodePanel}
              id="install-code-panel"
              key={selectedInstall.id}
              role="tabpanel"
            >
              <div className={styles.installCodeHeader}>
                <span>{selectedInstall.eyebrow}</span>
                <strong>{selectedInstall.title}</strong>
              </div>
              <button
                aria-live="polite"
                className={styles.copyButton}
                onClick={() => copyCommand(selectedInstall.id, selectedInstall.command)}
                type="button"
              >
                <Code size={16} weight="bold" />
                {copiedCommand === selectedInstall.id ? 'Copied' : 'Copy'}
              </button>
              <ol className={styles.commandLines} aria-label={`${selectedInstall.title} snippet`}>
                {commandLines.map((line, index) => (
                  <li key={`${selectedInstall.id}-${index}-${line}`}>
                    <span className={styles.commandLineNumber} aria-hidden="true">
                      {index + 1}
                    </span>
                    <code>{line || ' '}</code>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className={styles.quickIntegrationContent}>
            <span className={styles.sectionKicker}>MCP/API quick integration</span>
            <h2>Copy the right setup path. Start querying Umami in minutes.</h2>
            <p>
              Choose a skill prompt, direct MCP command, or client config block. Amami keeps the
              setup local-first and read-only, so your assistant can answer analytics questions
              without changing your Umami instance.
            </p>
            <a className={styles.primaryButton} href="#waitlist">
              Get early access
              <ArrowRight size={18} />
            </a>
            <p className={styles.integrationHint}>
              <CheckCircle size={15} weight="bold" />
              {selectedInstall.body}
            </p>
          </div>
        </div>
      </section>

      <section id="mcp" className={styles.toolsSection}>
        <div className={styles.sectionIntroCompact}>
          <span className={styles.sectionKicker}>MCP acquisition wedge</span>
          <h2>Six focused tools. One analytics layer for AI.</h2>
        </div>
        <div className={styles.toolsGrid}>
          {mcpTools.map(([name, description]) => (
            <article className={styles.toolCard} key={name}>
              <Database size={22} />
              <h3>{name}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.pricingSection} aria-label="MVP validation hypothesis">
        <div>
          <span className={styles.sectionKicker}>Read-only by design</span>
          <h2>Small enough to trust. Useful enough to keep open.</h2>
        </div>
        <div className={styles.priceCard}>
          <span>Amami MCP</span>
          <strong>0 writes</strong>
          <p>No dashboard changes, no credential persistence, no session-level personal data.</p>
        </div>
        <div className={styles.validationList}>
          <p>
            <CheckCircle size={16} />
            Credentials stay in local MCP config
          </p>
          <p>
            <CheckCircle size={16} />
            Aggregate analytics only in the MVP
          </p>
          <p>
            <CheckCircle size={16} />
            Keep Umami; add an AI-native read layer
          </p>
        </div>
      </section>

      <section id="waitlist" className={styles.waitlistSection}>
        <div>
          <span className={styles.sectionKicker}>Early access</span>
          <h2>Help shape AI-native analytics.</h2>
          <p>
            Join the waitlist if you use Umami and want your assistant to answer traffic questions
            for you.
          </p>
        </div>
        <form className={styles.waitlistForm} onSubmit={handleSubmit}>
          <label htmlFor="email">Work email</label>
          <div className={styles.formRow}>
            <div className={styles.inputWrap}>
              <EnvelopeSimple size={18} />
              <input
                id="email"
                name="email"
                onChange={event => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
                type="email"
                value={email}
              />
            </div>
            <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Joining...' : formLabel}
              <ArrowRight size={18} />
            </button>
          </div>
          <p
            className={
              formError ? styles.formError : submittedEmail ? styles.formSuccess : styles.formHint
            }
          >
            {formError
              ? formError
              : submittedEmail
                ? `${submittedEmail} is queued for early access.`
                : 'No spam. Just the MCP install path and first hosted beta invite.'}
          </p>
        </form>
      </section>

      <footer className={styles.footer}>
        <span>Amami</span>
        <a href="https://github.com/amami-dev/amami-mcp" rel="noreferrer" target="_blank">
          <GitFork size={17} />
          Star on GitHub
        </a>
      </footer>
    </main>
  );
}
