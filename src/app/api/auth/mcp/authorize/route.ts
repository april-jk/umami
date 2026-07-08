import { z } from 'zod';
import { badRedirectUri, createMcpAuthorizationCode, isLoopbackRedirectUri } from '@/lib/mcp-auth';
import { parseRequest } from '@/lib/request';
import { json } from '@/lib/response';

export async function POST(request: Request) {
  const schema = z.object({
    redirectUri: z.string().url(),
    state: z.string().min(16).max(512),
    codeChallenge: z.string().min(32).max(256),
    codeChallengeMethod: z.literal('S256').default('S256'),
    write: z.boolean().optional().default(true),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  if (!isLoopbackRedirectUri(body.redirectUri)) {
    return badRedirectUri();
  }

  const code = await createMcpAuthorizationCode({
    userId: auth.user.id,
    codeChallenge: body.codeChallenge,
    codeChallengeMethod: body.codeChallengeMethod,
    write: body.write,
  });
  const redirectUrl = new URL(body.redirectUri);

  redirectUrl.searchParams.set('code', code);
  redirectUrl.searchParams.set('state', body.state);

  return json({
    redirectUrl: redirectUrl.toString(),
    expiresIn: 300,
  });
}
