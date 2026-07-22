import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json } from '@/lib/response';
import { getUserMcpUsage } from '@/queries/prisma/mcp-client-access';

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export async function GET(request: Request) {
  const { auth, query, error } = await parseRequest(request, querySchema);

  if (error) {
    return error();
  }

  return json(await getUserMcpUsage(auth.user.id, query));
}
