import { z } from 'zod';
import { createAuthToken } from '@/lib/auth';
import { ROLES } from '@/lib/constants';
import { hashPassword } from '@/lib/password';
import { parseRequest } from '@/lib/request';
import { badRequest, json } from '@/lib/response';
import {
  createRegisteredUser,
  getAllUserTeams,
  getUserByEmail,
  getUserByUsername,
} from '@/queries/prisma';

export async function POST(request: Request) {
  const schema = z.object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(255)
      .regex(/^[a-zA-Z0-9._@-]+$/),
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(255),
  });

  const { body, error } = await parseRequest(request, schema, { skipAuth: true });

  if (error) {
    return error();
  }

  const username = body.username.toLowerCase();
  const email = body.email.toLowerCase();
  const [existingUser, existingEmail] = await Promise.all([
    getUserByUsername(username, { showDeleted: true }),
    getUserByEmail(email, { showDeleted: true }),
  ]);

  if (existingUser) {
    return badRequest({ message: 'User already exists', code: 'user-exists' });
  }

  if (existingEmail) {
    return badRequest({ message: 'Email already exists', code: 'email-exists' });
  }

  try {
    const user = await createRegisteredUser({
      username,
      email,
      password: hashPassword(body.password),
    });
    const token = await createAuthToken(user);
    const teams = await getAllUserTeams(user.id);

    return json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        isAdmin: user.role === ROLES.admin,
        teams,
      },
    });
  } catch (error) {
    if ((error as any)?.code === 'P2002') {
      return badRequest({ message: 'User already exists', code: 'user-exists' });
    }

    throw error;
  }
}
