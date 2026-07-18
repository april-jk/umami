import { hash, uuid } from '@/lib/crypto';
import { getIpAddress } from '@/lib/ip';

const CLIENT_NAME_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const SEMVER_RE = /^v?(0|[1-9]\d*)(?:\.(0|[1-9]\d*)){2}(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const MAX_USER_AGENT_LENGTH = 200;

export interface McpClientMetadata {
  clientName?: string;
  clientVersion?: string;
  protocolVersion?: string;
  userAgent?: string;
  invalid: boolean;
}

export interface McpAccessContext {
  apiKeyId: string;
  userId: string;
  tenantId?: string | null;
}

function bounded(value: string | null, max: number) {
  const normalized = value
    ?.trim()
    .split('')
    .map(character =>
      character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? ' ' : character,
    )
    .join('');
  return normalized ? normalized.slice(0, max) : undefined;
}

export function getMcpClientMetadata(request: Request): McpClientMetadata {
  const rawClient = bounded(request.headers.get('x-amami-mcp-client'), 129);
  const rawProtocol = bounded(request.headers.get('x-amami-mcp-protocol'), 32);
  const userAgent = bounded(request.headers.get('user-agent'), MAX_USER_AGENT_LENGTH);
  const [clientName, clientVersion] = rawClient?.split('/', 2) ?? [];
  const validClient =
    !!clientName &&
    !!clientVersion &&
    CLIENT_NAME_RE.test(clientName) &&
    SEMVER_RE.test(clientVersion);

  return {
    clientName: validClient ? clientName : undefined,
    clientVersion: validClient ? clientVersion?.replace(/^v/, '') : undefined,
    protocolVersion: rawProtocol,
    userAgent,
    invalid: !!rawClient && !validClient,
  };
}

export function isMcpInstallation(clientType?: string | null) {
  return clientType === 'mcp';
}

export function hashDailyIp(request: Request, now = new Date()) {
  const ip = getIpAddress(request.headers);
  return ip ? hash('mcp-client-ip:', now.toISOString().slice(0, 10), ip) : undefined;
}

export async function recordMcpClientAccess(
  request: Request,
  auth: McpAccessContext,
  metadata: McpClientMetadata,
  outcome: string = 'success',
) {
  const { default: prisma } = await import('@/lib/prisma');
  const url = new URL(request.url);
  return prisma.client.mcpClientAccess.create({
    data: {
      id: uuid(),
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      tenantId: auth.tenantId ?? undefined,
      clientName: metadata.clientName,
      clientVersion: metadata.clientVersion,
      protocolVersion: metadata.protocolVersion,
      userAgent: metadata.userAgent,
      ipHashDay: hashDailyIp(request),
      route: url.pathname.slice(0, 200),
      method: request.method.slice(0, 10),
      outcome: metadata.invalid ? 'invalid_client_metadata' : outcome,
    },
  });
}
