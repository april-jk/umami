import type { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { sanitizeSortFilters } from '@/lib/sort';
import type { QueryFilters } from '@/lib/types';

const MCP_ACCESS_SORT_FIELDS = ['createdAt'] as const;

const RESOURCE_NAMES: Record<string, { key: string; singular: string; plural: string }> = {
  boards: { key: 'board', singular: 'board', plural: 'boards' },
  events: { key: 'event', singular: 'event', plural: 'events' },
  links: { key: 'link', singular: 'short link', plural: 'short links' },
  pixels: { key: 'pixel', singular: 'pixel', plural: 'pixels' },
  reports: { key: 'report', singular: 'report', plural: 'reports' },
  segments: { key: 'segment', singular: 'segment', plural: 'segments' },
  sessions: { key: 'session', singular: 'session', plural: 'sessions' },
  teams: { key: 'team', singular: 'team', plural: 'teams' },
  users: { key: 'user', singular: 'user', plural: 'users' },
  websites: { key: 'website', singular: 'website', plural: 'websites' },
};

const WEBSITE_QUERY_NAMES: Record<string, { key: string; name: string; verb: 'query' | 'view' }> = {
  active: { key: 'active-visitors', name: 'active visitors', verb: 'view' },
  daterange: { key: 'data-range', name: 'data range', verb: 'query' },
  'event-data': { key: 'event-data', name: 'event data', verb: 'query' },
  events: { key: 'events', name: 'events', verb: 'query' },
  export: { key: 'export', name: 'export', verb: 'query' },
  metrics: { key: 'metrics', name: 'metrics', verb: 'query' },
  pageviews: { key: 'pageviews', name: 'pageviews', verb: 'query' },
  realtime: { key: 'realtime-activity', name: 'realtime activity', verb: 'view' },
  replays: { key: 'session-replays', name: 'session replays', verb: 'query' },
  revenue: { key: 'revenue', name: 'revenue', verb: 'query' },
  sessions: { key: 'sessions', name: 'sessions', verb: 'query' },
  stats: { key: 'statistics', name: 'statistics', verb: 'query' },
  values: { key: 'field-values', name: 'field values', verb: 'query' },
};

function getResource(parts: string[]) {
  const resourcePart = parts.find(part => RESOURCE_NAMES[part]);
  return resourcePart ? RESOURCE_NAMES[resourcePart] : undefined;
}

export function describeMcpOperation(method: string, route: string) {
  return getMcpOperationDescriptor(method, route).operation;
}

export function getMcpOperationDescriptor(method: string, route: string) {
  const normalizedMethod = method.toUpperCase();
  const parts = route
    .split('/')
    .filter(Boolean)
    .filter(part => part !== 'api');
  const resourceIndex = parts.findIndex(part => RESOURCE_NAMES[part]);
  const resource = getResource(parts);

  if (normalizedMethod === 'GET' && parts[0] === 'realtime') {
    return { operation: 'View realtime activity', operationKey: 'view.realtime-activity' };
  }

  if (normalizedMethod === 'GET' && parts[0] === 'websites' && parts.length > 2) {
    const query = WEBSITE_QUERY_NAMES[parts[2]];
    if (query) {
      return {
        operation: query.verb === 'view' ? `View ${query.name}` : `Query website ${query.name}`,
        operationKey: `query.website-${query.key}`,
      };
    }
  }

  if (resource) {
    const hasResourceId = resourceIndex >= 0 && parts.length > resourceIndex + 1;

    if (normalizedMethod === 'GET') {
      return hasResourceId
        ? { operation: `View ${resource.singular}`, operationKey: `view.${resource.key}` }
        : { operation: `List ${resource.plural}`, operationKey: `list.${resource.key}` };
    }
    if (normalizedMethod === 'POST') {
      return { operation: `Create ${resource.singular}`, operationKey: `create.${resource.key}` };
    }
    if (normalizedMethod === 'PUT' || normalizedMethod === 'PATCH') {
      return { operation: `Update ${resource.singular}`, operationKey: `update.${resource.key}` };
    }
    if (normalizedMethod === 'DELETE') {
      return { operation: `Delete ${resource.singular}`, operationKey: `delete.${resource.key}` };
    }
  }

  return { operation: `${normalizedMethod} ${route}` };
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
    data: result.data.map(({ apiKey, method, route, ...record }) => {
      const operation = getMcpOperationDescriptor(method, route);

      return {
        ...record,
        apiKeyName: apiKey.name,
        method,
        route,
        ...operation,
      };
    }),
  };
}
