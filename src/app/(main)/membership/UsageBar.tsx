'use client';

import { Column, Row, Text } from '@umami/react-zen';
import { getUsagePercentage, getUsageAlertLevel } from '@/lib/tenant-plan';

interface UsageBarProps {
  label: string;
  used: number;
  limit: number | null;
  alert?: 'none' | 'warning' | 'critical' | 'exceeded';
}

export function UsageBar({ label, used, limit, alert }: UsageBarProps) {
  const percentage = getUsagePercentage(used, limit);
  const alertLevel = alert || getUsageAlertLevel(percentage);

  const barColor =
    alertLevel === 'exceeded'
      ? '#ef4444'
      : alertLevel === 'critical'
        ? '#f97316'
        : alertLevel === 'warning'
          ? '#eab308'
          : '#22c55e';

  const barWidth = percentage === null ? 100 : Math.min(100, percentage);

  return (
    <Column gap="2">
      <Row alignItems="center" justifyContent="space-between">
        <Text weight="bold">{label}</Text>
        <Row gap="2" alignItems="center">
          <Text size="sm" color="muted">
            {used.toLocaleString()} / {limit === null ? 'Unlimited' : limit.toLocaleString()}
          </Text>
          {percentage !== null && (
            <Text
              size="sm"
              weight="bold"
              style={{ color: barColor }}
            >
              {percentage.toFixed(1)}%
            </Text>
          )}
        </Row>
      </Row>
      <Row
        height="8px"
        backgroundColor="surface-sunken"
        borderRadius
        overflow="hidden"
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }}
        />
      </Row>
    </Column>
  );
}
