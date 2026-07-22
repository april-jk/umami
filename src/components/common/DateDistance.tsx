import { Text } from '@umami/react-zen';
import { formatDistanceToNow } from 'date-fns';
import { useLocale, useTimezone } from '@/components/hooks';
import { isInvalidDate } from '@/lib/date';

export function DateDistance({ date, absolute = false }: { date: Date; absolute?: boolean }) {
  const { formatTimezoneDate } = useTimezone();
  const { dateLocale } = useLocale();

  if (isInvalidDate(date)) {
    return null;
  }

  const title = formatTimezoneDate(date?.toISOString(), 'PPpp');

  return (
    <Text title={title}>
      {absolute ? title : formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })}
    </Text>
  );
}
