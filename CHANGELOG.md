# Changelog

All notable changes to ReserveTable are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] — 2026-07-19

### Added

- Partner **Settings** hub (`/settings`) for restaurant profile, booking rules, widget theme, and shortcuts to menu, blackouts, access rules, surveys, groups, and integrations
- `useActiveRestaurant` hook — keeps the Partner Hub header restaurant selector in sync across pages via `localStorage` + `rt-restaurant-change`
- Restaurant selector in the dashboard shell for multi-venue owners
- Diner account dropdown (profile, reservations, waitlist, log out) and brand mark in the web shell
- Dedicated `colors.rating` and `colors.heroMid` design tokens

### Changed

- Design system refresh: terracotta brand (`#c4472f`), warm stone neutrals, Plus Jakarta Sans, softer radii
- Default booking-widget primary color aligned to the new brand
- `/edit` redirects to Settings (legacy route kept for bookmarks)
- Partner overview, menu, reservations, and related dashboard pages restyled with shared `PageHeader` / surface patterns
- Diner home, pricing, profile, reservations, waitlist, auth, and restaurant detail pages updated to the new visual language
- Shared `RestaurantCard`, `SlotPicker`, Ant Design theme, and embeddable widget styles follow the new tokens

### Docs

- README updated for packages, design system, and Settings
- `packages/ui/DESIGN.md` rewritten for the hospitality palette

## [0.1.0] — 2026-07-12

### Added

- Initial ReserveTable monorepo: GraphQL API, diner web, partner dashboard, mobile, shared UI, and booking widget
- Concurrent-safe booking via atomic table slot claims (no MongoDB replica set required)
- Deposits, waitlist, loyalty, reviews, menus, notifications, and auth (email, Google, phone OTP)
