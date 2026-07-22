import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { matchesConfiguredPath } from '@/lib/match-configured-path';
import middleware from '../../docker/proxy';

const { nextMock, redirectMock, rewriteMock } = vi.hoisted(() => ({
  nextMock: vi.fn(),
  redirectMock: vi.fn(),
  rewriteMock: vi.fn(),
}));

vi.mock('next/server', () => {
  class MockNextResponse extends Response {}
  Object.assign(MockNextResponse, {
    next: nextMock,
    redirect: redirectMock,
    rewrite: rewriteMock,
  });
  return { NextResponse: MockNextResponse };
});

vi.mock('@/lib/match-configured-path', () => ({ matchesConfiguredPath: vi.fn() }));

const matchesConfiguredPathMock = vi.mocked(matchesConfiguredPath);

function request(hostname: string, path: string, forwardedHost?: string, port?: string) {
  const url = new URL(`https://${hostname}${port ? `:${port}` : ''}${path}`);
  return {
    headers: new Headers(forwardedHost ? { 'x-forwarded-host': forwardedHost } : undefined),
    nextUrl: Object.assign(url, { clone: () => new URL(url.toString()) }),
  } as any;
}

beforeEach(() => {
  nextMock.mockReset();
  redirectMock.mockReset();
  rewriteMock.mockReset();
  matchesConfiguredPathMock.mockReset();
  nextMock.mockReturnValue({ type: 'next' });
});

afterEach(() => {
  delete process.env.COLLECT_API_ENDPOINT;
  delete process.env.TRACKER_SCRIPT_NAME;
  delete process.env.TRACKER_SCRIPT_URL;
  delete process.env.DISABLE_LOGIN;
});

describe('legacy dashboard redirects', () => {
  test('permanently redirects dashboard pages while preserving path and query', () => {
    redirectMock.mockImplementation(url => ({ type: 'redirect', url: url.toString() }));

    const response = middleware(request('dashboard.amami.dev', '/login?returnTo=%2Fdashboard'));

    expect(response).toEqual({
      type: 'redirect',
      url: 'https://analytics.amami.dev/login?returnTo=%2Fdashboard',
    });
    expect(redirectMock).toHaveBeenCalledWith(expect.any(URL), 308);
  });

  test.each([
    '/script.js',
    '/api/send',
  ])('keeps the legacy %s tracker endpoint same-origin', path => {
    expect(middleware(request('dashboard.amami.dev', path))).toEqual({ type: 'next' });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  test('does not redirect the canonical host', () => {
    expect(middleware(request('analytics.amami.dev', '/login'))).toEqual({ type: 'next' });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  test('uses the forwarded public host when the proxy host is internal', () => {
    redirectMock.mockImplementation(url => ({ type: 'redirect', url: url.toString() }));

    expect(
      middleware(
        request('amami-web-production.up.railway.app', '/dashboard', 'dashboard.amami.dev'),
      ),
    ).toEqual({ type: 'redirect', url: 'https://analytics.amami.dev/dashboard' });
  });

  test('removes the internal port from the public redirect', () => {
    redirectMock.mockImplementation(url => ({ type: 'redirect', url: url.toString() }));

    expect(
      middleware(
        request('amami-web-production.up.railway.app', '/login', 'dashboard.amami.dev', '8080'),
      ),
    ).toEqual({
      type: 'redirect',
      url: 'https://analytics.amami.dev/login',
    });
  });
});

describe('existing proxy behavior', () => {
  test('rewrites configured collection and tracker aliases', () => {
    process.env.COLLECT_API_ENDPOINT = '/collect';
    process.env.TRACKER_SCRIPT_NAME = 'analytics.js';
    matchesConfiguredPathMock
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    rewriteMock.mockImplementation((url, init) => ({ type: 'rewrite', url: url.toString(), init }));

    expect(middleware(request('analytics.amami.dev', '/collect'))).toMatchObject({
      type: 'rewrite',
      url: 'https://analytics.amami.dev/api/send',
    });
    expect(middleware(request('analytics.amami.dev', '/analytics.js'))).toMatchObject({
      type: 'rewrite',
      url: 'https://analytics.amami.dev/script.js',
    });
  });

  test('rewrites the tracker URL and blocks login when configured', () => {
    process.env.TRACKER_SCRIPT_URL = 'https://cdn.example/script.js';
    matchesConfiguredPathMock.mockReturnValue(true);
    rewriteMock.mockImplementation((url, init) => ({ type: 'rewrite', url, init }));
    expect(middleware(request('analytics.amami.dev', '/script.js'))).toMatchObject({
      type: 'rewrite',
      url: 'https://cdn.example/script.js',
    });

    delete process.env.TRACKER_SCRIPT_URL;
    process.env.DISABLE_LOGIN = '1';
    const denied = middleware(request('analytics.amami.dev', '/login')) as Response;
    expect(denied.status).toBe(403);
    delete process.env.DISABLE_LOGIN;
  });
});
