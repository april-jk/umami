import { beforeEach, expect, test, vi } from 'vitest';
import { createAuthToken } from '@/lib/auth';
import { parseRequest } from '@/lib/request';
import {
  createRegisteredUser,
  getAllUserTeams,
  getUserByEmail,
  getUserByUsername,
} from '@/queries/prisma';
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
  getUserByEmail: vi.fn(),
  getUserByUsername: vi.fn(),
}));

const createAuthTokenMock = vi.mocked(createAuthToken);
const parseRequestMock = vi.mocked(parseRequest);
const createRegisteredUserMock = vi.mocked(createRegisteredUser);
const getAllUserTeamsMock = vi.mocked(getAllUserTeams);
const getUserByEmailMock = vi.mocked(getUserByEmail);
const getUserByUsernameMock = vi.mocked(getUserByUsername);

beforeEach(() => {
  createAuthTokenMock.mockReset();
  parseRequestMock.mockReset();
  createRegisteredUserMock.mockReset();
  getAllUserTeamsMock.mockReset();
  getUserByEmailMock.mockReset();
  getUserByUsernameMock.mockReset();
});

test('POST registers a user, provisions their tenant, and returns an auth token', async () => {
  parseRequestMock.mockResolvedValue({
    body: {
      username: 'NewUser',
      email: 'New@Example.com',
      password: 'password123',
    },
    error: undefined,
  });
  getUserByUsernameMock.mockResolvedValue(null);
  getUserByEmailMock.mockResolvedValue(null);
  createRegisteredUserMock.mockResolvedValue({
    id: 'user-1',
    username: 'newuser',
    email: 'new@example.com',
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
  expect(getUserByEmailMock).toHaveBeenCalledWith('new@example.com', { showDeleted: true });
  expect(createRegisteredUserMock).toHaveBeenCalledWith({
    username: 'newuser',
    email: 'new@example.com',
    password: 'hashed:password123',
  });
  expect(body.token).toBe('auth-token');
  expect(body.user).toMatchObject({
    id: 'user-1',
    username: 'newuser',
    email: 'new@example.com',
    role: 'user',
    isAdmin: false,
    teams: [],
  });
});

test('POST rejects duplicate usernames before provisioning a tenant', async () => {
  parseRequestMock.mockResolvedValue({
    body: {
      username: 'ExistingUser',
      email: 'new@example.com',
      password: 'password123',
    },
    error: undefined,
  });
  getUserByUsernameMock.mockResolvedValue({ id: 'user-1' } as any);
  getUserByEmailMock.mockResolvedValue(null);

  const response = await POST(
    new Request('http://localhost/api/auth/register', { method: 'POST' }),
  );
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body.error.code).toBe('user-exists');
  expect(createRegisteredUserMock).not.toHaveBeenCalled();
  expect(createAuthTokenMock).not.toHaveBeenCalled();
});

test('POST rejects a duplicate email before provisioning a tenant', async () => {
  parseRequestMock.mockResolvedValue({
    body: { username: 'NewUser', email: 'Existing@Example.com', password: 'password123' },
    error: undefined,
  });
  getUserByUsernameMock.mockResolvedValue(null);
  getUserByEmailMock.mockResolvedValue({ id: 'user-1' } as any);

  const response = await POST(
    new Request('http://localhost/api/auth/register', { method: 'POST' }),
  );

  expect(response.status).toBe(400);
  expect((await response.json()).error.code).toBe('email-exists');
  expect(createRegisteredUserMock).not.toHaveBeenCalled();
});

test('POST returns request validation errors without checking identity availability', async () => {
  const error = () => new Response(null, { status: 400 });
  parseRequestMock.mockResolvedValue({ error });

  const response = await POST(
    new Request('http://localhost/api/auth/register', { method: 'POST' }),
  );

  expect(response.status).toBe(400);
  expect(getUserByUsernameMock).not.toHaveBeenCalled();
  expect(getUserByEmailMock).not.toHaveBeenCalled();
});

test('POST safely rejects a concurrent identity creation conflict', async () => {
  parseRequestMock.mockResolvedValue({
    body: { username: 'NewUser', email: 'new@example.com', password: 'password123' },
    error: undefined,
  });
  getUserByUsernameMock.mockResolvedValue(null);
  getUserByEmailMock.mockResolvedValue(null);
  createRegisteredUserMock.mockRejectedValue({ code: 'P2002' });

  const response = await POST(
    new Request('http://localhost/api/auth/register', { method: 'POST' }),
  );

  expect(response.status).toBe(400);
  expect((await response.json()).error.code).toBe('user-exists');
});

test('POST propagates unexpected provisioning failures', async () => {
  parseRequestMock.mockResolvedValue({
    body: { username: 'NewUser', email: 'new@example.com', password: 'password123' },
    error: undefined,
  });
  getUserByUsernameMock.mockResolvedValue(null);
  getUserByEmailMock.mockResolvedValue(null);
  createRegisteredUserMock.mockRejectedValue(new Error('database unavailable'));

  await expect(
    POST(new Request('http://localhost/api/auth/register', { method: 'POST' })),
  ).rejects.toThrow('database unavailable');
});
