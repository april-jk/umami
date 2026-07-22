import type { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { sanitizeSortFilters } from '@/lib/sort';
import type { QueryFilters } from '@/lib/types';

const MCP_ACCESS_SORT_FIELDS = ['createdAt'] as const;

const RESOURCE_NAMES: Record<string, { singular: string; plural: string }> = {
  boards: { singular: 'board', plural: 'boards' },
  events: { singular: 'event', plural: 'events' },
  links: { singular: 'short link', plural: 'short links' },
  pixels: { singular: 'pixel', plural: 'pixels' },
  reports: { singular: 'report', plural: 'reports' },
  segments: { singular: 'segment', plural: 'segments' },
  sessions: { singular: 'session', plural: 'sessions' },
  teams: { singular: 'team', plural: 'teams' },
  users: { singular: 'user', plural: 'users' },
  websites: { singular: 'website', plural: 'websites' },
};

const WEBSITE_QUERY_NAMES: Record<string, string> = {
  active: 'active visitors',
  daterange: 'data range',
  'event-data': 'event data',
  events: 'events',
  export: 'export',
  metrics: 'metrics',
  pageviews: 'pageviews',
  realtime: 'realtime activity',
  replays: 'session replays',
  revenue: 'revenue',
  sessions: 'sessions',
  stats: 'statistics',
  values: 'field values',
};

function getResource(parts: string[]) {
  const resourcePart = parts.find(part => RESOURCE_NAMES[part]);
  return resourcePart ? RESOURCE_NAMES[resourcePart] : undefined;
}

export function describeMcpOperation(method: string, route: string) {
  const normalizedMethod = method.toUpperCase();
  const parts = route
    .split('/')
    .filter(Boolean)
    .filter(part => part !== 'api');
  const resourceIndex = parts.findIndex(part => RESOURCE_NAMES[part]);
  const resource = getResource(parts);

  if (normalizedMethod === 'GET' && parts[0] === 'realtime') {
    return 'View realtime activity';
  }

  if (normalizedMethod === 'GET' && parts[0] === 'websites' && parts.length > 2) {
    const queryName = WEBSITE_QUERY_NAMES[parts[2]];
    if (queryName) {
      return queryName === 'active visitors' || queryName === 'realtime activity'
        ? `View ${queryName}`
        : `Query website ${queryName}`;
    }
  }

  if (resource) {
    const hasResourceId = resourceIndex >= 0 && parts.length > resourceIndex + 1;

    if (normalizedMethod === 'GET') {
      return hasResourceId ? `View ${resource.singular}` : `List ${resource.plural}`;
    }
    if (normalizedMethod === 'POST') {
      return `Create ${resource.singular}`;
    }
    if (normalizedMethod === 'PUT' || normalizedMethod === 'PATCH') {
      return `Update ${resource.singular}`;
    }
    if (normalizedMethod === 'DELETE') {
      return `Delete ${resource.singular}`;
    }
  }

  return `${normalizedMethod} ${route}`;
}

const publicAccessSelect = {
  id: true,
  route: true,
  method: true,
  createdAt: true,
  apiKey: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.McpClientAccessSelect;

export async function getUserMcpUsage(userId: string, filters: QueryFilters = {}) {
  const sortFilters = sanitizeSortFilters(filters, MCP_ACCESS_SORT_FIELDS, {
    orderBy: 'createdAt',
    sortDescending: true,
  });
  const result = await prisma.pagedQuery(
    'mcpClientAccess',
    {
      where: { userId },
      select: publicAccessSelect,
    },
    sortFilters,
  );

  return {
    ...result,
    data: result.data.map(({ apiKey, method, route, ...record }) => ({
      ...record,
      apiKeyName: apiKey.name,
      method,
      route,
      operation: describeMcpOperation(method, route),
    })),
  };
}
