import { Button, Dialog, DialogTrigger, Icon, Modal, Text, TextField } from '@umami/react-zen';
import { useState } from 'react';
import { useMessages } from '@/components/hooks';
import { Plus } from '@/components/icons';
import { ActivationCodeForm } from './ActivationCodeForm';

export function ActivationCodeCreateButton() {
  const { t } = useMessages();
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  return (
    <>
      <DialogTrigger>
        <Button variant="primary" data-test="button-create-activation-code">
          <Icon>
            <Plus />
          </Icon>
          <Text>{t('activationCodes.create')}</Text>
        </Button>
        <Modal>
          <Dialog title={t('activationCodes.create')} style={{ width: 640 }}>
            {({ close }) => (
              <ActivationCodeForm
                onSave={result => result.code && setCreatedCode(result.code)}
                onClose={close}
              />
            )}
          </Dialog>
        </Modal>
      </DialogTrigger>
      <Modal isOpen={Boolean(createdCode)}>
        <Dialog title={t('activationCodes.createdTitle')} style={{ width: 500 }}>
          <Text>{t('activationCodes.createdHelp')}</Text>
          <TextField value={createdCode ?? ''} isReadOnly allowCopy style={{ width: '100%' }} />
          <Button variant="primary" onPress={() => setCreatedCode(null)}>
            {t('activationCodes.done')}
          </Button>
        </Dialog>
      </Modal>
    </>
  );
}
