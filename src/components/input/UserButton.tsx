import {
  Column,
  Icon,
  Menu,
  MenuItem,
  MenuSection,
  MenuSeparator,
  MenuTrigger,
  Popover,
  Pressable,
  Row,
  SubmenuTrigger,
  Text,
  Tooltip,
  TooltipTrigger,
  useTheme,
} from '@umami/react-zen';
import { useConfig, useLocale, useLoginQuery, useMessages, useMobile } from '@/components/hooks';
import {
  BookText,
  Crown,
  Globe,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  Moon,
  Settings,
  Sun,
  SunMoon,
  UserCircle,
} from '@/components/icons';
import { DOCS_URL } from '@/lib/constants';
import { languages } from '@/lib/lang';

export interface UserButtonProps {
  showText?: boolean;
  onClose?: () => void;
}

export function UserButton({ showText = true, onClose }: UserButtonProps) {
  const { user } = useLoginQuery();
  const { cloudMode } = useConfig();
  const { t, labels } = useMessages();
  const { locale, saveLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const { isMobile } = useMobile();

  const getUrl = (url: string) => {
    return cloudMode ? `${process.env.cloudUrl}${url}` : url;
  };

  const languageItems = Object.keys(languages).map(key => ({
    value: key,
    label: languages[key].label,
  }));

  const items = [
    cloudMode && {
      id: 'docs',
      label: t(labels.documentation),
      path: DOCS_URL,
      icon: <BookText />,
      target: '_blank',
      external: true,
    },
    cloudMode && {
      id: 'support',
      label: t(labels.support),
      path: getUrl('/settings/support'),
      icon: <LifeBuoy />,
    },
    !cloudMode &&
      user.isAdmin && {
        id: 'admin',
        label: t(labels.admin),
        path: '/admin',
        icon: <LockKeyhole />,
      },
    {
      id: 'separator',
      separator: true,
    },
    {
      id: 'logout',
      label: t(labels.logout),
      path: getUrl('/logout'),
      icon: <LogOut />,
    },
  ].filter(Boolean);

  return (
    <MenuTrigger>
      <TooltipTrigger isDisabled={showText} delay={0}>
        <Pressable>
          <Row
            alignItems="center"
            flexGrow={1}
            hover={{ backgroundColor: 'surface-sunken' }}
            borderRadius
            minHeight="40px"
            role="button"
            style={{ cursor: 'pointer', textWrap: 'nowrap', overflow: 'hidden', outline: 'none' }}
          >
            <Row alignItems="center" gap padding>
              <Icon>
                <UserCircle />
              </Icon>
              {showText && <Text>{user.username}</Text>}
            </Row>
          </Row>
        </Pressable>
        <Tooltip placement="right">{user.username}</Tooltip>
      </TooltipTrigger>
      <Popover placement="top start">
        <Column minWidth="200px">
          <Menu autoFocus="last" onAction={onClose}>
            <MenuSection>
              <MenuItem
                id="settings"
                href={getUrl('/settings')}
                icon={<Settings />}
                label={t(labels.settings)}
              />
              <MenuItem
                id="membership"
                href={getUrl('/membership')}
                icon={<Crown />}
                label={t(labels.membership)}
              />
              <SubmenuTrigger>
                <MenuItem
                  id="language"
                  showSubMenuIcon
                  icon={<Globe />}
                  label={t(labels.language)}
                />
                <Popover placement={isMobile ? 'bottom start' : 'right bottom'} isNonModal>
                  <Menu
                    selectionMode="single"
                    selectedKeys={new Set([locale])}
                    onAction={key => saveLocale(key as string)}
                    style={{ maxHeight: 300, overflow: 'auto' }}
                  >
                    {languageItems.map(({ value, label }) => (
                      <MenuItem key={value} id={value} label={label} />
                    ))}
                  </Menu>
                </Popover>
              </SubmenuTrigger>
              <SubmenuTrigger>
                <MenuItem id="theme" showSubMenuIcon icon={<SunMoon />} label={t(labels.theme)} />
                <Popover placement={isMobile ? 'bottom start' : 'right bottom'} isNonModal>
                  <Menu
                    selectionMode="single"
                    selectedKeys={new Set([theme])}
                    onAction={key => setTheme(key as 'light' | 'dark')}
                  >
                    <MenuItem id="light" icon={<Sun />} label="Light" />
                    <MenuItem id="dark" icon={<Moon />} label="Dark" />
                  </Menu>
                </Popover>
              </SubmenuTrigger>
              {items.map(({ id, path, label, icon, separator, target }: any) => {
                if (separator) {
                  return <MenuSeparator key={id} />;
                }
                return (
                  <MenuItem
                    key={id}
                    id={id}
                    href={path}
                    target={target}
                    icon={icon}
                    label={label}
                  />
                );
              })}
            </MenuSection>
          </Menu>
        </Column>
      </Popover>
    </MenuTrigger>
  );
}
