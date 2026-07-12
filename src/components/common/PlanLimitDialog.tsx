'use client';

import { Button, Column, Icon, Row, Text } from '@umami/react-zen';
import Link from 'next/link';
import { useLocale, useMessages } from '@/components/hooks';
import { AlertTriangle } from '@/components/icons';
import { DialogButton } from '@/components/input/DialogButton';
import { dismissPlanLimit, usePlanLimit } from '@/store/plan-limit';

const resourceKeys = {
  event: 'membership.events',
  website: 'membership.websites',
  member: 'membership.members',
  goal: 'label.goal',
  goalLimit: 'label.goal',
} as const;

export function PlanLimitDialog() {
  const prompt = usePlanLimit(state => state.prompt);
  const { locale } = useLocale();
  const { t, labels, messages } = useMessages();

  if (!prompt) return null;

  const hasUsage =
    typeof prompt.current === 'number' && typeof prompt.limit === 'number' && prompt.limit > 0;
  const resourceKey = resourceKeys[prompt.resource as keyof typeof resourceKeys];
  const recommendedPlan = prompt.recommendedPlan;
  const planName = recommendedPlan ? t(`membership.plans.${recommendedPlan}.name`) : undefined;
  const title = hasUsage ? t('membership.usageLimitExceeded') : t('membership.upgrade');
  const description =
    !hasUsage && planName
      ? t(messages.upgradeRequired, { plan: planName })
      : t('membership.exceededDescription');

  return (
    <DialogButton
      isOpen
      onOpenChange={isOpen => !isOpen && dismissPlanLimit()}
      title={title}
      width="480px"
    >
      <Column gap="5">
        <Row gap="3" alignItems="flex-start">
          <Icon size="lg" style={{ color: hasUsage ? '#ef4444' : '#f97316', flexShrink: 0 }}>
            <AlertTriangle />
          </Icon>
          <Text color="muted">{description}</Text>
        </Row>

        {hasUsage && (
          <Column gap="1">
            <Text size="sm" color="muted">
              {resourceKey ? t(resourceKey) : t('membership.usageOverview')}
            </Text>
            <Text weight="bold">
              {new Intl.NumberFormat(locale).format(prompt.current)} /{' '}
              {new Intl.NumberFormat(locale).format(prompt.limit)}
            </Text>
          </Column>
        )}

        {planName && (
          <Column gap="1">
            <Text size="sm" color="muted">
              {t('membership.recommended')}
            </Text>
            <Text weight="bold">{planName}</Text>
          </Column>
        )}

        <Row gap="3" justifyContent="flex-end">
          <Button onPress={dismissPlanLimit}>{t(labels.cancel)}</Button>
          {recommendedPlan ? (
            <Link
              href={
                prompt.upgradeUrl ||
                `/membership/upgrade?reason=${encodeURIComponent(prompt.resource || prompt.code)}&plan=${encodeURIComponent(recommendedPlan)}`
              }
              onClick={dismissPlanLimit}
            >
              <Button variant="primary">{t('membership.upgrade')}</Button>
            </Link>
          ) : (
            <Button
              variant="primary"
              render={({ className, children }) => (
                <a
                  href="mailto:watson_zang@foxmail.com"
                  className={className}
                  onClick={dismissPlanLimit}
                >
                  {children}
                </a>
              )}
            >
              {t('membership.contactSales')}
            </Button>
          )}
        </Row>
      </Column>
    </DialogButton>
  );
}
