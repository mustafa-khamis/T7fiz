import { useI18n } from '../../i18n/I18nProvider.jsx';
import { Bone, ButtonBone, Lines, SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import styles from './Circles.module.css';

export function CircleSkeleton() {
  const { t } = useI18n();
  return (
    <SkeletonRegion className={`${styles.page} ${styles.narrow}`} label={t('circles.loadingCircle')}>
      <Lines size="small" widths={['12rem']} />
      <span className={styles.header}>
        <Lines size="h1" widths={['60%']} />
        <Lines widths={['100%', '75%']} />
      </span>
      <span className={styles.joinBox}>
        <Lines size="small" widths={['40%']} />
        <Bone height="6px" radius="pill" />
        <ButtonBone width="8rem" />
      </span>
      <span className={styles.panel}>
        <Lines size="h3" widths={['7rem']} />
        <span className={styles.facts}>
          {Array.from({ length: 4 }, (_, index) => (
            <Lines key={index} size="small" widths={['50%', '70%']} />
          ))}
        </span>
      </span>
    </SkeletonRegion>
  );
}
