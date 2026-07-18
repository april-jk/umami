import { getMcpClientMetadata } from '@/lib/mcp-client-access';
import { getMcpClientPolicy } from '@/lib/mcp-client-policy';
import { parseRequest } from '@/lib/request';
import { forbidden, json } from '@/lib/response';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { auth, error } = await parseRequest(request);

  if (error) return error();

  if (auth.apiKeyClientType !== 'mcp' || !request.headers.has('x-amami-mcp-client')) {
    return forbidden({
      message: 'MCP client policy requires an MCP installation API key and client metadata',
      code: 'mcp-client-required',
    });
  }

  const metadata = getMcpClientMetadata(request);

  return json(await getMcpClientPolicy(metadata.clientVersion));
}
