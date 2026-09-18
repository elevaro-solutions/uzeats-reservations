# Dashboard — Learnings & Observations

## [2026-09-18] Mobile nav Drawer must not sit in a Layout flex row
- Ant Design 6 `Layout` with `has-sider` is `flex-direction: row` and sets direct child `.ant-layout` to `width: 0`. A left `Drawer` as a sibling of `Sider`/`Content` can leave an empty column even when closed. Keep the desktop `Sider` in a `hasSider` row; portal the mobile `Drawer` to `document.body` outside that Layout.
- Partner `/notifications` also skipped the default `.rt-dash-content` `max-width: 1200px` (`margin: 0 auto`) so the page fills the column after the primary nav instead of looking like a second sidebar gap.
- Why it matters: An empty strip next to the sidebar is usually a Layout child or centered max-width, not a second Menu.
