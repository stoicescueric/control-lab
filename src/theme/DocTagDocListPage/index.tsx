import type {ReactNode} from 'react';
import OriginalDocTagDocListPage from '@theme-original/DocTagDocListPage';
import type {Props} from '@theme/DocTagDocListPage';

export default function DocTagDocListPage(props: Props): ReactNode {
  return (
    <OriginalDocTagDocListPage
      {...props}
      tag={{
        ...props.tag,
        description:
          props.tag.description ??
          `Explore Control Lab lessons about ${props.tag.label}, with robotics examples, equations, and interactive experiments.`,
      }}
    />
  );
}
