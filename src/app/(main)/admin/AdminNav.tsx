import { Column, Row, Tooltip, TooltipTrigger } from '@umami/react-zen';
import { IconLabel } from '@/components/common/IconLabel';
import Link from '@/components/common/Link';
import { NavMenu } from '@/components/common/NavMenu';
import { useMessages, useNavigation } from '@/components/hooks';
import { ArrowLeft, BadgeDollarSign, Globe, Ticket, User, Users } from '@/components/icons';

export function AdminNav({ onItemClick }: { onItemClick?: () => void }) {
  const { t, labels } = useMessages();
  const { pathname, renderUrl } = useNavigation();

  const items = [
    {
      label: t(labels.manage),
      items: [
        {
          id: 'users',
          label: t(labels.users),
          path: '/admin/users',
          icon: <User />,
        },
        {
          id: 'websites',
          label: t(labels.websites),
          path: '/admin/websites',
          icon: <Globe />,
        },
        {
          id: 'teams',
          label: t(labels.teams),
          path: '/admin/teams',
          icon: <Users />,
        },
        {
          id: 'membership',
          label: t(labels.membership),
          path: '/admin/membership',
          icon: <BadgeDollarSign />,
        },
        {
          id: 'activation-codes',
          label: t(labels.activationCodes),
          path: '/admin/activation-codes',
          icon: <Ticket />,
        },
      ],
    },
  ];

  const selectedKey = items
    .flatMap(e => e.items)
    ?.find(({ path }) => path && pathname.startsWith(path))?.id;

  return (
    <Column gap="2">
      <TooltipTrigger delay={0}>
        <Link href={renderUrl('/websites', false)} role="button" onClick={onItemClick}>
          <Row
            alignItems="center"
            hover={{ backgroundColor: 'surface-sunken' }}
            borderRadius
            minHeight="40px"
          >
            <IconLabel icon={<ArrowLeft />} label={t(labels.back)} padding />
          </Row>
        </Link>
        <Tooltip placement="right">{t(labels.back)}</Tooltip>
      </TooltipTrigger>
      <NavMenu
        items={items}
        selectedKey={selectedKey}
        allowMinimize={false}
        onItemClick={onItemClick}
      />
    </Column>
  );
}
