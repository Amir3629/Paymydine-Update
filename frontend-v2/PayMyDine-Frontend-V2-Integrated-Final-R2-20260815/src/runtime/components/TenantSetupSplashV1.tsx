import styles from './TenantSetupSplashV1.module.css'

type SetupCopy = {
  eyebrow: string
  title: string
  body: string
  action: string
  hint: string
}

const COPY: Record<string, SetupCopy> = {
  en: {
    eyebrow: 'Restaurant setup',
    title: 'Welcome to PayMyDine',
    body: 'Your restaurant frontend is ready. Set up your menu, categories, images, and restaurant details from the admin panel.',
    action: 'Set up your restaurant',
    hint: 'This setup screen disappears automatically as soon as your menu is ready.',
  },
  de: {
    eyebrow: 'Restaurant einrichten',
    title: 'Willkommen bei PayMyDine',
    body: 'Ihr Restaurant-Frontend ist bereit. Richten Sie im Admin-Bereich Menü, Kategorien, Bilder und Restaurantdetails ein.',
    action: 'Restaurant einrichten',
    hint: 'Diese Einrichtungsseite verschwindet automatisch, sobald Ihr Menü bereit ist.',
  },
  tr: {
    eyebrow: 'Restoran kurulumu',
    title: "PayMyDine'a hoş geldiniz",
    body: 'Restoran arayüzünüz hazır. Yönetim panelinden menünüzü, kategorilerinizi, görsellerinizi ve restoran bilgilerinizi ayarlayın.',
    action: 'Restoranı kur',
    hint: 'Menünüz hazır olduğunda bu kurulum ekranı otomatik olarak kaybolur.',
  },
  fa: {
    eyebrow: 'راه‌اندازی رستوران',
    title: 'به PayMyDine خوش آمدید',
    body: 'صفحه مشتری رستوران شما آماده است. منو، دسته‌بندی‌ها، تصاویر و اطلاعات رستوران را از پنل مدیریت تنظیم کنید.',
    action: 'راه‌اندازی رستوران',
    hint: 'به محض آماده شدن منو، این صفحه راه‌اندازی به‌صورت خودکار ناپدید می‌شود.',
  },
  ar: {
    eyebrow: 'إعداد المطعم',
    title: 'مرحباً بك في PayMyDine',
    body: 'واجهة مطعمك جاهزة. قم بإعداد القائمة والفئات والصور وبيانات المطعم من لوحة الإدارة.',
    action: 'إعداد المطعم',
    hint: 'تختفي شاشة الإعداد تلقائياً بمجرد أن تصبح قائمتك جاهزة.',
  },
  ja: {
    eyebrow: 'レストラン設定',
    title: 'PayMyDineへようこそ',
    body: 'レストランのフロント画面は準備できています。管理画面からメニュー、カテゴリ、画像、店舗情報を設定してください。',
    action: 'レストランを設定',
    hint: 'メニューの準備ができると、この設定画面は自動的に表示されなくなります。',
  },
}

function localeCode(locale: string): string {
  return String(locale || 'en').trim().toLowerCase().replace('_', '-').split('-')[0] || 'en'
}

export function TenantSetupSplashV1({ locale }: { locale: string }) {
  const code = localeCode(locale)
  const copy = COPY[code] || COPY.en
  const direction = code === 'fa' || code === 'ar' ? 'rtl' : 'ltr'

  return (
    <main className={styles.shell} dir={direction} data-pmd-tenant-setup-splash="v1">
      <section className={styles.card} aria-labelledby="pmd-tenant-setup-title">
        <div className={styles.brandMark} aria-hidden="true">P</div>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={styles.title} id="pmd-tenant-setup-title">{copy.title}</h1>
        <p className={styles.copy}>{copy.body}</p>
        <a className={styles.action} href="/admin">{copy.action}</a>
        <p className={styles.hint}>{copy.hint}</p>
      </section>
    </main>
  )
}
