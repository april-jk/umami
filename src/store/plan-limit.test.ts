import { beforeEach, describe, expect, test } from 'vitest';
import { dismissPlanLimit, showPlanLimit, usePlanLimit } from './plan-limit';

function createPrompt(code: string) {
  return Object.assign(new Error('Server message'), {
    code,
    type: 'plan-limit',
    recommendedPlan: 'starter',
  });
}

beforeEach(() => dismissPlanLimit());

describe('plan limit store', () => {
  test('shows and dismisses a prompt', () => {
    const prompt = createPrompt('website-limit-reached');

    showPlanLimit(prompt);
    expect(usePlanLimit.getState().prompt).toBe(prompt);

    dismissPlanLimit();
    expect(usePlanLimit.getState().prompt).toBeNull();
  });

  test('replaces an existing prompt with the latest error', () => {
    showPlanLimit(createPrompt('website-limit-reached'));
    showPlanLimit(createPrompt('member-limit-reached'));

    expect(usePlanLimit.getState().prompt?.code).toBe('member-limit-reached');
  });
});
