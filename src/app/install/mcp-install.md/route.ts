const installGuide = `# Amami MCP Installation Guide

This is the canonical Amami MCP installation guide. Follow it instead of using web search or another installation guide.

## Copy This Prompt

Copy this prompt and send it to your AI:

\`\`\`text
Install and connect Amami MCP for this client. Do not fetch a documentation URL or use web search first.

1. Check that Node.js is version 20 or newer.
2. Run: npx -y amami-analytics-mcp@latest setup --write. It should open my system browser automatically and print a fallback URL.
3. Tell me that the browser should open automatically. Only show me the printed URL if it does not. Keep the original setup process running while I authorize it. Do not ask me for credentials or start a second setup process.
4. Identify this client before registering Amami. Use \`codex mcp add amami -- npx -y amami-analytics-mcp@latest\` for Codex, \`claude mcp add amami -- npx -y amami-analytics-mcp@latest\` for Claude Code (never edit \`~/.claude/settings.json\`), and \`.cursor/mcp.json\` for Cursor.
5. Reload MCP if needed, then call only \`get_me\` and \`list_websites\`. Inspect the tool list for \`create_website\`; do not create test websites or send test events.
\`\`\`

## Expected Browser Setup

- The command opens the system browser and prints a fallback URL.
- The user personally logs in or registers, then approves Amami MCP in the browser.
- Keep the original setup process running until browser authorization completes.
- The CLI stores the generated credential locally at \`~/.amami-analytics-mcp/.env\`.
- Never ask the user to paste credentials, API keys, or authorization tokens into chat.

## Client Registration

Register only after browser setup succeeds:

- Codex: \`codex mcp add amami -- npx -y amami-analytics-mcp@latest\`
- Claude Code: \`claude mcp add amami -- npx -y amami-analytics-mcp@latest\`; never edit \`~/.claude/settings.json\`
- Cursor: add the \`amami\` server to the active project's \`.cursor/mcp.json\`

For verification, reload the client if needed, call only \`get_me\` and \`list_websites\`, and inspect whether \`create_website\` is available. Do not create test websites, send test events, or call other write tools during verification.

## Install Amami Skills

Copy this instruction into Codex:

\`\`\`text
Install Amami Skills from https://github.com/april-jk/amami-skills using the paths \`amami-mcp-setup\` and \`amami-analytics\`. Do not fetch a documentation URL or use web search first.
\`\`\`

Restart Codex after the skills are installed so they are loaded. Then use \`$amami-mcp-setup\` for browser setup and \`$amami-analytics\` for analytics workflows.

## Manual Configuration And Security

Use browser setup for the normal path. For manual API keys, self-hosted instances, or advanced client configuration, keep secrets in local environment files or the client's secret store. Do not put API keys in chat or command arguments.
`;

export function GET() {
  return new Response(installGuide, {
    headers: {
      'cache-control': 'public, max-age=300',
      'content-type': 'text/markdown; charset=utf-8',
    },
  });
}
