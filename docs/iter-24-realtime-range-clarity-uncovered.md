# Iteration 24: Realtime Range Clarity

## Scope

The realtime chart now states its fixed 30-minute range and replaces an all-zero chart with a localized status message.

## Covered By Unit Tests

- The range annotation renders alongside populated realtime data.
- The chart is replaced by the localized empty state when every realtime total is zero in the window.

## Uncovered Scenarios

- Canvas rendering, legend positioning, and responsive layout require browser verification.
- RTL locale wrapping requires browser verification.

## Manual Test Steps

1. Open a website realtime page with activity in the last 30 minutes and verify the chart, legend, and range annotation are visible.
2. Open a website realtime page without activity in the last 30 minutes and verify the chart area says the localized equivalent of "No trackable activity in the last 30 minutes."
3. Repeat in Chinese and an RTL locale at desktop and mobile widths.

## Suggested Follow-up Tests

- Add Playwright visual coverage for the populated, empty, mobile, and RTL states.

## Checklist

- [x] Focused component tests
- [ ] Browser visual verification
- [ ] RTL browser verification
