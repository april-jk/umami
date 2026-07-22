import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { GET } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));

const parseRequestMock = vi.mocked(parseRequest);

beforeEach(() => {
  parseRequestMock.mockReset();
  parseRequestMock.mockResolvedValue({ error: undefined });
  process.env.CLOUD_MODE = '1';
  process.env.FAVICON_URL = 'https://assets.amami.dev/favicon.ico';
  process.env.LINKS_URL = 'https://amami.dev/q';
  process.env.PIXELS_URL = 'https://amami.dev/p';
  process.env.PRIVATE_MODE = '1';
  process.env.TRACKER_SCRIPT_NAME = 'analytics.js';
  process.env.DISABLE_TELEMETRY = '1';
  process.env.DISABLE_UPDATES = '1';
});

afterEach(() => {
  delete process.env.CLOUD_MODE;
  delete process.env.FAVICON_URL;
  delete process.env.LINKS_URL;
  delete process.env.PIXELS_URL;
  delete process.env.PRIVATE_MODE;
  delete process.env.TRACKER_SCRIPT_NAME;
  delete process.env.DISABLE_TELEMETRY;
  delete process.env.DISABLE_UPDATES;
});

test('returns only configuration used by the independent application', async () => {
  const response = await GET(new Request('http://localhost/api/config'));

  await expect(response.json()).resolves.toEqual({
    cloudMode: true,
    faviconUrl: 'https://assets.amami.dev/favicon.ico',
    linksUrl: 'https://amami.dev/q',
    pixelsUrl: 'https://amami.dev/p',
    privateMode: true,
    trackerScriptName: 'analytics.js',
  });
});

test('returns request validation errors without exposing configuration', async () => {
  const expected = new Response(null, { status: 400 });
  parseRequestMock.mockResolvedValue({ error: () => expected });

  await expect(GET(new Request('http://localhost/api/config'))).resolves.toBe(expected);
});
