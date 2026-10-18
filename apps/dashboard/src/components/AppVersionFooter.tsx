'use client';

import Link from 'next/link';
import { useQuery } from '@/lib/apollo-hooks';
import { APP_VERSION } from '@/lib/graphql';

export function AppVersionFooter() {
  const { data, loading } = useQuery(APP_VERSION);
  const version = data?.appReleaseNotes?.version as string | undefined;

  return (
    <Link
      href="/release-notes"
      className="rt-dash-sider__version"
      aria-label={version ? `Version ${version}, open release notes` : 'Open release notes'}
    >
      {version ? `v${version}` : loading ? '…' : 'Release notes'}
    </Link>
  );
}
