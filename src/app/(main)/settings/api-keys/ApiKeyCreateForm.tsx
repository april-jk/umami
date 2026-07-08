import {
  Button,
  Column,
  Form,
  FormField,
  FormSubmitButton,
  Row,
  Text,
  TextField,
} from '@umami/react-zen';
import { useState } from 'react';
import { useApi, useMessages, useModified } from '@/components/hooks';

export function ApiKeyCreateForm({ onClose }: { onClose?: () => void }) {
  const { post } = useApi();
  const { getErrorMessage } = useMessages();
  const { touch } = useModified();
  const [createdKey, setCreatedKey] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<any>(null);

  const handleSubmit = async (data: any) => {
    setIsPending(true);
    setError(null);

    try {
      const result = await post('/me/api-keys', { name: data.name });
      setCreatedKey(result.key);
      touch('api-keys');
    } catch (e) {
      setError(e);
    } finally {
      setIsPending(false);
    }
  };

  if (createdKey) {
    return (
      <Column gap="5">
        <Column gap="2">
          <Text weight="bold">Copy this key now</Text>
          <Text color="muted">
            For security, Amami stores only a hash of this key. You will not be able to view it
            again after closing this dialog.
          </Text>
        </Column>
        <TextField value={createdKey} isReadOnly allowCopy autoFocus />
        <Row justifyContent="flex-end">
          <Button variant="primary" onPress={onClose}>
            Done
          </Button>
        </Row>
      </Column>
    );
  }

  return (
    <Form onSubmit={handleSubmit} error={getErrorMessage(error)}>
      <Column gap="5">
        <FormField label="Name" name="name" rules={{ required: 'Required' }}>
          <TextField autoComplete="off" autoFocus placeholder="MCP client" />
        </FormField>
        <Text color="muted">
          The key will act as your user account. It can access your personal assets and assets from
          teams you belong to.
        </Text>
        <Row justifyContent="flex-end" gap="3">
          {onClose && (
            <Button isDisabled={isPending} onPress={onClose}>
              Cancel
            </Button>
          )}
          <FormSubmitButton variant="primary" isDisabled={isPending}>
            Create key
          </FormSubmitButton>
        </Row>
      </Column>
    </Form>
  );
}
