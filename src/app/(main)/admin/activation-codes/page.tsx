import type { Metadata } from 'next';
import { ActivationCodesPage } from './ActivationCodesPage';

export default function ActivationCodesRoute() {
  return <ActivationCodesPage />;
}

export const metadata: Metadata = {
  title: 'Activation codes',
};
