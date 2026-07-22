import { Column, Tab, TabList, TabPanel, Tabs } from '@umami/react-zen';
import { McpUsagePanel } from '@/app/(main)/settings/api-keys/McpUsagePanel';
import { useMessages } from '@/components/hooks';
import { UserEditForm } from './UserEditForm';
import { UserMembership } from './UserMembership';
import { UserUsageQuotas } from './UserUsageQuotas';
import { UserWebsites } from './UserWebsites';

export function UserSettings({ userId }: { userId: string }) {
  const { t, labels } = useMessages();

  return (
    <Column gap="6">
      <Tabs>
        <TabList>
          <Tab id="details">{t(labels.details)}</Tab>
          <Tab id="websites">{t(labels.websites)}</Tab>
          <Tab id="mcp-usage">{t(labels.mcpUsage)}</Tab>
          <Tab id="usage">{t(labels.usageQuotas)}</Tab>
          <Tab id="membership">{t(labels.membership)}</Tab>
        </TabList>
        <TabPanel id="details" style={{ width: 500 }}>
          <UserEditForm userId={userId} />
        </TabPanel>
        <TabPanel id="websites">
          <UserWebsites userId={userId} />
        </TabPanel>
        <TabPanel id="mcp-usage">
          <McpUsagePanel userId={userId} />
        </TabPanel>
        <TabPanel id="usage">
          <UserUsageQuotas userId={userId} />
        </TabPanel>
        <TabPanel id="membership">
          <UserMembership userId={userId} />
        </TabPanel>
      </Tabs>
    </Column>
  );
}
