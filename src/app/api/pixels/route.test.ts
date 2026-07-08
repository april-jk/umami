import { beforeEach, expect, test, vi } from 'vitest';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { canCreateTeamWebsite, canCreateWebsite } from '@/permissions';
import { createPixel, getAllUserPixelsIncludingTeamAccess, getUserPixels } from '@/queries/prisma';
import { getDefaultTenantIdForUser } from '@/queries/prisma/tenant';
import { GET, POST } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
  getQueryFilters: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/permissions', () => ({
  canCreateTeamWebsite: vi.fn(),
  canCreateWebsite: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  createPixel: vi.fn(),
  getAllUserPixelsIncludingTeamAccess: vi.fn(),
  getUserPixels: vi.fn(),
}));

vi.mock('@/queries/prisma/tenant', () => ({
  getDefaultTenantIdForUser: vi.fn(),
  getTenantIdForTeam: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const getQueryFiltersMock = vi.mocked(getQueryFilters);
const canCreateTeamWebsiteMock = vi.mocked(canCreateTeamWebsite);
const canCreateWebsiteMock = vi.mocked(canCreateWebsite);
const createPixelMock = vi.mocked(createPixel);
const getAllUserPixelsIncludingTeamAccessMock = vi.mocked(getAllUserPixelsIncludingTeamAccess);
const getUserPixelsMock = vi.mocked(getUserPixels);
const getDefaultTenantIdForUserMock = vi.mocked(getDefaultTenantIdForUser);

beforeEach(() => {
  parseRequestMock.mockReset();
  getQueryFiltersMock.mockReset();
  canCreateTeamWebsiteMock.mockReset();
  canCreateWebsiteMock.mockReset();
  createPixelMock.mockReset();
  getAllUserPixelsIncludingTeamAccessMock.mockReset();
  getUserPixelsMock.mockReset();
  getDefaultTenantIdForUserMock.mockReset();
});

test('GET returns only the authenticated user pixels by default', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    query: {},
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({ page: 1 });
  getUserPixelsMock.mockResolvedValue([{ id: 'pixel-1' }] as any);

  const response = await GET(new Request('http://localhost/api/pixels'));

  expect(response.status).toBe(200);
  expect(getUserPixelsMock).toHaveBeenCalledWith('user-1', { page: 1 });
  expect(getAllUserPixelsIncludingTeamAccessMock).not.toHaveBeenCalled();
});

test('GET can include pixels from teams the authenticated user belongs to', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    query: { includeTeams: '1' },
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({ page: 1 });
  getAllUserPixelsIncludingTeamAccessMock.mockResolvedValue([{ id: 'team-pixel-1' }] as any);

  const response = await GET(new Request('http://localhost/api/pixels?includeTeams=1'));

  expect(response.status).toBe(200);
  expect(getAllUserPixelsIncludingTeamAccessMock).toHaveBeenCalledWith('user-1', { page: 1 });
  expect(getUserPixelsMock).not.toHaveBeenCalled();
});

test('POST creates pixels inside the authenticated user tenant', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {
      name: 'Campaign Pixel',
      slug: 'campaign',
    },
    error: undefined,
  });
  canCreateWebsiteMock.mockResolvedValue(true);
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  createPixelMock.mockResolvedValue({ id: 'pixel-1' } as any);

  const response = await POST(new Request('http://localhost/api/pixels', { method: 'POST' }));

  expect(response.status).toBe(200);
  expect(createPixelMock).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: 'user-1',
      tenantId: 'tenant-1',
      name: 'Campaign Pixel',
      slug: 'campaign',
    }),
  );
});

test('POST rejects creating pixels in teams the user cannot create assets in', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {
      name: 'Campaign Pixel',
      slug: 'campaign',
      teamId: 'team-2',
    },
    error: undefined,
  });
  canCreateTeamWebsiteMock.mockResolvedValue(false);
  canCreateWebsiteMock.mockResolvedValue(true);

  const response = await POST(new Request('http://localhost/api/pixels', { method: 'POST' }));

  expect(response.status).toBe(401);
  expect(createPixelMock).not.toHaveBeenCalled();
});
