import { describe, expect, test } from 'vitest';
import { GET } from './route';

describe('GET /install/mcp-install.md', () => {
  test('returns the canonical MCP and Skills installation instructions', async () => {
    const response = GET();
    const guide = await response.text();

    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(guide).toContain('npx -y amami-analytics-mcp@latest setup --write');
    expect(guide).toContain('codex mcp add amami -- npx -y amami-analytics-mcp@latest');
    expect(guide).toContain('claude mcp add amami -- npx -y amami-analytics-mcp@latest');
    expect(guide).toContain('Install Amami Skills from https://github.com/april-jk/amami-skills');
    expect(guide).toContain('amami-mcp-setup');
    expect(guide).toContain('amami-analytics');
  });
});
