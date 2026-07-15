import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import ActivationCodesRoute, { metadata } from './page';

vi.mock('./ActivationCodesPage', () => ({
  ActivationCodesPage: () => <main>activation-codes-page</main>,
}));

test('exposes route metadata and renders the activation codes page', () => {
  render(<ActivationCodesRoute />);

  expect(metadata).toEqual({ title: 'Activation codes' });
  expect(screen.getByText('activation-codes-page')).toBeInTheDocument();
});
