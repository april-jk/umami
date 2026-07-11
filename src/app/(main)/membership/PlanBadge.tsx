'use client';

import { Text } from '@umami/react-zen';

interface PlanBadgeProps {
  plan: string;
}

const planColors: Record<string, string> = {
  free: '#6b7280',
  starter: '#3b82f6',
  pro: '#8b5cf6',
  team: '#f97316',
  enterprise: '#eab308',
};

export function PlanBadge({ plan }: PlanBadgeProps) {
  const color = planColors[plan] || '#6b7280';

  return (
    <Text
      size="sm"
      weight="bold"
      style={{
        textTransform: 'capitalize',
        borderRadius: 999,
        padding: '4px 12px',
        backgroundColor: color,
        color: '#fff',
        fontSize: 12,
      }}
    >
      {plan}
    </Text>
  );
}
