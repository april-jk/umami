import { beforeEach, expect, test, vi } from 'vitest';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { canCreateTeamWebsite, canCreateWebsite } from '@/permissions';
import { createLink, getAllUserLinksIncludingTeamAccess, getUserLinks } from '@/queries/prisma';
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
  createLink: vi.fn(),
  getAllUserLinksIncludingTeamAccess: vi.fn(),
  getUserLinks: vi.fn(),
}));

vi.mock('@/queries/prisma/tenant', () => ({
  getDefaultTenantIdForUser: vi.fn(),
  getTenantIdForTeam: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const getQueryFiltersMock = vi.mocked(getQueryFilters);
const canCreateTeamWebsiteMock = vi.mocked(canCreateTeamWebsite);
const canCreateWebsiteMock = vi.mocked(canCreateWebsite);
const createLinkMock = vi.mocked(createLink);
const getAllUserLinksIncludingTeamAccessMock = vi.mocked(getAllUserLinksIncludingTeamAccess);
const getUserLinksMock = vi.mocked(getUserLinks);
const getDefaultTenantIdForUserMock = vi.mocked(getDefaultTenantIdForUser);

beforeEach(() => {
  parseRequestMock.mockReset();
  getQueryFiltersMock.mockReset();
  canCreateTeamWebsiteMock.mockReset();
  canCreateWebsiteMock.mockReset();
  createLinkMock.mockReset();
  getAllUserLinksIncludingTeamAccessMock.mockReset();
  getUserLinksMock.mockReset();
  getDefaultTenantIdForUserMock.mockReset();
});

test('GET returns only the authenticated user links by default', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    query: {},
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({ page: 1 });
  getUserLinksMock.mockResolvedValue([{ id: 'link-1' }] as any);

  const response = await GET(new Request('http://localhost/api/links'));

  expect(response.status).toBe(200);
  expect(getUserLinksMock).toHaveBeenCalledWith('user-1', { page: 1 });
  expect(getAllUserLinksIncludingTeamAccessMock).not.toHaveBeenCalled();
});

test('GET can include links from teams the authenticated user belongs to', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    query: { includeTeams: '1' },
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({ page: 1 });
  getAllUserLinksIncludingTeamAccessMock.mockResolvedValue([{ id: 'team-link-1' }] as any);

  const response = await GET(new Request('http://localhost/api/links?includeTeams=1'));

  expect(response.status).toBe(200);
  expect(getAllUserLinksIncludingTeamAccessMock).toHaveBeenCalledWith('user-1', { page: 1 });
  expect(getUserLinksMock).not.toHaveBeenCalled();
});

test('POST creates links inside the authenticated user tenant', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {
      name: 'Docs',
      url: 'https://example.com/docs',
      slug: 'docs',
    },
    error: undefined,
  });
  canCreateWebsiteMock.mockResolvedValue(true);
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  createLinkMock.mockResolvedValue({ id: 'link-1' } as any);

  const response = await POST(new Request('http://localhost/api/links', { method: 'POST' }));

  expect(response.status).toBe(200);
  expect(createLinkMock).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: 'user-1',
      tenantId: 'tenant-1',
      name: 'Docs',
      slug: 'docs',
    }),
  );
});

test('POST rejects creating links in teams the user cannot create assets in', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {
      name: 'Docs',
      url: 'https://example.com/docs',
      slug: 'docs',
      teamId: 'team-2',
    },
    error: undefined,
  });
  canCreateTeamWebsiteMock.mockResolvedValue(false);
  canCreateWebsiteMock.mockResolvedValue(true);

  const response = await POST(new Request('http://localhost/api/links', { method: 'POST' }));

  expect(response.status).toBe(401);
  expect(createLinkMock).not.toHaveBeenCalled();
});
