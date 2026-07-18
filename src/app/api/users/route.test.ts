import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canCreateUser } from '@/permissions';
import { createUser, getUserByEmail, getUserByUsername } from '@/queries/prisma';
import { POST } from './route';

vi.mock('@/permissions', () => ({ canCreateUser: vi.fn() }));
vi.mock('@/lib/crypto', () => ({ uuid: vi.fn(() => 'new-user-id') }));
vi.mock('@/lib/password', () => ({ hashPassword: vi.fn(password => `hash:${password}`) }));
vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/queries/prisma', () => ({
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserByUsername: vi.fn(),
}));

const canCreateUserMock = vi.mocked(canCreateUser);
const createUserMock = vi.mocked(createUser);
const getUserByEmailMock = vi.mocked(getUserByEmail);
const getUserByUsernameMock = vi.mocked(getUserByUsername);
const parseRequestMock = vi.mocked(parseRequest);

const request = () => new Request('http://localhost/api/users', { method: 'POST' });
const body = {
  username: 'AdminCreated',
  email: 'Admin@Example.com',
  password: 'password123',
  role: 'user',
};

beforeEach(() => {
  canCreateUserMock.mockReset();
  createUserMock.mockReset();
  getUserByEmailMock.mockReset();
  getUserByUsernameMock.mockReset();
  parseRequestMock.mockReset();
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'admin-id' } },
    body,
    error: undefined,
  });
  canCreateUserMock.mockResolvedValue(true);
  getUserByEmailMock.mockResolvedValue(null);
  getUserByUsernameMock.mockResolvedValue(null);
});

test('POST creates an admin-managed user with a normalized unique email', async () => {
  createUserMock.mockResolvedValue({ id: 'new-user-id', username: 'admincreated' } as any);

  const response = await POST(request());

  expect(response.status).toBe(200);
  expect(getUserByUsernameMock).toHaveBeenCalledWith('AdminCreated', { showDeleted: true });
  expect(getUserByEmailMock).toHaveBeenCalledWith('Admin@Example.com', { showDeleted: true });
  expect(createUserMock).toHaveBeenCalledWith({
    id: 'new-user-id',
    username: 'admincreated',
    email: 'admin@example.com',
    password: 'hash:password123',
    role: 'user',
  });
});

test('POST rejects duplicate usernames and emails before creating a user', async () => {
  getUserByUsernameMock.mockResolvedValue({ id: 'existing-user' } as any);

  const duplicateUsername = await POST(request());

  expect(duplicateUsername.status).toBe(400);
  expect(createUserMock).not.toHaveBeenCalled();

  getUserByUsernameMock.mockResolvedValue(null);
  getUserByEmailMock.mockResolvedValue({ id: 'existing-user' } as any);

  const duplicateEmail = await POST(request());

  expect(duplicateEmail.status).toBe(400);
  expect(createUserMock).not.toHaveBeenCalled();
});

test('POST enforces admin authorization and request validation', async () => {
  canCreateUserMock.mockResolvedValue(false);
  const unauthorized = await POST(request());
  expect(unauthorized.status).toBe(401);

  const error = () => new Response(null, { status: 400 });
  parseRequestMock.mockResolvedValue({ error });
  const invalid = await POST(request());
  expect(invalid.status).toBe(400);
});
