'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Typography } from 'antd';
import { PageHeader, spacing } from '@reservations/ui';
import { useAuth } from '@/lib/auth';
import { canManageQaChecklist } from '@reservations/shared';

const sections: { title: string; body: string[] }[] = [
  {
    title: 'How to test a release',
    body: [
      'Write the staging URL and commit in Environment / build on the checklist before you start. If that line is empty, the sign-off is hard to trust later.',
      'Read the latest release on the checklist, then open Versions if you need an older change. Test what is new first. Those items gate the release.',
      'Open an item for its steps. Follow them in the role the step names (diner, host, owner, or admin). Check the box only after you saw the result yourself.',
      'Required items must pass. Recommended items should pass; if one cannot, leave it unchecked and write a waiver in the note.',
      'Confirm open P0 bugs are zero, then sign off. The release stays active until every required item is checked and someone signs.',
    ],
  },
  {
    title: 'Best practices',
    body: [
      'Test the change, then one nearby flow that could break with it. A party-size change should also get one normal booking.',
      'Use an account that matches the step. A host check done while signed in as an owner does not count.',
      'Prefer a restaurant that already has the feature set up (card guarantee, floor plan, holiday catalog) over creating one mid-test.',
      'Re-check an item after a fix lands. An old tick from a previous build is not a pass for this release.',
      'Do not sign off from memory of the last version. The checklist is the record for this release only.',
    ],
  },
  {
    title: 'Tips',
    body: [
      'Slow the network when a step mentions loading or layout. Stars, photos, and the sidebar are the usual places that fail before styles arrive.',
      'Check a phone-width window for diner home, discovery, and the partner sidebar. Desktop-only passes miss those.',
      'For email steps, a recorded stub is a pass when SendGrid is not set up. Write “stubbed” in the note so the next person knows.',
      'If a step has two modes (manual no-show and auto no-show, for example), both modes need a look before the box is checked.',
      'Keep the details panel open while you test. The steps stay there; the list itself only shows the item and whether it is done.',
    ],
  },
  {
    title: 'How to report a problem',
    body: [
      'File the problem on Issues (title, path, severity, tags, and a screenshot). Leave the checklist item unchecked, and add a short note there if it blocks sign-off.',
      'Start the note with severity. P0 blocks the release (data loss, payments, sign-in, or a required item that cannot be completed). P1 should be fixed before ship. P2 can follow in a later release.',
      'Include the version, the environment URL, the role you used, and the restaurant or account. Then the steps you took, what you expected, and what happened instead.',
      'Add a screenshot or a short recording when the bug is visual. Name the screen (Partner Hub → Closures, diner home, embed widget).',
      'One note per problem. If two items fail for the same bug, mention the other item id so they can be closed together.',
    ],
  },
];

export default function AdminQaGuidePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const allowed = Boolean(user && canManageQaChecklist(user.role));

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canManageQaChecklist(user.role)) router.replace('/overview');
  }, [authLoading, user, router]);

  if (!allowed) return null;

  return (
    <div>
      <PageHeader
        title="QA guide"
        subtitle="How to test a release, what good coverage looks like, and how to write a report someone else can reproduce."
      />
      <Typography.Paragraph>
        Work from the <Link href="/admin/qa">checklist</Link>. File bugs and features on{' '}
        <Link href="/admin/qa/issues">Issues</Link>. Past changes are on{' '}
        <Link href="/admin/qa/versions">Versions</Link>.
      </Typography.Paragraph>
      {sections.map((section) => (
        <section key={section.title} style={{ marginBottom: spacing.lg }}>
          <Typography.Title level={4}>{section.title}</Typography.Title>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {section.body.map((paragraph) => (
              <li key={paragraph} style={{ marginBottom: spacing.sm }}>
                {paragraph}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
