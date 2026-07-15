import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

const { checkAuthMock } = vi.hoisted(() => ({ checkAuthMock: vi.fn() }));

vi.mock('@/lib/auth', () => ({ checkAuth: checkAuthMock }));

const runIntegrationTests = process.env.RUN_DATABASE_INTEGRATION_TESTS === '1';
const integration = describe.skipIf(!runIntegrationTests);

function request(method: string, path: string, body?: Record<string, unknown>) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

integration('activation code admin API with PostgreSQL', () => {
  let createdId: string | undefined;
  let prisma: typeof import('@/lib/prisma').default;
  let collectionRoute: typeof import('./route');
  let detailRoute: typeof import('./[activationCodeId]/route');

  beforeAll(async () => {
    prisma = (await import('@/lib/prisma')).default;
    collectionRoute = await import('./route');
    detailRoute = await import('./[activationCodeId]/route');
  });

  afterAll(async () => {
    if (createdId) {
      await prisma.client.activationCode.deleteMany({ where: { id: createdId } });
    }
    await prisma.client.$disconnect();
  });

  test('creates, reads, updates, and deletes a code through the real business stack', async () => {
    const admin = await prisma.client.user.findFirst({
      where: { role: 'admin', deletedAt: null },
      select: { id: true },
    });
    if (!admin) throw new Error('The integration database must contain an admin user.');
    checkAuthMock.mockResolvedValue({ user: { id: admin.id, isAdmin: true } });

    const startsAt = new Date(Date.now() + 60_000);
    const expiresAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);
    const createResponse = await collectionRoute.POST(
      request('POST', '/api/admin/activation-codes', {
        name: null,
        note: null,
        plan: 'pro',
        durationDays: 30,
        startsAt: startsAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        maxRedemptions: 2,
        status: 'active',
      }),
    );
    expect(createResponse.status).toBe(200);

    const created = await createResponse.json();
    const activationCodeId = String(created.id);
    createdId = activationCodeId;
    expect(created.code).toMatch(/^AMAMI-/);
    expect(created).not.toHaveProperty('codeHash');

    const stored = await prisma.client.activationCode.findUnique({
      where: { id: activationCodeId },
    });
    expect(stored).toMatchObject({
      name: null,
      note: null,
      plan: 'pro',
      durationDays: 30,
      maxRedemptions: 2,
      redemptionCount: 0,
    });
    expect(stored?.codeHash).not.toContain(created.code.replaceAll('-', ''));
    expect(stored?.codeValue).toBe(created.code);
    if (!stored) throw new Error('The created activation code was not persisted.');

    const listResponse = await collectionRoute.GET(
      request('GET', `/api/admin/activation-codes?search=${stored.codePrefix}`),
    );
    expect(listResponse.status).toBe(200);
    const list = await listResponse.json();
    expect(list.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: activationCodeId, code: created.code }),
      ]),
    );

    const params = Promise.resolve({ activationCodeId });
    const detailResponse = await detailRoute.GET(request('GET', ''), { params });
    expect(detailResponse.status).toBe(200);
    expect(await detailResponse.json()).toMatchObject({
      id: activationCodeId,
      code: created.code,
      redemptions: [],
    });
    const repeatedDetailResponse = await detailRoute.GET(request('GET', ''), { params });
    expect(await repeatedDetailResponse.json()).toMatchObject({
      id: activationCodeId,
      code: created.code,
    });

    const updateResponse = await detailRoute.PUT(
      request('PUT', '', { name: 'Integration test', note: null, maxRedemptions: 3 }),
      { params },
    );
    expect(updateResponse.status).toBe(200);
    expect(await updateResponse.json()).toMatchObject({
      id: activationCodeId,
      name: 'Integration test',
      note: null,
      maxRedemptions: 3,
    });

    const deleteResponse = await detailRoute.DELETE(request('DELETE', ''), { params });
    expect(deleteResponse.status).toBe(200);
    const deleted = await prisma.client.activationCode.findUnique({
      where: { id: activationCodeId },
    });
    expect(deleted?.deletedAt).toBeInstanceOf(Date);
    expect(deleted?.status).toBe('disabled');
  });
});
