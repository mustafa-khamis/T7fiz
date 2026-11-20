import { useI18n } from '../../i18n/I18nProvider.jsx';
import { Bone, ButtonBone, Circle, FieldBone, Lines, SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import avatarStyles from './AvatarField.module.css';
import styles from './AccountPage.module.css';

/**
 * The account page while it loads: same grid, same panels, the avatar circle
 * and its button, each field at its real height — built from the page's own
 * styles so the swap to real content does not move anything.
 */
export function AccountSkeleton() {
  const { t } = useI18n();
  return (
    <SkeletonRegion className={styles.page} label={t('account.loading')}>
      <div className={styles.header}>
        <Lines size="h1" widths={['9rem']} />
        <ButtonBone width="7.5rem" />
      </div>
      <AccountBodySkeleton />
    </SkeletonRegion>
  );
}

/** The part below the header (used inside the real page while /me loads). */
export function AccountBodySkeleton() {
  return (
    <div className={styles.form}>
      <section className={styles.panel}>
        <Lines size="h3" widths={['8rem']} />
        <span className={avatarStyles.field}>
          <span className={avatarStyles.row}>
            <Circle size="4.5rem" />
            <ButtonBone size="sm" width="7rem" />
          </span>
          <Lines size="small" widths={['85%']} />
        </span>
        <FieldBone labelWidth="3rem" />
        <FieldBone labelWidth="7rem" readOnly hint />
        <FieldBone labelWidth="3.5rem" readOnly hint />
      </section>
      <section className={styles.panel}>
        <Lines size="h3" widths={['6rem']} />
        <FieldBone labelWidth="3.5rem" />
        <FieldBone labelWidth="6rem" hint />
        <FieldBone labelWidth="6.5rem" />
        <FieldBone labelWidth="4rem" hint />
      </section>
      <div className={styles.actions}>
        <ButtonBone width="6rem" />
      </div>
      <section className={styles.panel}>
        <Lines size="h3" widths={['5rem']} />
        <Bone height="0.9rem" width="80%" />
      </section>
    </div>
  );
}
