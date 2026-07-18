import { z } from 'zod';
import { ROLES } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import { hashPassword } from '@/lib/password';
import { parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import { userRoleParam } from '@/lib/schema';
import { canCreateUser } from '@/permissions';
import { createUser, getUserByEmail, getUserByUsername } from '@/queries/prisma';

export async function POST(request: Request) {
  const schema = z.object({
    id: z.uuid().optional(),
    username: z.string().max(255),
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(255),
    role: userRoleParam,
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  if (!(await canCreateUser(auth))) {
    return unauthorized();
  }

  const { id, username, email, password, role } = body;

  const [existingUser, existingEmail] = await Promise.all([
    getUserByUsername(username, { showDeleted: true }),
    getUserByEmail(email, { showDeleted: true }),
  ]);

  if (existingUser) {
    return badRequest({ message: 'User already exists' });
  }

  if (existingEmail) {
    return badRequest({ message: 'Email already exists' });
  }

  const user = await createUser({
    id: id || uuid(),
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password: hashPassword(password),
    role: role ?? ROLES.user,
  });

  return json(user);
}
