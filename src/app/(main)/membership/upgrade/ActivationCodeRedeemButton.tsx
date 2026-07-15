'use client';

import {
  Button,
  Dialog,
  DialogTrigger,
  Form,
  FormButtons,
  FormField,
  FormSubmitButton,
  Icon,
  Modal,
  Text,
  TextField,
  useToast,
} from '@umami/react-zen';
import { useApi, useMessages } from '@/components/hooks';
import { useModified } from '@/components/hooks/useModified';
import { Ticket } from '@/components/icons';
import type { ApiError } from '@/lib/types';

export function ActivationCodeRedeemButton({ tenantId }: { tenantId?: string }) {
  const { t, labels } = useMessages();
  const { post, useMutation } = useApi();
  const { touch } = useModified();
  const { toast } = useToast();
  const mutation = useMutation<
    { plan: string; durationDays: number; membershipEndsAt: string },
    ApiError,
    { code: string }
  >({
    mutationFn: data => post('/membership/activation-code/redeem', data),
  });

  const getError = () => {
    if (!mutation.error) return undefined;
    const key = `membership.activationCode.errors.${mutation.error.code}`;
    const translated = t(key);
    return translated === key ? mutation.error.message : translated;
  };

  return (
    <DialogTrigger>
      <Button variant="outline" isDisabled={!tenantId} data-test="button-use-activation-code">
        <Icon size="sm">
          <Ticket />
        </Icon>
        <Text>{t('membership.activationCode.use')}</Text>
      </Button>
      <Modal>
        <Dialog title={t('membership.activationCode.title')} style={{ width: 440 }}>
          {({ close }) => (
            <Form
              error={getError()}
              onSubmit={async ({ code }: { code: string }) => {
                const result = await mutation.mutateAsync({ code });
                touch(`tenant:${tenantId}`);
                touch(`tenant-usage:${tenantId}`);
                toast(
                  t('membership.activationCode.redeemed', {
                    plan: t(`membership.plans.${result.plan}.name`),
                    date: new Date(result.membershipEndsAt).toLocaleDateString(),
                  }),
                );
                close();
              }}
            >
              <FormField
                label={t('membership.activationCode.code')}
                name="code"
                rules={{ required: t(labels.required) }}
                description={t('membership.activationCode.help')}
              >
                <TextField autoFocus autoComplete="off" placeholder="AMAMI-XXXXX-XXXXX-XXXXX" />
              </FormField>
              <FormButtons>
                <Button isDisabled={mutation.isPending} onPress={close}>
                  {t(labels.cancel)}
                </Button>
                <FormSubmitButton variant="primary" isDisabled={mutation.isPending}>
                  {mutation.isPending
                    ? t('membership.activationCode.redeeming')
                    : t('membership.activationCode.redeem')}
                </FormSubmitButton>
              </FormButtons>
            </Form>
          )}
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
}
