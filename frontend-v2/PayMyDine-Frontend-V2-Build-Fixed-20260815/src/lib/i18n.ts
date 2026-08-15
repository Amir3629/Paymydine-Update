export type UiLabels = {
  menu: string
  search: string
  all: string
  table: string
  language: string
  valet: string
  callWaiter: string
  leaveNote: string
  callRestaurant: string
  social: string
  cart: string
  tableOrder: string
  checkout: string
  add: string
  unavailable: string
  vegan: string
  vegetarian: string
  halal: string
  allergens: string
  nutrition: string
  calories: string
  quantity: string
  options: string
  close: string
  send: string
  confirmItems: string
  submitKitchen: string
  orderStatus: string
  received: string
  preparing: string
  ready: string
  payment: string
  splitBill: string
  equalSplit: string
  itemSplit: string
  shareSplit: string
  people: string
  selectItems: string
  tip: string
  coupon: string
  apply: string
  pay: string
  cash: string
  notePlaceholder: string
  waiterConfirm: string
  valetName: string
  licensePlate: string
  carMake: string
  requestValet: string
  emptyCart: string
  continueMenu: string
  total: string
  remaining: string
  paid: string
  pending: string
  service: string
  added: string
  success: string
  error: string
  poweredBy: string
  estimatedReady: string
  minutes: string
  noPaymentMethods: string
  paymentSessionReady: string
}

const en: UiLabels = {
  menu: 'Menu', search: 'Search dishes and drinks', all: 'All', table: 'Table', language: 'Language', valet: 'Valet',
  callWaiter: 'Call waiter', leaveNote: 'Leave a note', callRestaurant: 'Call to order', social: 'Social', cart: 'My order',
  tableOrder: 'Table order', checkout: 'Checkout', add: 'Add', unavailable: 'Unavailable', vegan: 'Vegan', vegetarian: 'Vegetarian',
  halal: 'Halal', allergens: 'Allergens', nutrition: 'Nutrition', calories: 'Calories', quantity: 'Quantity', options: 'Options',
  close: 'Close', send: 'Send', confirmItems: 'Confirm my items', submitKitchen: 'Send table order to kitchen', orderStatus: 'Order status',
  received: 'Received', preparing: 'Preparing', ready: 'Ready for your table', payment: 'Payment', splitBill: 'Split bill', equalSplit: 'Equal split',
  itemSplit: 'By items', shareSplit: 'By shares', people: 'People', selectItems: 'Select items', tip: 'Tip', coupon: 'Coupon', apply: 'Apply',
  pay: 'Pay', cash: 'Cash', notePlaceholder: 'Allergy, celebration or a message for the team…', waiterConfirm: 'Notify a waiter for this table?',
  valetName: 'Your name', licensePlate: 'License plate', carMake: 'Car make / model', requestValet: 'Request valet', emptyCart: 'Your personal cart is empty.',
  continueMenu: 'Continue ordering', total: 'Total', remaining: 'Remaining', paid: 'Paid', pending: 'Pending', service: 'Service', added: 'Added',
  success: 'Done', error: 'Something went wrong', poweredBy: 'Powered by PayMyDine', estimatedReady: 'Estimated ready', minutes: 'min',
  noPaymentMethods: 'No payment methods are currently enabled for this restaurant.', paymentSessionReady: 'Payment session created.',
}

const de: UiLabels = {
  ...en,
  menu: 'Speisekarte', search: 'Gerichte und Getränke suchen', all: 'Alle', table: 'Tisch', language: 'Sprache', valet: 'Parkservice',
  callWaiter: 'Kellner rufen', leaveNote: 'Notiz hinterlassen', callRestaurant: 'Telefonisch bestellen', cart: 'Meine Bestellung',
  tableOrder: 'Tischbestellung', checkout: 'Bezahlen', add: 'Hinzufügen', unavailable: 'Nicht verfügbar', vegan: 'Vegan', vegetarian: 'Vegetarisch',
  allergens: 'Allergene', nutrition: 'Nährwerte', calories: 'Kalorien', quantity: 'Menge', options: 'Optionen', close: 'Schließen', send: 'Senden',
  confirmItems: 'Meine Artikel bestätigen', submitKitchen: 'Tischbestellung an die Küche senden', orderStatus: 'Bestellstatus', received: 'Eingegangen',
  preparing: 'In Zubereitung', ready: 'Bereit für Ihren Tisch', payment: 'Zahlung', splitBill: 'Rechnung teilen', equalSplit: 'Gleichmäßig',
  itemSplit: 'Nach Artikeln', shareSplit: 'Nach Anteilen', people: 'Personen', selectItems: 'Artikel auswählen', tip: 'Trinkgeld', coupon: 'Gutschein',
  apply: 'Anwenden', pay: 'Bezahlen', cash: 'Bar', notePlaceholder: 'Allergie, Anlass oder Nachricht an das Team…',
  waiterConfirm: 'Einen Kellner für diesen Tisch benachrichtigen?', valetName: 'Ihr Name', licensePlate: 'Kennzeichen', carMake: 'Automarke / Modell',
  requestValet: 'Parkservice anfordern', emptyCart: 'Ihr persönlicher Warenkorb ist leer.', continueMenu: 'Weiter bestellen', total: 'Gesamt',
  remaining: 'Offen', paid: 'Bezahlt', pending: 'Offen', service: 'Service', added: 'Hinzugefügt', success: 'Erledigt',
  estimatedReady: 'Voraussichtlich fertig', minutes: 'Min.', noPaymentMethods: 'Für dieses Restaurant sind derzeit keine Zahlungsmethoden aktiviert.', paymentSessionReady: 'Zahlungssitzung erstellt.',
}

