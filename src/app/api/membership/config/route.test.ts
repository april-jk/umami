import { expect, test, vi } from 'vitest';
import { createDefaultMembershipConfig } from '@/lib/membership-config';
import { getMembershipConfigRecord } from '@/queries/prisma/membership-config';
import { GET } from './route';

vi.mock('@/queries/prisma/membership-config', () => ({ getMembershipConfigRecord: vi.fn() }));

test('returns the public membership configuration without admin metadata', async () => {
  const config = createDefaultMembershipConfig();
  vi.mocked(getMembershipConfigRecord).mockResolvedValue({
    config,
    source: 'database',
    version: 3,
    updatedAt: new Date('2026-07-12T00:00:00.000Z'),
    updatedBy: 'admin-1',
  });

  const response = await GET();
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data).toMatchObject({ config, version: 3, updatedAt: '2026-07-12T00:00:00.000Z' });
  expect(data.updatedBy).toBeUndefined();
});
