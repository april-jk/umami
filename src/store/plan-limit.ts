import { create } from 'zustand';
import type { ApiError } from '@/lib/types';

export interface PlanLimitPrompt extends ApiError {
  code: string;
}

interface PlanLimitState {
  prompt: PlanLimitPrompt | null;
}

const store = create<PlanLimitState>(() => ({ prompt: null }));

export function showPlanLimit(prompt: PlanLimitPrompt) {
  store.setState({ prompt });
}

export function dismissPlanLimit() {
  store.setState({ prompt: null });
}

export const usePlanLimit = store;
