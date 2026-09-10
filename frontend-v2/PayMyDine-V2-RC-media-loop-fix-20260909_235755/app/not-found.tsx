import styles from './error.module.css'

export default function NotFoundPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p>PayMyDine</p>
        <h1>Menu not found</h1>
        <p>The requested table, theme preview or menu route is not available.</p>
        <a className={styles.retry} href="/">Return to the menu</a>
      </section>
    </main>
  )
}
