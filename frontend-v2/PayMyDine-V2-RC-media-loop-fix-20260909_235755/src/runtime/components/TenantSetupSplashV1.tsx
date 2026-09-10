import styles from './TenantSetupSplashV1.module.css'

const PMD_LOGO_SRC = 'https://tomo.paymydine.com/brand/paymydine-logo.svg'

export function TenantSetupSplashV1() {
  return (
    <main
      className={styles.shell}
      lang="en"
      dir="ltr"
      data-pmd-tenant-setup-splash="v2"
    >
      <section className={styles.card} aria-labelledby="pmd-tenant-setup-title">
        <img
          className={styles.logo}
          src={PMD_LOGO_SRC}
          alt="PayMyDine"
          loading="eager"
          decoding="async"
        />
        <p className={styles.eyebrow}>Getting started</p>
        <h1 className={styles.title} id="pmd-tenant-setup-title">Welcome to PayMyDine</h1>
        <p className={styles.copy}>
          Your digital menu is ready to set up. Add your menu, photos and restaurant details in the admin panel.
        </p>
        <a className={styles.action} href="/admin/pmdquicksetup">Set up my restaurant</a>
      </section>
    </main>
  )
}
