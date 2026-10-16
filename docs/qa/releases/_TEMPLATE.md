# Manual QA — release vX.Y.Z

**Status:** `Active` · `Ready to sign` · `Signed off`  
**Source:** `CHANGELOG.md` section `[X.Y.Z]` / `[Unreleased]`  
**Env:** _______________ **Commit / build:** _______________

> **Gate rule:** Status stays **Active** until every **Required** item below is checked.  
> Only then set **Ready to sign**, fill sign-off, and mark **Signed off**.

---

## Automation (pre-manual)

- [ ] `pnpm test` green (unit + API)
- [ ] Optional: `pnpm test:e2e:smoke` against this env

---

## Release delta — Required

Copy bullets from CHANGELOG Added / Changed / Fixed that need human verification. One checkbox per testable item.

### Added

- [ ] …

### Changed

- [ ] …

### Fixed

- [ ] …

---

## Release delta — Recommended

- [ ] …

---

## Role smoke (surfaces touched this release)

- [ ] Diner web
- [ ] Diner mobile (if touched)
- [ ] Partner Hub — owner
- [ ] Partner Hub — manager / host (if touched)
- [ ] Merchant mobile (if touched)
- [ ] Admin (if touched)

---

## Defects

| ID | Severity | Summary | Status |
|---|---|---|---|
| | P0/P1/P2 | | Open / Fixed |

**Open P0 count must be 0 to sign off.**

---

## Sign-off

| Field | Value |
|---|---|
| Status | Active / Ready to sign / **Signed off** |
| Signed off by | |
| Role / team | |
| Date (YYYY-MM-DD) | |
| Timezone | |
| Confirms | All Required release-delta items tested; open P0 = 0 |
| Notes / waivers | |

```text
I confirm the Required items for vX.Y.Z were manually verified on the environment above.

Signature: __________________  Date: __________
```
