import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json } from '@/lib/response';
import { createApiKey, getUserApiKeys } from '@/queries/prisma/apiKey';

export async function GET(request: Request) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  return json(await getUserApiKeys(auth.user.id));
}

export async function POST(request: Request) {
  const schema = z.object({
    name: z.string().trim().min(1).max(100),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  return json(await createApiKey(auth.user.id, body.name));
}