const fa: UiLabels = {
  ...en,
  menu: 'منو', search: 'جستجوی غذا و نوشیدنی', all: 'همه', table: 'میز', language: 'زبان', valet: 'پارکبان',
  callWaiter: 'صدا کردن گارسون', leaveNote: 'ارسال یادداشت', callRestaurant: 'سفارش تلفنی', cart: 'سفارش من', tableOrder: 'سفارش میز',
  checkout: 'پرداخت', add: 'افزودن', unavailable: 'ناموجود', vegan: 'وگان', vegetarian: 'گیاه‌خواری', halal: 'حلال', allergens: 'آلرژن‌ها',
  nutrition: 'ارزش غذایی', calories: 'کالری', quantity: 'تعداد', options: 'انتخاب‌ها', close: 'بستن', send: 'ارسال',
  confirmItems: 'تأیید آیتم‌های من', submitKitchen: 'ارسال سفارش میز به آشپزخانه', orderStatus: 'وضعیت سفارش', received: 'دریافت شد',
  preparing: 'در حال آماده‌سازی', ready: 'آماده برای میز شما', payment: 'پرداخت', splitBill: 'تقسیم صورتحساب', equalSplit: 'تقسیم مساوی',
  itemSplit: 'بر اساس آیتم', shareSplit: 'بر اساس سهم', people: 'نفر', selectItems: 'انتخاب آیتم‌ها', tip: 'انعام', coupon: 'کد تخفیف',
  apply: 'اعمال', pay: 'پرداخت', cash: 'نقدی', notePlaceholder: 'آلرژی، مناسبت یا پیامی برای کارکنان…',
  waiterConfirm: 'گارسون برای این میز مطلع شود؟', valetName: 'نام شما', licensePlate: 'پلاک خودرو', carMake: 'مدل خودرو',
  requestValet: 'درخواست پارکبان', emptyCart: 'سبد شخصی شما خالی است.', continueMenu: 'ادامه سفارش', total: 'جمع', remaining: 'باقی‌مانده',
  paid: 'پرداخت‌شده', pending: 'در انتظار', service: 'خدمات', added: 'اضافه شد', success: 'انجام شد', error: 'خطایی رخ داد',
  estimatedReady: 'زمان تقریبی آماده‌شدن', minutes: 'دقیقه', noPaymentMethods: 'در حال حاضر روش پرداختی برای این رستوران فعال نیست.', paymentSessionReady: 'جلسه پرداخت ایجاد شد.',
}

