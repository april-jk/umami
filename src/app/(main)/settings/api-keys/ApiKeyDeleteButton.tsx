import { ConfirmationForm } from '@/components/common/ConfirmationForm';
import { useDeleteQuery, useModified } from '@/components/hooks';
import { Trash } from '@/components/icons';
import { DialogButton } from '@/components/input/DialogButton';

export function ApiKeyDeleteButton({ apiKeyId, name }: { apiKeyId: string; name: string }) {
  const { mutateAsync, isPending, error } = useDeleteQuery(`/me/api-keys/${apiKeyId}`);
  const { touch } = useModified();

  const handleConfirm = async (close: () => void) => {
    await mutateAsync(null, {
      onSuccess: () => {
        touch('api-keys');
        close();
      },
    });
  };

  return (
    <DialogButton icon={<Trash />} title="Delete API key" variant="quiet" width="400px">
      {({ close }) => (
        <ConfirmationForm
          message={
            <>
              Delete API key <b>{name}</b>?
            </>
          }
          isLoading={isPending}
          error={error}
          onConfirm={handleConfirm.bind(null, close)}
          onClose={close}
          buttonLabel="Delete"
          buttonVariant="danger"
        />
      )}
    </DialogButton>
  );
}
