import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { createBoard, getBoard } from '@/queries/prisma';
import { getDefaultTenantIdForUser } from '@/queries/prisma/tenant';
import { POST } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  createBoard: vi.fn(),
  getBoard: vi.fn(),
  updateBoard: vi.fn(),
}));

vi.mock('@/queries/prisma/tenant', () => ({
  getDefaultTenantIdForUser: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const createBoardMock = vi.mocked(createBoard);
const getBoardMock = vi.mocked(getBoard);
const getDefaultTenantIdForUserMock = vi.mocked(getDefaultTenantIdForUser);

beforeEach(() => {
  parseRequestMock.mockReset();
  createBoardMock.mockReset();
  getBoardMock.mockReset();
  getDefaultTenantIdForUserMock.mockReset();
});

test('POST creates the dashboard board inside the authenticated user tenant', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {
      name: 'Dashboard',
      description: 'Default dashboard',
      parameters: {},
    },
    error: undefined,
  });
  getBoardMock.mockResolvedValue(null);
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  createBoardMock.mockResolvedValue({ id: 'user-1' } as any);

  const response = await POST(new Request('http://localhost/api/dashboard', { method: 'POST' }));

  expect(response.status).toBe(200);
  expect(createBoardMock).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'user-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      type: 'dashboard',
      parameters: {},
    }),
  );
});
