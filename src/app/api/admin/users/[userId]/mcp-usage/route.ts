import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { getUserMcpUsage } from '@/queries/prisma/mcp-client-access';

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { auth, query, error } = await parseRequest(request, querySchema);

  if (error) {
    return error();
  }

  if (!auth.user.isAdmin) {
    return unauthorized({ message: 'Only admins can view user MCP usage.' });
  }

  const { userId } = await params;

  return json(await getUserMcpUsage(userId, query));
}
