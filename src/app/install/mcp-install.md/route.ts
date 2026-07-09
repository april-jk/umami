const installGuide = `# Amami MCP Installation Guide

Amami MCP connects AI agents and editors to Amami Analytics. Use this guide when a user asks you to install, configure, or verify Amami MCP.

## What You Should Do

1. Install the published npm package.
2. Start the browser login/register authorization flow.
3. Wait for the user to complete login/register and click **Authorize MCP** in the browser.
4. Configure the user's MCP client.
5. Verify the MCP server works with read tools, then verify write tools if setup used \`--write\`.

Do not ask the user to paste passwords, API keys, or auth tokens into chat. Do not bypass the browser authorization page with background login or register API calls.

## Requirements

- Node.js 20 or newer.
- npm or another Node package runner.
- A browser on the user's machine for Amami login/register authorization.

Check Node:

\`\`\`bash
node --version
npm --version
\`\`\`

## Install Amami MCP

Install the npm package globally:

\`\`\`bash
npm install -g amami-analytics-mcp
\`\`\`

Confirm the binary is available:

\`\`\`bash
amami-analytics-mcp --version
amami-analytics-mcp --help
\`\`\`

## Authorize The User

Run setup with write tools enabled so the user can create websites and send test events later:

\`\`\`bash
amami-analytics-mcp setup --write
\`\`\`

Expected behavior:

- The command opens \`https://dashboard.amami.dev/mcp/connect\` in the browser.
- The user personally logs in or registers.
- The user clicks **Authorize MCP**.
- The CLI receives a local callback and creates an API key.
- The CLI saves credentials to \`~/.amami-analytics-mcp/.env\` with restrictive permissions.

After setup, the MCP package auto-loads \`~/.amami-analytics-mcp/.env\`, so ordinary users do not need to pass \`--env-file\`.

## MCP Client Configuration

Use this stdio configuration for MCP clients that accept JSON config:

\`\`\`json
{
  "mcpServers": {
    "amami": {
      "command": "npx",
      "args": ["-y", "amami-analytics-mcp@latest"]
    }
  }
}
\`\`\`

If the user installed globally and prefers the global binary:

\`\`\`json
{
  "mcpServers": {
    "amami": {
      "command": "amami-analytics-mcp",
      "args": []
    }
  }
}
\`\`\`

For project-local configs, place the same server config in the client's MCP config file. Examples:

- Cursor: \`.cursor/mcp.json\`
- Claude Desktop: \`claude_desktop_config.json\`
- VS Code compatible clients: \`.vscode/mcp.json\`

When a client requires a different top-level key, keep the same command and args.

## Verify Installation

After the MCP client loads the server, call these tools:

1. \`get_me\` — confirms the authenticated account.
2. \`list_websites\` — confirms read access.
3. \`create_website\` should be visible when setup used \`--write\`.
4. \`send_event\` should be visible when setup used \`--write\`.

If the user only wants read-only analytics, run setup without \`--write\`:

\`\`\`bash
amami-analytics-mcp setup
\`\`\`

## Basic Usage

Common first tasks after verification:

- Create a tracked website with \`create_website\`.
- Add this tracking script to the target site's HTML head:

\`\`\`html
<script defer src="https://dashboard.amami.dev/script.js" data-website-id="WEBSITE_ID"></script>
\`\`\`

- Send a test event with \`send_event\`.
- Query traffic with \`get_stats\`, \`get_pageviews\`, and \`get_metrics\`.
- Inspect live traffic with \`get_active_visitors\` or \`get_realtime\`.

## Codex Skills

Install the Amami Codex skills when the user wants guided workflows for setup and analytics.

Repository:

\`\`\`text
april-jk/amami-skills
\`\`\`

Install these skill paths:

\`\`\`text
amami-mcp-setup
amami-analytics
\`\`\`

If you are Codex and have the skill installer available, install both skills from GitHub:

\`\`\`text
repo: april-jk/amami-skills
paths: amami-mcp-setup, amami-analytics
\`\`\`

After installing skills, tell the user to restart Codex so the new skills are loaded. Then use:

\`\`\`text
$amami-mcp-setup
$amami-analytics
\`\`\`

## Troubleshooting

### Browser Did Not Open

If setup prints a URL, ask the user to open it manually. The user must complete login/register and authorization in the browser.

### MCP Says Credentials Are Missing

Run setup again:

\`\`\`bash
amami-analytics-mcp setup --write
\`\`\`

Then restart the MCP client so it reloads the server.

### create_website Is Missing

The server is running read-only. Re-run setup with write enabled:

\`\`\`bash
amami-analytics-mcp setup --write
\`\`\`

### Custom Env File

Only advanced users need this. For a non-default env file, pass \`--env-file\` explicitly:

\`\`\`bash
amami-analytics-mcp --env-file /path/to/custom.env
\`\`\`

## Security Rules

- Never ask the user to paste passwords into chat.
- Never print or expose the generated API key.
- Do not place API keys in command arguments.
- Use browser authorization for login/register.
- Do not enable destructive tools unless the user explicitly asks for delete or reset behavior.
`;

export function GET() {
  return new Response(installGuide, {
    headers: {
      'cache-control': 'public, max-age=300',
      'content-type': 'text/markdown; charset=utf-8',
    },
  });
}
