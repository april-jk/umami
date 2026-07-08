import { parseRequest } from '@/lib/request';
import { notFound, ok } from '@/lib/response';
import { deleteUserApiKey } from '@/queries/prisma/apiKey';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ apiKeyId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { apiKeyId } = await params;
  const deleted = await deleteUserApiKey(auth.user.id, apiKeyId);

  if (!deleted) {
    return notFound();
  }

  return ok();
}
