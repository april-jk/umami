import { Grid, ListItem, Row, Select } from '@umami/react-zen';
import { useMessages } from '@/components/hooks';
import { REALTIME_RANGE } from '@/lib/constants';

export function RealtimeControls() {
  const { t, labels } = useMessages();

  return (
    <Grid columns={{ base: '1fr', md: 'auto 1fr' }} gap>
      <Row alignItems="center" justifyContent="flex-start" gap="4" />
      <Row alignItems="center" justifyContent={{ base: 'flex-start', md: 'flex-end' }}>
        <Select aria-label={t(labels.selectDate)} className="min-w-[200px]" value="30minute">
          <ListItem id="30minute">{t(labels.lastMinutes, { x: REALTIME_RANGE })}</ListItem>
        </Select>
      </Row>
    </Grid>
  );
}
