import {
  Button,
  DataColumn,
  DataTable,
  Dialog,
  Icon,
  MenuItem,
  Modal,
  Row,
  Text,
} from '@umami/react-zen';
import { useState } from 'react';
import { Badge } from '@/components/common/Badge';
import { SortableLabel } from '@/components/common/SortableLabel';
import type { ActivationCodeRecord } from '@/components/hooks';
import { useMessages } from '@/components/hooks';
import { Edit, Eye, Trash } from '@/components/icons';
import { MenuButton } from '@/components/input/MenuButton';
import { ActivationCodeDeleteForm } from './ActivationCodeDeleteForm';
import { ActivationCodeDetails } from './ActivationCodeDetails';
import { ActivationCodeForm } from './ActivationCodeForm';

function getStatus(code: ActivationCodeRecord) {
  const now = Date.now();
  if (code.status === 'disabled') return 'disabled';
  if (new Date(code.startsAt).getTime() > now) return 'scheduled';
  if (code.expiresAt && new Date(code.expiresAt).getTime() <= now) return 'expired';
  if (code.redemptionCount >= code.maxRedemptions) return 'exhausted';
  return 'active';
}

function statusVariant(status: string): 'good' | 'warning' | 'danger' | 'gray' {
  if (status === 'active') return 'good';
  if (status === 'scheduled') return 'warning';
  if (status === 'expired' || status === 'exhausted') return 'danger';
  return 'gray';
}

export function ActivationCodesTable({ data = [], ...props }: { data: ActivationCodeRecord[] }) {
  const { t, labels } = useMessages();
  const [editCode, setEditCode] = useState<ActivationCodeRecord | null>(null);
  const [deleteCode, setDeleteCode] = useState<ActivationCodeRecord | null>(null);
  const [detailCode, setDetailCode] = useState<ActivationCodeRecord | null>(null);

  return (
    <>
      <DataTable data={data} {...props}>
        <DataColumn
          id="codePrefix"
          label={<SortableLabel label={t('activationCodes.code')} sortKey="codePrefix" />}
          width="1.5fr"
        >
          {(row: ActivationCodeRecord) => (
            <Text weight="bold" style={{ fontFamily: 'monospace' }}>
              {row.codePrefix}...
            </Text>
          )}
        </DataColumn>
        <DataColumn id="name" label={t(labels.name)} width="1.5fr">
          {(row: ActivationCodeRecord) => row.name || '-'}
        </DataColumn>
        <DataColumn
          id="plan"
          label={<SortableLabel label={t('activationCodes.plan')} sortKey="plan" />}
        >
          {(row: ActivationCodeRecord) => t(`membership.plans.${row.plan}.name`)}
        </DataColumn>
        <DataColumn
          id="durationDays"
          label={<SortableLabel label={t('activationCodes.duration')} sortKey="durationDays" />}
        >
          {(row: ActivationCodeRecord) => t('activationCodes.days', { count: row.durationDays })}
        </DataColumn>
        <DataColumn
          id="usage"
          label={<SortableLabel label={t('activationCodes.usage')} sortKey="redemptionCount" />}
        >
          {(row: ActivationCodeRecord) => `${row.redemptionCount} / ${row.maxRedemptions}`}
        </DataColumn>
        <DataColumn id="validity" label={t('activationCodes.validity')} width="1.5fr">
          {(row: ActivationCodeRecord) => (
            <Text size="sm">
              {new Date(row.startsAt).toLocaleDateString()} -{' '}
              {row.expiresAt
                ? new Date(row.expiresAt).toLocaleDateString()
                : t('activationCodes.noExpiry')}
            </Text>
          )}
        </DataColumn>
        <DataColumn id="status" label={t('activationCodes.statusLabel')}>
          {(row: ActivationCodeRecord) => {
            const status = getStatus(row);
            return (
              <Badge variant={statusVariant(status)}>{t(`activationCodes.status.${status}`)}</Badge>
            );
          }}
        </DataColumn>
        <DataColumn id="action" align="end" width="80px">
          {(row: ActivationCodeRecord) => (
            <MenuButton>
              <MenuItem onAction={() => setDetailCode(row)}>
                <Row alignItems="center" gap>
                  <Icon>
                    <Eye />
                  </Icon>
                  <Text>{t(labels.view)}</Text>
                </Row>
              </MenuItem>
              <MenuItem onAction={() => setEditCode(row)}>
                <Row alignItems="center" gap>
                  <Icon>
                    <Edit />
                  </Icon>
                  <Text>{t(labels.edit)}</Text>
                </Row>
              </MenuItem>
              <MenuItem onAction={() => setDeleteCode(row)}>
                <Row alignItems="center" gap>
                  <Icon>
                    <Trash />
                  </Icon>
                  <Text>{t(labels.delete)}</Text>
                </Row>
              </MenuItem>
            </MenuButton>
          )}
        </DataColumn>
      </DataTable>

      <Modal isOpen={Boolean(detailCode)}>
        <Dialog title={t('activationCodes.detailsTitle')} style={{ width: 760 }}>
          {detailCode && <ActivationCodeDetails activationCodeId={detailCode.id} />}
          <ButtonClose onPress={() => setDetailCode(null)} label={t('activationCodes.done')} />
        </Dialog>
      </Modal>
      <Modal isOpen={Boolean(editCode)}>
        <Dialog title={t('activationCodes.editTitle')} style={{ width: 640 }}>
          {editCode && (
            <ActivationCodeForm activationCode={editCode} onClose={() => setEditCode(null)} />
          )}
        </Dialog>
      </Modal>
      <Modal isOpen={Boolean(deleteCode)}>
        {deleteCode && (
          <ActivationCodeDeleteForm
            activationCodeId={deleteCode.id}
            codePrefix={deleteCode.codePrefix}
            onClose={() => setDeleteCode(null)}
          />
        )}
      </Modal>
    </>
  );
}

function ButtonClose({ onPress, label }: { onPress: () => void; label: string }) {
  return <Button onPress={onPress}>{label}</Button>;
}
