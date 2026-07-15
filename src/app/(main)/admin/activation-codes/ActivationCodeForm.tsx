import {
  Button,
  Form,
  FormButtons,
  FormField,
  FormSubmitButton,
  Grid,
  ListItem,
  Select,
  TextField,
} from '@umami/react-zen';
import { useApi, useMessages, useModified } from '@/components/hooks';
import type { ActivationCodeRecord } from '@/components/hooks/queries/useActivationCodesQuery';
import type { ApiError } from '@/lib/types';

function toLocalDateTime(value?: string | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ActivationCodeForm({
  activationCode,
  onSave,
  onClose,
}: {
  activationCode?: ActivationCodeRecord;
  onSave?: (result: ActivationCodeRecord & { code?: string }) => void;
  onClose?: () => void;
}) {
  const { t, labels } = useMessages();
  const { post, put, useMutation } = useApi();
  const { touch } = useModified();
  const mutation = useMutation<any, ApiError, Record<string, any>>({
    mutationFn: data =>
      activationCode
        ? put(`/admin/activation-codes/${activationCode.id}`, data)
        : post('/admin/activation-codes', data),
  });
  const defaults = activationCode
    ? {
        name: activationCode.name ?? '',
        note: activationCode.note ?? '',
        plan: activationCode.plan,
        durationDays: activationCode.durationDays,
        startsAt: toLocalDateTime(activationCode.startsAt),
        expiresAt: toLocalDateTime(activationCode.expiresAt),
        maxRedemptions: activationCode.maxRedemptions,
        status: activationCode.status,
      }
    : {
        code: '',
        name: '',
        note: '',
        plan: 'pro',
        durationDays: 30,
        startsAt: toLocalDateTime(new Date()),
        expiresAt: '',
        maxRedemptions: 1,
        status: 'active',
      };

  return (
    <Form
      defaultValues={defaults}
      error={mutation.error?.message}
      onSubmit={async (values: Record<string, any>) => {
        const result = await mutation.mutateAsync({
          ...values,
          code: values.code || undefined,
          name: values.name || null,
          note: values.note || null,
          durationDays: Number(values.durationDays),
          maxRedemptions: Number(values.maxRedemptions),
          startsAt: new Date(values.startsAt).toISOString(),
          expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
        });
        touch('activation-codes');
        touch(`activation-code:${activationCode?.id ?? result.id}`);
        onSave?.(result);
        onClose?.();
      }}
    >
      {!activationCode && (
        <FormField
          label={t('activationCodes.code')}
          description={t('activationCodes.codeHelp')}
          name="code"
        >
          <TextField autoComplete="off" placeholder="AMAMI-XXXXX-XXXXX" />
        </FormField>
      )}
      <Grid columns={{ base: '1fr', md: '1fr 1fr' }} gap="4">
        <FormField label={t(labels.name)} name="name">
          <TextField autoComplete="off" />
        </FormField>
        <FormField
          label={t('activationCodes.plan')}
          name="plan"
          rules={{ required: t(labels.required) }}
        >
          <Select>
            {['starter', 'pro', 'team', 'enterprise'].map(plan => (
              <ListItem key={plan} id={plan}>
                {t(`membership.plans.${plan}.name`)}
              </ListItem>
            ))}
          </Select>
        </FormField>
        <FormField
          label={t('activationCodes.durationDays')}
          name="durationDays"
          rules={{ required: t(labels.required), min: { value: 1, message: '1' } }}
        >
          <TextField type="number" />
        </FormField>
        <FormField
          label={t('activationCodes.maxRedemptions')}
          name="maxRedemptions"
          rules={{ required: t(labels.required), min: { value: 1, message: '1' } }}
        >
          <TextField type="number" />
        </FormField>
        <FormField
          label={t('activationCodes.startsAt')}
          name="startsAt"
          rules={{ required: t(labels.required) }}
        >
          <TextField type="datetime-local" />
        </FormField>
        <FormField label={t('activationCodes.expiresAt')} name="expiresAt">
          <TextField type="datetime-local" />
        </FormField>
        <FormField label={t('activationCodes.statusLabel')} name="status">
          <Select>
            <ListItem id="active">{t('activationCodes.status.active')}</ListItem>
            <ListItem id="disabled">{t('activationCodes.status.disabled')}</ListItem>
          </Select>
        </FormField>
      </Grid>
      <FormField label={t('activationCodes.note')} name="note">
        <TextField autoComplete="off" />
      </FormField>
      <FormButtons>
        <Button isDisabled={mutation.isPending} onPress={onClose}>
          {t(labels.cancel)}
        </Button>
        <FormSubmitButton variant="primary" isDisabled={mutation.isPending}>
          {mutation.isPending ? t('activationCodes.saving') : t(labels.save)}
        </FormSubmitButton>
      </FormButtons>
    </Form>
  );
}
