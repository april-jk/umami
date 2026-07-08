import { beforeEach, expect, test, vi } from 'vitest';
import { createAuthToken } from '@/lib/auth';
import { parseRequest } from '@/lib/request';
import { createRegisteredUser, getAllUserTeams, getUserByUsername } from '@/queries/prisma';
import { POST } from './route';

vi.mock('@/lib/auth', () => ({
  createAuthToken: vi.fn(),
}));

vi.mock('@/lib/password', () => ({
  hashPassword: vi.fn((password: string) => `hashed:${password}`),
}));

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  createRegisteredUser: vi.fn(),
  getAllUserTeams: vi.fn(),
  getUserByUsername: vi.fn(),
}));

const createAuthTokenMock = vi.mocked(createAuthToken);
const parseRequestMock = vi.mocked(parseRequest);
const createRegisteredUserMock = vi.mocked(createRegisteredUser);
const getAllUserTeamsMock = vi.mocked(getAllUserTeams);
const getUserByUsernameMock = vi.mocked(getUserByUsername);

beforeEach(() => {
  createAuthTokenMock.mockReset();
  parseRequestMock.mockReset();
  createRegisteredUserMock.mockReset();
  getAllUserTeamsMock.mockReset();
  getUserByUsernameMock.mockReset();
});

test('POST registers a user, provisions their tenant, and returns an auth token', async () => {
  parseRequestMock.mockResolvedValue({
    body: {
      username: 'NewUser',
      password: 'password123',
    },
    error: undefined,
  });
  getUserByUsernameMock.mockResolvedValue(null);
  createRegisteredUserMock.mockResolvedValue({
    id: 'user-1',
    username: 'newuser',
    password: 'hashed:password123',
    role: 'user',
    createdAt: new Date('2026-07-08T00:00:00.000Z'),
  } as any);
  createAuthTokenMock.mockResolvedValue('auth-token');
  getAllUserTeamsMock.mockResolvedValue([]);

  const response = await POST(
    new Request('http://localhost/api/auth/register', { method: 'POST' }),
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(getUserByUsernameMock).toHaveBeenCalledWith('newuser', { showDeleted: true });
  expect(createRegisteredUserMock).toHaveBeenCalledWith({
    username: 'newuser',
    password: 'hashed:password123',
  });
  expect(body.token).toBe('auth-token');
  expect(body.user).toMatchObject({
    id: 'user-1',
    username: 'newuser',
    role: 'user',
    isAdmin: false,
    teams: [],
  });
});

test('POST rejects duplicate usernames before provisioning a tenant', async () => {
  parseRequestMock.mockResolvedValue({
    body: {
      username: 'ExistingUser',
      password: 'password123',
    },
    error: undefined,
  });
  getUserByUsernameMock.mockResolvedValue({ id: 'user-1' } as any);

  const response = await POST(
    new Request('http://localhost/api/auth/register', { method: 'POST' }),
  );
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body.error.code).toBe('user-exists');
  expect(createRegisteredUserMock).not.toHaveBeenCalled();
  expect(createAuthTokenMock).not.toHaveBeenCalled();
});
