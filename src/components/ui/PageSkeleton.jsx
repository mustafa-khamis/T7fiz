import { Lines, SkeletonRegion } from './Skeleton.jsx';
import styles from './PageSkeleton.module.css';

/** Fallback page shape (title + paragraphs) for routes without their own skeleton. */
export function PageSkeleton() {
  return (
    <SkeletonRegion className={styles.page}>
      <Lines size="h1" widths={['55%']} />
      <Lines widths={['100%', '96%', '70%']} />
      <Lines widths={['100%', '88%']} />
    </SkeletonRegion>
  );
}
