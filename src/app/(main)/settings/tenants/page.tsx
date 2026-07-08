import type { Metadata } from 'next';
import { TenantsSettingsPage } from './TenantsSettingsPage';

export default function () {
  return <TenantsSettingsPage />;
}

export const metadata: Metadata = {
  title: 'Tenants',
};
