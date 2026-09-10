import type {ReactNode} from 'react';
import Head from '@docusaurus/Head';
import OriginalDocTagsListPage from '@theme-original/DocTagsListPage';
import type {Props} from '@theme/DocTagsListPage';

export default function DocTagsListPage(props: Props): ReactNode {
  return (
    <>
      <Head>
        <meta
          name="description"
          content="Browse Control Lab by topic: control theory, state estimation, FTC programming, and interactive robotics lessons."
        />
      </Head>
      <OriginalDocTagsListPage {...props} />
    </>
  );
}
