import { beforeEach, expect, test, vi } from 'vitest';
import { ROLES } from '@/lib/constants';
import { getEntity } from '@/lib/entity';
import type { Auth } from '@/lib/types';
import { getBoard, getLink, getPixel, getTeamUser, getWebsite } from '@/queries/prisma';
import { canDeleteBoard, canUpdateBoard, canViewBoard } from './board';
import { canDeleteLink, canUpdateLink, canViewLink } from './link';
import { canDeletePixel, canUpdatePixel, canViewPixel } from './pixel';
import { canCreateTeam, canViewTeam } from './team';
import {
  canCreateWebsite,
  canDeleteWebsite,
  canUpdateWebsite,
  canViewWebsite,
} from './website';

vi.mock('@/lib/entity', () => ({
  getEntity: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  getBoard: vi.fn(),
  getLink: vi.fn(),
  getPixel: vi.fn(),
  getTeamUser: vi.fn(),
  getWebsite: vi.fn(),
}));

const auth: Auth = {
  user: {
    id: 'registered-user',
    username: 'registered-user',
    role: ROLES.user,
    isAdmin: false,
  },
};

const otherUserId = 'other-user';

const getEntityMock = vi.mocked(getEntity);
const getWebsiteMock = vi.mocked(getWebsite);
const getLinkMock = vi.mocked(getLink);
const getPixelMock = vi.mocked(getPixel);
const getBoardMock = vi.mocked(getBoard);
const getTeamUserMock = vi.mocked(getTeamUser);

beforeEach(() => {
  getEntityMock.mockReset();
  getWebsiteMock.mockReset();
  getLinkMock.mockReset();
  getPixelMock.mockReset();
  getBoardMock.mockReset();
  getTeamUserMock.mockReset();
});

test('registered users keep the original single-user create permissions', async () => {
  await expect(canCreateWebsite(auth)).resolves.toBe(true);
  await expect(canCreateTeam(auth)).resolves.toBe(true);
});

test('registered users can view, update, and delete their own websites', async () => {
  getEntityMock.mockResolvedValue({ id: 'website-1', userId: auth.user.id } as any);
  getWebsiteMock.mockResolvedValue({ id: 'website-1', userId: auth.user.id } as any);

  await expect(canViewWebsite(auth, 'website-1')).resolves.toBe(true);
  await expect(canUpdateWebsite(auth, 'website-1')).resolves.toBe(true);
  await expect(canDeleteWebsite(auth, 'website-1')).resolves.toBe(true);
});

test('registered users cannot access another user website', async () => {
  getEntityMock.mockResolvedValue({ id: 'website-1', userId: otherUserId } as any);
  getWebsiteMock.mockResolvedValue({ id: 'website-1', userId: otherUserId } as any);

  await expect(canViewWebsite(auth, 'website-1')).resolves.toBe(false);
  await expect(canUpdateWebsite(auth, 'website-1')).resolves.toBe(false);
  await expect(canDeleteWebsite(auth, 'website-1')).resolves.toBe(false);
});

test('registered users can manage their own links, pixels, and boards', async () => {
  getLinkMock.mockResolvedValue({ id: 'link-1', userId: auth.user.id } as any);
  getPixelMock.mockResolvedValue({ id: 'pixel-1', userId: auth.user.id } as any);
  getBoardMock.mockResolvedValue({ id: 'board-1', userId: auth.user.id } as any);

  await expect(canViewLink(auth, 'link-1')).resolves.toBe(true);
  await expect(canUpdateLink(auth, 'link-1')).resolves.toBe(true);
  await expect(canDeleteLink(auth, 'link-1')).resolves.toBe(true);
  await expect(canViewPixel(auth, 'pixel-1')).resolves.toBe(true);
  await expect(canUpdatePixel(auth, 'pixel-1')).resolves.toBe(true);
  await expect(canDeletePixel(auth, 'pixel-1')).resolves.toBe(true);
  await expect(canViewBoard(auth, 'board-1')).resolves.toBe(true);
  await expect(canUpdateBoard(auth, 'board-1')).resolves.toBe(true);
  await expect(canDeleteBoard(auth, 'board-1')).resolves.toBe(true);
});

test('registered users cannot manage another user links, pixels, or boards', async () => {
  getLinkMock.mockResolvedValue({ id: 'link-1', userId: otherUserId } as any);
  getPixelMock.mockResolvedValue({ id: 'pixel-1', userId: otherUserId } as any);
  getBoardMock.mockResolvedValue({ id: 'board-1', userId: otherUserId } as any);

  await expect(canViewLink(auth, 'link-1')).resolves.toBe(false);
  await expect(canUpdateLink(auth, 'link-1')).resolves.toBe(false);
  await expect(canDeleteLink(auth, 'link-1')).resolves.toBe(false);
  await expect(canViewPixel(auth, 'pixel-1')).resolves.toBe(false);
  await expect(canUpdatePixel(auth, 'pixel-1')).resolves.toBe(false);
  await expect(canDeletePixel(auth, 'pixel-1')).resolves.toBe(false);
  await expect(canViewBoard(auth, 'board-1')).resolves.toBe(false);
  await expect(canUpdateBoard(auth, 'board-1')).resolves.toBe(false);
  await expect(canDeleteBoard(auth, 'board-1')).resolves.toBe(false);
});

test('registered users can view teams only when they are members', async () => {
  getTeamUserMock.mockResolvedValueOnce({ id: 'team-user-1' } as any).mockResolvedValueOnce(null);

  await expect(canViewTeam(auth, 'team-1')).resolves.toBeTruthy();
  await expect(canViewTeam(auth, 'team-2')).resolves.toBeNull();
});
