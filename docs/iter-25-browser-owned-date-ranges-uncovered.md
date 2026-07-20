# Iteration 25: Browser-Owned Date Ranges

## Scope

Relative analytics ranges now use browser-generated epoch boundaries as the single query authority. Inclusive Last X ranges contain exactly X aligned buckets, and previous-period comparisons use the exact millisecond width of the selected range.

## Covered By Unit Tests

- Last 24 Hours produces exactly 24 aligned hourly buckets and a 24-hour inclusive interval.
- Last 7/30/90 Days and Last 6/12 Months contain the labeled number of buckets.
- Week and year ranges do not add an extra bucket.
- Previous and next navigation remains contiguous and preserves the original step size.
- Previous-period comparison is millisecond-precise and does not overlap the current period.
- Display timezone changes cannot alter the browser-generated range.
- Overview stats and pageviews queries send and cache identical `startAt` and `endAt` values.
- Invalid browser dates cannot crash query parameter construction.

## Uncovered Scenarios

- An authenticated production browser flow is required to verify the actual network requests made by Overview cards, charts, Compare, Sessions, and reports.
- DST transition behavior should be verified in browsers configured for both spring-forward and fall-back timezones.
- Chart labels, repeated or skipped local clock labels around DST, and canvas rendering require visual verification.
- A client clock that is materially incorrect will still produce an incorrect relative window because browser time is intentionally authoritative.

## Manual Test Steps

1. Open one website in Overview, Compare, and Sessions and select Last 24 Hours.
2. In browser developer tools, confirm every analytics request uses the same `startAt` and `endAt`; confirm `endAt - startAt + 1` is exactly `86,400,000` milliseconds.
3. Confirm the Overview cards and chart reflect the same closed interval, then refresh after crossing an hour boundary and verify both move together.
4. Change the website display timezone without changing the browser timezone. Confirm query boundaries do not change, while chart bucket labels/grouping may change.
5. Repeat with browser timezones that cross upcoming DST spring-forward and fall-back transitions; verify there are 24 buckets and no request overlap.
6. Verify Previous period ends exactly one millisecond before the current period starts.

## Suggested Follow-up Tests

- Add Playwright network assertions for Overview, Compare, Sessions, and report pages.
- Add browser matrix coverage with fixed operating-system timezones around DST transitions.
- Add screenshot regression coverage for repeated/skipped local-hour chart labels.

## Checklist

- [x] Focused date and hook tests
- [x] Query-boundary parity tests
- [ ] Authenticated browser network verification
- [ ] DST browser verification
- [ ] Chart visual regression verification
