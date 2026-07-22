import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { assertIndependentServiceUrl, isUpstreamServiceUrl } from './upstream-url';

const UPSTREAM_DOMAIN = new RegExp(`(?:[a-z0-9-]+\\.)?${['umami', 'is'].join('\\.')}`, 'i');
const UPSTREAM_GITHUB_ORG = new RegExp(['umami', 'software'].join('-'), 'i');
const UPSTREAM_DOCKER_IMAGE = new RegExp(`${['umami', 'software'].join('')}/umami`, 'i');
const ALLOWED_FILES = new Set(['LICENSE', 'src/lib/upstream-isolation.test.ts']);

test('tracked product files do not contact or direct users to upstream infrastructure', () => {
  const files = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    {
      encoding: 'utf8',
    },
  )
    .split('\0')
    .filter(Boolean)
    .filter(existsSync)
    .filter(file => !ALLOWED_FILES.has(file));

  const violations = files.flatMap(file => {
    const content = readFileSync(file);

    if (content.includes(0)) {
      return [];
    }

    const text = content.toString('utf8');
    const matches = [UPSTREAM_DOMAIN, UPSTREAM_GITHUB_ORG, UPSTREAM_DOCKER_IMAGE]
      .filter(pattern => pattern.test(text))
      .map(pattern => pattern.source);

    return matches.length ? [`${file}: ${matches.join(', ')}`] : [];
  });

  expect(violations).toEqual([]);
});

test('rejects upstream service URLs while allowing Amami and relative URLs', () => {
  expect(isUpstreamServiceUrl()).toBe(false);
  expect(isUpstreamServiceUrl('/api')).toBe(false);
  expect(isUpstreamServiceUrl('https://analytics.amami.dev/script.js')).toBe(false);
  expect(isUpstreamServiceUrl('https://umami.is')).toBe(true);
  expect(isUpstreamServiceUrl('https://cloud.umami.is/script.js')).toBe(true);

  expect(() => assertIndependentServiceUrl('API_URL', 'https://api.umami.is')).toThrow(
    'API_URL must not reference the original project infrastructure',
  );
});

test('pins the temporary upstream UI dependency to an audited version', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  expect(packageJson.dependencies['@umami/react-zen']).toBe('0.245.0');
});
