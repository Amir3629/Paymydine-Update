(function () {
    'use strict';

    var VERSION = '1.0.0';

    function readCookie(name) {
        var prefix = String(name || '') + '=';
        var parts = String(document.cookie || '').split(';');

        for (var i = 0; i < parts.length; i += 1) {
            var part = parts[i].trim();
            if (part.indexOf(prefix) !== 0) continue;

            try {
                return decodeURIComponent(part.slice(prefix.length));
            } catch (ignore) {
                return part.slice(prefix.length);
            }
        }

        return '';
    }

    function resolvedLocale() {
        var cookieLocale = String(readCookie('pmd_admin_locale') || '')
            .trim()
            .toLowerCase();

        if (cookieLocale) return cookieLocale;

        return String(
            window.PMD_ADMIN_LOCALE ||
            document.documentElement.lang ||
            'en'
        ).trim().toLowerCase();
    }

    if (resolvedLocale().indexOf('tr') !== 0) {
        return;
    }

    // Keep client-side locale consumers aligned even when the legacy EN/DE
    // bootstrap ran earlier in the page lifecycle.
    window.PMD_ADMIN_LOCALE = 'tr';
    document.documentElement.setAttribute('lang', 'tr');

    var catalogue = {
        // Navigation / global shell
        'Dashboard': 'Kontrol Paneli',
        'Orders': 'Siparişler',
        'Reservations': 'Rezervasyonlar',
        'Coupons & Gifts': 'Kuponlar ve Hediyeler',
        'Restaurant': 'Restoran',
        'Kitchen Display': 'Mutfak Ekranı',
        'Design': 'Tasarım',
        'System': 'Sistem',
        'Logout': 'Çıkış Yap',
        'Log out': 'Çıkış Yap',
        'Language': 'Dil',
        'Select language': 'Dil seçin',
        'Change language': 'Dili değiştir',
        'English': 'İngilizce',
        'German': 'Almanca',
        'Turkish': 'Türkçe',
        'Expand menu': 'Menüyü genişlet',
        'Collapse menu': 'Menüyü daralt',
        'Open navigation': 'Gezinmeyi aç',
        'Close navigation': 'Gezinmeyi kapat',
        'Locations': 'Konumlar',
        'Menu Items': 'Menü Ürünleri',
        'Categories': 'Kategoriler',
        'Mealtimes': 'Öğün Saatleri',
        'Tables': 'Masalar',
        'Themes': 'Temalar',
        'Mail Templates': 'E-posta Şablonları',
        'Settings': 'Ayarlar',
        'Staff': 'Personel',
        'Payments': 'Ödemeler',
        'Languages': 'Diller',
        'Currencies': 'Para Birimleri',

        // Shared actions / states
        'Add': 'Ekle',
        'Add New': 'Yeni Ekle',
        'Create': 'Oluştur',
        'Edit': 'Düzenle',
        'Edit order': 'Siparişi düzenle',
        'Delete': 'Sil',
        'Remove': 'Kaldır',
        'Save': 'Kaydet',
        'Save Changes': 'Değişiklikleri Kaydet',
        'Save & Close': 'Kaydet ve Kapat',
        'Cancel': 'İptal',
        'Close': 'Kapat',
        'Search': 'Ara',
        'Filter': 'Filtrele',
        'Refresh': 'Yenile',
        'Reload': 'Yeniden Yükle',
        'Reset': 'Sıfırla',
        'Apply': 'Uygula',
        'Apply changes': 'Değişiklikleri uygula',
        'Continue': 'Devam Et',
        'Back': 'Geri',
        'Next': 'İleri',
        'Previous': 'Önceki',
        'View': 'Görüntüle',
        'Preview': 'Önizleme',
        'Print': 'Yazdır',
        'Download': 'İndir',
        'Upload': 'Yükle',
        'Enable': 'Etkinleştir',
        'Disable': 'Devre Dışı Bırak',
        'Enabled': 'Etkin',
        'Disabled': 'Devre Dışı',
        'Active': 'Aktif',
        'Inactive': 'Pasif',
        'Yes': 'Evet',
        'No': 'Hayır',
        'All': 'Tümü',
        'None': 'Hiçbiri',
        'Select All': 'Tümünü Seç',
        'Clear': 'Temizle',
        'Confirm': 'Onayla',
        'Submit': 'Gönder',
        'Done': 'Tamam',
        'Retry': 'Tekrar Dene',
        'More': 'Daha Fazla',
        'Less': 'Daha Az',
        'Show': 'Göster',
        'Hide': 'Gizle',
        'Loading...': 'Yükleniyor...',
        'Saving...': 'Kaydediliyor...',
        'Deleting...': 'Siliniyor...',
        'No results found': 'Sonuç bulunamadı',
        'No data available': 'Veri yok',
        'Nothing found.': 'Hiçbir şey bulunamadı.',
        'Access denied.': 'Erişim reddedildi.',
        'Something went wrong.': 'Bir şeyler ters gitti.',
        'Please try again.': 'Lütfen tekrar deneyin.',

        // Generic fields
        'Today': 'Bugün',
        'Tomorrow': 'Yarın',
        'Yesterday': 'Dün',
        'Date': 'Tarih',
        'Time': 'Saat',
        'Date & Time': 'Tarih ve Saat',
        'Status': 'Durum',
        'Name': 'Ad',
        'Description': 'Açıklama',
        'Code': 'Kod',
        'Type': 'Tür',
        'Priority': 'Öncelik',
        'Created': 'Oluşturuldu',
        'Updated': 'Güncellendi',
        'Date Added': 'Eklenme Tarihi',
        'Date Updated': 'Güncelleme Tarihi',
        'Actions': 'İşlemler',
        'Details': 'Detaylar',
        'Notes': 'Notlar',
        'Note': 'Not',
        'Customer': 'Müşteri',
        'Customer Name': 'Müşteri Adı',
        'Phone': 'Telefon',
        'Telephone': 'Telefon',
        'Email': 'E-posta',
        'Address': 'Adres',
        'Location': 'Konum',
        'Area': 'Alan',
        'Capacity': 'Kapasite',
        'Guest': 'Misafir',
        'Guests': 'Misafirler',
        'Table': 'Masa',
        'Order': 'Sipariş',
        'Booking': 'Rezervasyon',
        'Bookings': 'Rezervasyonlar',

        // Owner / analytics dashboard
        'Revenue Today': 'Bugünkü Gelir',
        'Total Revenue': 'Toplam Gelir',
        'Total Sales': 'Toplam Satış',
        'Total Orders': 'Toplam Sipariş',
        'Total Customers': 'Toplam Müşteri',
        'Open Orders': 'Açık Siparişler',
        'Unpaid Orders': 'Ödenmemiş Siparişler',
        'Open Checks': 'Açık Hesaplar',
        'Active Tables': 'Aktif Masalar',
        'Reservations Today': 'Bugünkü Rezervasyonlar',
        'Waiter Calls': 'Garson Çağrıları',
        'Kitchen Queue': 'Mutfak Sırası',
        'Recent Activity': 'Son Etkinlikler',
        'Statistics': 'İstatistikler',
        'Revenue': 'Gelir',
        'Live Floor': 'Canlı Salon',
        'Live floor': 'Canlı salon',
        'Floor Overview': 'Salon Görünümü',
        'Needs Attention': 'Dikkat Gerektiriyor',
        'Needs attention': 'Dikkat gerektiriyor',
        'Available': 'Müsait',
        'Occupied': 'Dolu',
        'Reserved': 'Rezerve',
        'Cleaning': 'Temizleniyor',
        'No recent activity': 'Yakın zamanda etkinlik yok',
        'Guests Served': 'Hizmet Verilen Misafirler',
        'Table Turnover': 'Masa Devir Hızı',
        'Dine In / Take Away': 'Salonda / Paket',
        'Kitchen Ticket Time': 'Mutfak Fiş Süresi',
        'Current': 'Mevcut',
        'Connected': 'Bağlı',
        'Source unavailable': 'Veri kaynağı kullanılamıyor',
        'No completed records': 'Tamamlanmış kayıt yok',
        'sample': 'örnek',
        'samples': 'örnek',
        'Sales over time': 'Zamana Göre Satışlar',
        'Sales by category': 'Kategoriye Göre Satışlar',
        'Sales by hour': 'Saate Göre Satışlar',
        'Payment methods': 'Ödeme Yöntemleri',
        'Recent transactions': 'Son İşlemler',
        'Alerts': 'Uyarılar',
        'Live orders': 'Aktif Siparişler',
        'Order channels': 'Sipariş Kanalları',
        'Top-selling items': 'En Çok Satan Ürünler',
        'Tips summary': 'Bahşiş Özeti',
        'Latest reviews': 'Son Yorumlar',
        'Upcoming reservations': 'Yaklaşan Rezervasyonlar',
        'Upcoming events': 'Yaklaşan Etkinlikler',
        'Line': 'Çizgi',
        'Day': 'Gün',
        'Week': 'Hafta',
        'Month': 'Ay',
        'Range': 'Aralık',
        'Visible chart points': 'Görünür grafik noktaları',
        'Sales over time date range': 'Zamana göre satış tarih aralığı',
        'Sales by hour date range': 'Saate göre satış tarih aralığı',
        'No records': 'Kayıt yok',
        'No settled transactions in this period': 'Bu dönemde tamamlanmış işlem yok',
        'No settled transactions available': 'Tamamlanmış işlem yok',
        'No enabled payment methods in /admin/payments': '/admin/payments bölümünde etkin ödeme yöntemi yok',
        'failed payments': 'başarısız ödemeler',
        'refunds': 'iadeler',
        'long open tables': 'uzun süredir açık masalar',
        'out of stock': 'stokta yok',
        'negative reviews': 'olumsuz yorumlar',
        'live order': 'aktif sipariş',
        'live orders': 'aktif siparişler',
        'review today': 'bugünkü yorum',
        'reviews today': 'bugünkü yorumlar',
        'reservation today': 'bugünkü rezervasyon',
        'reservations today': 'bugünkü rezervasyonlar',
        'This month': 'Bu ay',
        'Average': 'Ortalama',
        'Tipped orders': 'Bahşişli siparişler',
        'Dine in': 'Salonda',
        'No table': 'Masa yok',
        'Open': 'Açık',
        'Dashboard analytics': 'Kontrol paneli analizleri',
        'Sales over time controls': 'Zamana göre satış kontrolleri',
        'Sales by category period': 'Kategoriye göre satış dönemi',
        'Payment methods period': 'Ödeme yöntemleri dönemi',
        'Order channels period': 'Sipariş kanalları dönemi',
        'Top-selling items period': 'En çok satan ürünler dönemi',
        'Breakdown chart': 'Dağılım grafiği',
        'Sales over time line chart': 'Zamana göre satış çizgi grafiği',
        'Sales over time bar chart': 'Zamana göre satış çubuk grafiği',
        'Sales by hour bar chart': 'Saate göre satış çubuk grafiği',
        'Takeaway': 'Paket',
        'event today': 'bugünkü etkinlik',
        'events today': 'bugünkü etkinlikler',
        'Not recorded': 'Kaydedilmemiş',
        'Choose KPI': 'KPI seç',
        'Visible in this card': 'Bu kartta görünür',
        'Already visible': 'Zaten görünür',
        'Show in this card': 'Bu kartta göster',
        'Table Occupancy': 'Masa Doluluk Oranı',
        'Menu Availability': 'Menü Kullanılabilirliği',
        'Tips': 'Bahşişler',
        'No orders in this period': 'Bu dönemde sipariş yok',
        'No items sold in this period': 'Bu dönemde ürün satılmadı',

        // Reservations
        "Today's Reservations": 'Bugünkü Rezervasyonlar',
        'Todays Reservations': 'Bugünkü Rezervasyonlar',
        'Upcoming Arrivals': 'Yaklaşan Varışlar',
        'Pending Confirmations': 'Bekleyen Onaylar',
        'Reservation Tables': 'Rezervasyon Masaları',
        'Bookings scheduled for today': 'Bugün için planlanan rezervasyonlar',
        'Guests expected to arrive soon': 'Yakında gelmesi beklenen misafirler',
        'Bookings requiring confirmation': 'Onay bekleyen rezervasyonlar',
        'Tables enabled for reservations': 'Rezervasyona açık masalar',
        'All areas': 'Tüm alanlar',
        'Bar': 'Bar',
        'Center': 'Merkez',
        'Family': 'Aile',
        'Group': 'Grup',
        'High': 'Yüksek masa',
        'Outdoor': 'Dış alan',
        'VIP': 'VIP',
        'Window': 'Pencere',
        'One row': 'Tek satır',
        'Upcoming': 'Yaklaşan',
        'Pending': 'Bekliyor',
        'Confirmed': 'Onaylandı',
        'Cancelled': 'İptal Edildi',
        'Completed': 'Tamamlandı',
        'Arrived': 'Geldi',
        'Seated': 'Masaya Alındı',
        'No show': 'Gelmedi',
        'New Reservation': 'Yeni Rezervasyon',
        'Add Reservation': 'Rezervasyon Ekle',
        'Edit Reservation': 'Rezervasyonu Düzenle',
        'Reservation Details': 'Rezervasyon Detayları',
        'Assign Table': 'Masa Ata',
        'Unassign Table': 'Masa Atamasını Kaldır',
        'Guest Count': 'Misafir Sayısı',
        'Reservation Time': 'Rezervasyon Saati',
        'Reservation Date': 'Rezervasyon Tarihi',
        'Duration': 'Süre',
        'Occasion': 'Etkinlik',
        'Special Requests': 'Özel İstekler',
        'Confirm Reservation': 'Rezervasyonu Onayla',
        'Cancel Reservation': 'Rezervasyonu İptal Et',

        // Orders / POS / waiter
        'New Order': 'Yeni Sipariş',
        'Order ID': 'Sipariş Kimliği',
        'Order Total': 'Sipariş Toplamı',
        'Subtotal': 'Ara Toplam',
        'Total': 'Toplam',
        'Payment': 'Ödeme',
        'Payment Method': 'Ödeme Yöntemi',
        'Cash': 'Nakit',
        'Card': 'Kart',
        'Delivery': 'Teslimat',
        'Pickup': 'Gel-Al',
        'Pick-up': 'Gel-Al',
        'Dine-in': 'Salonda',
        'Table Service': 'Masa Servisi',
        'Add Item': 'Ürün Ekle',
        'Edit Item': 'Ürünü Düzenle',
        'Remove Item': 'Ürünü Kaldır',
        'Send to Kitchen': 'Mutfağa Gönder',
        'Send to kitchen': 'Mutfağa gönder',
        'Start Preparing': 'Hazırlamaya Başla',
        'Start preparing': 'Hazırlamaya başla',
        'Mark Ready': 'Hazır Olarak İşaretle',
        'Mark ready': 'Hazır olarak işaretle',
        'Preparing': 'Hazırlanıyor',
        'Ready': 'Hazır',
        'Served': 'Servis Edildi',
        'Received': 'Alındı',
        'Paid': 'Ödendi',
        'Unpaid': 'Ödenmedi',
        'Partially Paid': 'Kısmen Ödendi',
        'Merge Tables': 'Masaları Birleştir',
        'Merge tables': 'Masaları birleştir',
        'Unmerge Tables': 'Masaları Ayır',
        'Unmerge tables': 'Masaları ayır',
        'Split Bill': 'Hesabı Böl',
        'Split bill': 'Hesabı böl',
        'Void Order': 'Siparişi İptal Et',
        'Void order': 'Siparişi iptal et',
        'Checkout': 'Ödeme',
        'Call Waiter': 'Garson Çağır',
        'Call waiter': 'Garson çağır',
        'Move Order': 'Siparişi Taşı',
        'Move Table': 'Masayı Taşı',
        'Assign Staff': 'Personel Ata',
        'Order Notes': 'Sipariş Notları',
        'Delivery Notes': 'Teslimat Notları',
        'No orders': 'Sipariş yok',
        'No Orders': 'Sipariş yok',

        // KDS / menu / system
        'All Stations': 'Tüm İstasyonlar',
        'All stations': 'Tüm istasyonlar',
        'New': 'Yeni',
        'In Progress': 'Devam Ediyor',
        'Waiting': 'Bekliyor',
        'Recall': 'Geri Çağır',
        'Bump': 'Tamamla',
        'Ticket': 'Fiş',
        'Tickets': 'Fişler',
        'Station': 'İstasyon',
        'Course': 'Servis Sırası',
        'Elapsed': 'Geçen Süre',
        'No tickets': 'Fiş yok',
        'Menu': 'Menü',
        'Category': 'Kategori',
        'Price': 'Fiyat',
        'Quantity': 'Adet',
        'Stock': 'Stok',
        'Manager': 'Yönetici',
        'Waiter': 'Garson',
        'Kitchen': 'Mutfak',
        'Menu Item': 'Menü Ürünü',
        'Item Name': 'Ürün Adı',
        'Option': 'Seçenek',
        'Options': 'Seçenekler',
        'Modifier': 'Ek Seçenek',
        'Modifiers': 'Ek Seçenekler',
        'Allergens': 'Alerjenler',
        'Specials': 'Özel Ürünler',
        'Available all day': 'Tüm gün mevcut',
        'Delivery Only': 'Yalnızca Teslimat',
        'Pick-up Only': 'Yalnızca Gel-Al',
        'Minimum Quantity': 'Minimum Adet',
        'Stock Quantity': 'Stok Adedi',
        'Manage Stock': 'Stok Yönetimi',
        'Notifications': 'Bildirimler',
        'No notifications found': 'Bildirim bulunamadı',
        'Mark all as read': 'Tümünü okundu olarak işaretle',
        'New notification': 'Yeni bildirim',
        'Order received': 'Sipariş alındı',
        'Order updated': 'Sipariş güncellendi',
        'Reservation created': 'Rezervasyon oluşturuldu',
        'Reservation updated': 'Rezervasyon güncellendi',
        'General': 'Genel',
        'Account': 'Hesap',
        'Profile': 'Profil',
        'Roles': 'Roller',
        'Permissions': 'İzinler',
        'Customer Groups': 'Müşteri Grupları',
        'Statuses': 'Durumlar',
        'Extensions': 'Eklentiler',
        'Media Manager': 'Medya Yöneticisi',
        'System Logs': 'Sistem Günlükleri',
        'Updates': 'Güncellemeler',
        'Tools': 'Araçlar',
        'Terminal Devices': 'Terminal Cihazları',
        'POS Devices': 'POS Cihazları',
        'Payment Gateways': 'Ödeme Sağlayıcıları',
        'Delivery Areas': 'Teslimat Bölgeleri',
        'Schedules': 'Programlar',
        'Opening Hours': 'Çalışma Saatleri',
        'Maintenance Mode': 'Bakım Modu'
    };

    var normalized = Object.create(null);
    var observer = null;
    var translating = false;

    function normalize(value) {
        return String(value || '')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    Object.keys(catalogue).forEach(function (source) {
        var target = catalogue[source];
        var clean = normalize(source);
        if (!clean || typeof target !== 'string' || !target.trim()) return;

        normalized[clean] = target;
        normalized[clean.replace(/\u2019/g, "'")] = target;
        normalized[clean.replace(/'/g, '\u2019')] = target;
    });

    function lookup(value) {
        var clean = normalize(value);
        var direct;
        var match;

        if (!clean) return value;

        direct = normalized[clean] || normalized[clean.replace(/\u2019/g, "'")];
        if (direct) return direct;

        match = clean.match(/^Order\s+#?(\d+)$/i);
        if (match) return 'Sipariş #' + match[1];

        match = clean.match(/^Table\s+(\d+)$/i);
        if (match) return 'Masa ' + match[1];

        match = clean.match(/^(\d+)\s+Guests?$/i);
        if (match) return match[1] + ' Misafir';

        match = clean.match(/^(\d+)\s+Bookings?$/i);
        if (match) return match[1] + ' Rezervasyon';

        match = clean.match(/^(\d+)\s+Reservations?$/i);
        if (match) return match[1] + ' Rezervasyon';

        match = clean.match(/^(\d+)\s+Orders?$/i);
        if (match) return match[1] + ' Sipariş';

        match = clean.match(/^(\d+)\s+Tables?$/i);
        if (match) return match[1] + ' Masa';

        match = clean.match(/^(\d+)\s+(.+)$/);
        if (match) {
            var counted = normalized[normalize(match[2])];
            if (counted) return match[1] + ' ' + counted;
        }

        match = clean.match(/^long open tables\s+\(>\s*(\d+)\s*min\)$/i);
        if (match) return 'uzun süredir açık masalar (> ' + match[1] + ' dk.)';

        match = clean.match(/^Page\s+(\d+)\s+of\s+(\d+)$/i);
        if (match) return 'Sayfa ' + match[1] + ' / ' + match[2];

        if (clean.indexOf(' · ') !== -1) {
            return clean.split(' · ').map(lookup).join(' · ');
        }

        if (clean.indexOf(' • ') !== -1) {
            return clean.split(' • ').map(lookup).join(' • ');
        }

        return value;
    }

    function shouldSkip(element) {
        if (!element || !element.closest) return true;

        return Boolean(element.closest([
            'script',
            'style',
            'textarea',
            'code',
            'pre',
            '[contenteditable="true"]',
            '[data-pmd-no-translate]',
            '[data-pmd-i18n-skip]'
        ].join(',')));
    }

    function translateTextNode(node) {
        if (!node || node.nodeType !== Node.TEXT_NODE) return;

        var parent = node.parentElement;
        if (!parent || shouldSkip(parent)) return;

        var original = node.nodeValue;
        var clean = normalize(original);
        if (!clean) return;

        var translated = lookup(clean);
        if (!translated || translated === clean || translated === original) return;

        var leading = (original.match(/^\s*/) || [''])[0];
        var trailing = (original.match(/\s*$/) || [''])[0];
        node.nodeValue = leading + translated + trailing;
    }

    function translateAttributes(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE || shouldSkip(element)) {
            return;
        }

        [
            'placeholder',
            'title',
            'aria-label',
            'data-original-title',
            'data-title'
        ].forEach(function (attribute) {
            if (!element.hasAttribute(attribute)) return;

            var current = element.getAttribute(attribute);
            var translated = lookup(current);
            if (translated && translated !== current) {
                element.setAttribute(attribute, translated);
            }
        });

        if (
            element.tagName === 'INPUT' &&
            ['button', 'submit', 'reset'].indexOf(String(element.type).toLowerCase()) !== -1
        ) {
            var translatedValue = lookup(element.value);
            if (translatedValue && translatedValue !== element.value) {
                element.value = translatedValue;
            }
        }
    }

    function translateRoot(root) {
        var walker;
        var node;

        if (!root) return;

        if (root.nodeType === Node.TEXT_NODE) {
            translateTextNode(root);
            return;
        }

        if (
            root.nodeType !== Node.ELEMENT_NODE &&
            root.nodeType !== Node.DOCUMENT_NODE
        ) {
            return;
        }

        if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);

        walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
        );

        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
            else translateAttributes(node);
        }
    }

    function observe() {
        if (!document.body) return;

        if (!observer) {
            observer = new MutationObserver(function (mutations) {
                if (translating) return;

                observer.disconnect();
                translating = true;

                try {
                    mutations.forEach(function (mutation) {
                        if (mutation.type === 'characterData') {
                            translateTextNode(mutation.target);
                            return;
                        }

                        if (mutation.type === 'attributes') {
                            translateAttributes(mutation.target);
                        }

                        mutation.addedNodes.forEach(translateRoot);
                    });
                } finally {
                    translating = false;
                    observe();
                }
            });
        }

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: [
                'placeholder',
                'title',
                'aria-label',
                'data-original-title',
                'data-title',
                'value'
            ]
        });
    }

    function run() {
        if (!document.body) return;

        if (observer) observer.disconnect();

        translating = true;
        try {
            translateRoot(document.body);
        } finally {
            translating = false;
        }

        observe();
    }

    window.PMDAdminI18nTR = {
        version: VERSION,
        locale: function () { return 'tr'; },
        entries: function () { return Object.keys(catalogue).length; },
        translate: lookup,
        run: run
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
        run();
    }

    document.addEventListener('ajaxUpdateComplete', run, true);
    document.addEventListener('ajaxPromiseDone', run, true);
    document.addEventListener('pageContentLoaded', run, true);
    window.addEventListener('load', run, { once: true });

    console.info('[PMD Admin I18n TR] Ready', {
        version: VERSION,
        locale: 'tr',
        entries: Object.keys(catalogue).length
    });
})();
