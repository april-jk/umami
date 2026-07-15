import { AlertDialog } from '@umami/react-zen';
import { useDeleteQuery, useMessages, useModified } from '@/components/hooks';

export function ActivationCodeDeleteForm({
  activationCodeId,
  codePrefix,
  onClose,
}: {
  activationCodeId: string;
  codePrefix: string;
  onClose?: () => void;
}) {
  const { t, labels } = useMessages();
  const { mutateAsync } = useDeleteQuery(`/admin/activation-codes/${activationCodeId}`);
  const { touch } = useModified();

  return (
    <AlertDialog
      title={t('activationCodes.deleteTitle')}
      confirmLabel={t(labels.delete)}
      isDanger
      onCancel={onClose}
      onConfirm={async () => {
        await mutateAsync();
        touch('activation-codes');
        onClose?.();
      }}
    >
      {t('activationCodes.deleteConfirm', { code: `${codePrefix}...` })}
    </AlertDialog>
  );
}
