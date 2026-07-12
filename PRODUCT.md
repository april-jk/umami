# Product

## Register

Amami Analytics

## Users

Amami serves product teams that need privacy-focused analytics. The administration surface is used by global system administrators who manage users, tenants, websites, billing plans, quotas, and operational exceptions. They work in a repeated review-and-action workflow and need dense, reliable information with clear consequences for every change.

## Product Purpose

Amami provides privacy-focused web analytics with tenant-scoped plans and usage enforcement. The admin area must make the effective commercial configuration visible, connect users to their tenant usage and subscription state, and let authorized administrators resolve plan or quota issues without bypassing the same enforcement rules used by the product.

## Brand Personality

Quiet, trustworthy, precise. Copy should be direct and operational. The interface should feel like an established administration tool rather than a marketing surface.

## Anti-references

- Marketing-style hero sections inside authenticated administration pages.
- Decorative dashboards that hide exact values behind oversized summary cards.
- Ambiguous controls that change billing or quotas without explaining scope and effect.
- One-off visual components that conflict with React Zen and the existing navigation system.

## Design Principles

- Show the effective state: distinguish plan defaults, per-tenant overrides, current usage, and billing state.
- Keep consequential actions explicit: state when an admin change affects entitlement immediately or differs from external billing.
- Reuse product contracts: derive displays and enforcement from the same plan and entitlement constants.
- Optimize for scanning: use stable tables, tabs, compact controls, and consistent number formatting.
- Preserve ownership boundaries: only global administrators can use system membership controls.

## Accessibility & Inclusion

Preserve the keyboard, focus, labeling, and screen-reader behavior provided by React Aria and `@umami/react-zen`. Do not rely on color alone for status, and keep controls usable at mobile and desktop breakpoints with reduced-motion-safe interactions.
