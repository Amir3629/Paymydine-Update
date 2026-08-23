import styles from './TenantSetupWelcome.module.css'

type Props = {
  restaurantName?: string | null
}

export function TenantSetupWelcome({ restaurantName }: Props) {
  const name = String(restaurantName || '').trim()

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="pmd-tenant-setup-title">
        <div className={styles.mark} aria-hidden="true">PMD</div>
        <span className={styles.eyebrow}>Welcome to PayMyDine</span>
        <h1 id="pmd-tenant-setup-title">
          {name ? `${name} is ready to set up.` : 'Your restaurant is ready to set up.'}
        </h1>
        <p>
          Your digital menu is still empty. Continue in the Admin Dashboard to add your restaurant basics and menu.
        </p>
        <a className={styles.button} href="/admin/dashboardlab">
          Open Admin Dashboard
        </a>
      </section>
    </main>
  )
}