const tr: UiLabels = {
  ...en,
  menu: 'Menü', search: 'Yemek ve içecek ara', all: 'Tümü', table: 'Masa', language: 'Dil', valet: 'Vale',
  callWaiter: 'Garson çağır', leaveNote: 'Not bırak', callRestaurant: 'Telefonla sipariş', cart: 'Siparişim', tableOrder: 'Masa siparişi',
  checkout: 'Ödeme', add: 'Ekle', unavailable: 'Mevcut değil', vegan: 'Vegan', vegetarian: 'Vejetaryen', halal: 'Helal', allergens: 'Alerjenler',
  nutrition: 'Besin değeri', calories: 'Kalori', quantity: 'Adet', options: 'Seçenekler', close: 'Kapat', send: 'Gönder',
  confirmItems: 'Ürünlerimi onayla', submitKitchen: 'Masa siparişini mutfağa gönder', orderStatus: 'Sipariş durumu', received: 'Alındı',
  preparing: 'Hazırlanıyor', ready: 'Masanız için hazır', payment: 'Ödeme', splitBill: 'Hesabı böl', equalSplit: 'Eşit böl',
  itemSplit: 'Ürünlere göre', shareSplit: 'Paylara göre', people: 'Kişi', selectItems: 'Ürün seç', tip: 'Bahşiş', coupon: 'Kupon',
  apply: 'Uygula', pay: 'Öde', cash: 'Nakit', notePlaceholder: 'Alerji, kutlama veya ekibe bir mesaj…',
  waiterConfirm: 'Bu masa için garson bilgilendirilsin mi?', valetName: 'Adınız', licensePlate: 'Plaka', carMake: 'Araç marka / model',
  requestValet: 'Vale çağır', emptyCart: 'Kişisel sepetiniz boş.', continueMenu: 'Siparişe devam et', total: 'Toplam', remaining: 'Kalan',
  paid: 'Ödendi', pending: 'Bekliyor', service: 'Hizmet', added: 'Eklendi', success: 'Tamamlandı',
  estimatedReady: 'Tahmini hazır olma', minutes: 'dk', noPaymentMethods: 'Bu restoran için şu anda ödeme yöntemi etkin değil.', paymentSessionReady: 'Ödeme oturumu oluşturuldu.',
}

const ja: UiLabels = {
  ...en,
  menu: 'メニュー', search: '料理・ドリンクを検索', all: 'すべて', table: 'テーブル', language: '言語', valet: 'バレー',
  callWaiter: 'スタッフを呼ぶ', leaveNote: 'メモを送る', callRestaurant: '電話で注文', cart: 'マイオーダー', tableOrder: 'テーブルオーダー',
  checkout: 'お会計', add: '追加', unavailable: '売り切れ', vegan: 'ヴィーガン', vegetarian: 'ベジタリアン', halal: 'ハラール',
  allergens: 'アレルゲン', nutrition: '栄養情報', calories: 'カロリー', quantity: '数量', options: 'オプション', close: '閉じる', send: '送信',
  confirmItems: '自分の料理を確定', submitKitchen: 'キッチンへ送信', orderStatus: '注文状況', received: '受付済み', preparing: '調理中',
  ready: 'まもなくお届け', payment: '支払い', splitBill: '割り勘', equalSplit: '均等', itemSplit: '料理ごと', shareSplit: '割合',
  people: '人数', selectItems: '料理を選択', tip: 'チップ', coupon: 'クーポン', apply: '適用', pay: '支払う', cash: '現金',
  notePlaceholder: 'アレルギー、お祝い、スタッフへのメッセージ…', waiterConfirm: 'スタッフをテーブルに呼びますか？',
  valetName: 'お名前', licensePlate: 'ナンバープレート', carMake: '車種', requestValet: 'バレーを依頼', emptyCart: 'カートは空です。',
  continueMenu: 'メニューに戻る', total: '合計', remaining: '残額', paid: '支払済み', pending: '保留中', service: 'サービス', added: '追加しました', success: '完了',
  estimatedReady: '完成予定', minutes: '分', noPaymentMethods: '現在このレストランで利用できる支払い方法はありません。', paymentSessionReady: '支払いセッションを作成しました。',
}

const dictionaries: Record<string, UiLabels> = { en, de, fa, tr, ja }

export function getLabels(locale: string): UiLabels {
  return dictionaries[locale.toLowerCase()] ?? en
}

export function isRtlLocale(locale: string): boolean {
  return ['fa', 'ar', 'he', 'ur'].includes(locale.toLowerCase())
}

export function localeBase(locale: string): string {
  return String(locale || 'en').trim().toLowerCase().split('-')[0] || 'en'
}

export function localizeMenuItem<T extends { name: string; description: string; translations?: Record<string, { name?: string; description?: string }> }>(item: T, locale: string): T {
  const exact = String(locale || '').trim().toLowerCase()
  const base = localeBase(locale)
  const translation = item.translations?.[exact] || item.translations?.[base]
  if (!translation) return item
  return {
    ...item,
    name: translation.name || item.name,
    description: translation.description || item.description,
  }
}

export function localizeMenuCategory<T extends { name: string; translations?: Record<string, string> }>(category: T, locale: string): T {
  const exact = String(locale || '').trim().toLowerCase()
  const base = localeBase(locale)
  const translated = category.translations?.[exact] || category.translations?.[base]
  return translated ? { ...category, name: translated } : category
}
