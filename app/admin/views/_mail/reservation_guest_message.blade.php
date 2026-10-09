subject = "{{ $email_subject }}"
==
@if($locale === 'de')
Hallo {{ $customer_name }},

{{ $headline }}

{{ $intro }}

Reservierung: {{ $reference }}
Restaurant: {{ $restaurant_name }}
Datum: {{ $reservation_date }}
Uhrzeit: {{ $reservation_time }}
Personen: {{ $reservation_guests }}

Reservierung verwalten:
{{ $manage_url }}

{{ $footer }}
@elseif($locale === 'tr')
Merhaba {{ $customer_name }},

{{ $headline }}

{{ $intro }}

Rezervasyon: {{ $reference }}
Restoran: {{ $restaurant_name }}
Tarih: {{ $reservation_date }}
Saat: {{ $reservation_time }}
Kişi: {{ $reservation_guests }}

Rezervasyonu yönet:
{{ $manage_url }}

{{ $footer }}
@elseif($locale === 'ar')
مرحباً {{ $customer_name }},

{{ $headline }}

{{ $intro }}

الحجز: {{ $reference }}
المطعم: {{ $restaurant_name }}
التاريخ: {{ $reservation_date }}
الوقت: {{ $reservation_time }}
الأشخاص: {{ $reservation_guests }}

إدارة الحجز:
{{ $manage_url }}

{{ $footer }}
@else
Hello {{ $customer_name }},

{{ $headline }}

{{ $intro }}

Reservation: {{ $reference }}
Restaurant: {{ $restaurant_name }}
Date: {{ $reservation_date }}
Time: {{ $reservation_time }}
Guests: {{ $reservation_guests }}

Manage reservation:
{{ $manage_url }}

{{ $footer }}
@endif
==
<p>{{ $locale === 'de' ? 'Hallo' : ($locale === 'tr' ? 'Merhaba' : ($locale === 'ar' ? 'مرحباً' : 'Hello')) }} {{ $customer_name }},</p>
<p><strong>{{ $headline }}</strong></p>
<p>{{ $intro }}</p>
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px">
    <tr><td style="padding:5px 0"><strong>{{ $locale === 'de' ? 'Reservierung' : ($locale === 'tr' ? 'Rezervasyon' : ($locale === 'ar' ? 'الحجز' : 'Reservation')) }}</strong></td><td style="padding:5px 0">{{ $reference }}</td></tr>
    <tr><td style="padding:5px 0"><strong>{{ $locale === 'de' ? 'Restaurant' : ($locale === 'tr' ? 'Restoran' : ($locale === 'ar' ? 'المطعم' : 'Restaurant')) }}</strong></td><td style="padding:5px 0">{{ $restaurant_name }}</td></tr>
    <tr><td style="padding:5px 0"><strong>{{ $locale === 'de' ? 'Datum' : ($locale === 'tr' ? 'Tarih' : ($locale === 'ar' ? 'التاريخ' : 'Date')) }}</strong></td><td style="padding:5px 0">{{ $reservation_date }}</td></tr>
    <tr><td style="padding:5px 0"><strong>{{ $locale === 'de' ? 'Uhrzeit' : ($locale === 'tr' ? 'Saat' : ($locale === 'ar' ? 'الوقت' : 'Time')) }}</strong></td><td style="padding:5px 0">{{ $reservation_time }}</td></tr>
    <tr><td style="padding:5px 0"><strong>{{ $locale === 'de' ? 'Personen' : ($locale === 'tr' ? 'Kişi' : ($locale === 'ar' ? 'الأشخاص' : 'Guests')) }}</strong></td><td style="padding:5px 0">{{ $reservation_guests }}</td></tr>
</table>
<p>{{ $footer }}</p>

@partial('button', ['url' => $manage_url, 'type' => 'primary'])
@if($locale === 'de')Reservierung verwalten
@elseif($locale === 'tr')Rezervasyonu yönet
@elseif($locale === 'ar')إدارة الحجز
@else Manage reservation
@endif
@endpartial
