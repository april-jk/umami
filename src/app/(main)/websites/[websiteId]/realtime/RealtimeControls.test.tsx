import { expect, test } from 'vitest';
import { render, screen } from '@/test/render';
import zhCN from '../../../../../../public/intl/messages/zh-CN.json';
import { RealtimeControls } from './RealtimeControls';

test('renders a fixed 30-minute range with the overview date-filter layout', () => {
  render(<RealtimeControls />);

  const rangeControl = screen.getByRole('button', { name: /Last 30 minutes/ });

  expect(rangeControl.parentElement).toHaveClass('min-w-[200px]');
  expect(rangeControl).toHaveTextContent('Last 30 minutes');
});

test('renders the fixed range in the active locale', () => {
  render(<RealtimeControls />, { locale: 'zh-CN', messages: zhCN });

  expect(screen.getByRole('button', { name: /最近 30 分钟/ })).toBeInTheDocument();
});
