subject = "{{ $email_subject }}"
==
@if($locale === 'de')
Hallo {{ $customer_name }},

Ihre Reservierung {{ $reference }} bei {{ $restaurant_name }} am {{ $reservation_date }} um {{ $reservation_time }} Uhr für {{ $reservation_guests }} Personen wurde mit einer Kartengarantie bestätigt.

Jetzt wurde nichts belastet.
Maximale mögliche Ausfallentschädigung: {{ $guarantee_amount }} (bis zu {{ $guarantee_per_guest_amount }} pro Person).
@if($free_cancellation_deadline)
Kostenfreie Stornierung ist bis {{ $free_cancellation_deadline }} Uhr möglich.
@endif

Die von Ihnen akzeptierten Bedingungen (Version {{ $guarantee_terms_version }}):
{{ $guarantee_terms }}

Ihre Zustimmung:
{{ $guarantee_consent }}

Reservierung verwalten:
{{ $manage_url }}

Bitte bewahren Sie diese E-Mail als Bestätigung der vereinbarten Bedingungen auf.
@elseif($locale === 'tr')
Merhaba {{ $customer_name }},

{{ $restaurant_name }} için {{ $reservation_date }} tarihinde saat {{ $reservation_time }} rezervasyonunuz ({{ $reference }}, {{ $reservation_guests }} kişi) kart garantisiyle onaylandı.

Şu anda herhangi bir ücret alınmadı.
Olası azami no-show tazminatı: {{ $guarantee_amount }} (kişi başı en fazla {{ $guarantee_per_guest_amount }}).
@if($free_cancellation_deadline)
Ücretsiz iptal son zamanı: {{ $free_cancellation_deadline }}.
@endif

Kabul ettiğiniz koşullar (sürüm {{ $guarantee_terms_version }}):
{{ $guarantee_terms }}

Onayınız:
{{ $guarantee_consent }}

Rezervasyonu yönetin:
{{ $manage_url }}

Lütfen bu e-postayı kabul edilen koşulların teyidi olarak saklayın.
@elseif($locale === 'ar')
مرحباً {{ $customer_name }},

تم تأكيد حجزك {{ $reference }} لدى {{ $restaurant_name }} بتاريخ {{ $reservation_date }} الساعة {{ $reservation_time }} لعدد {{ $reservation_guests }} أشخاص مع ضمان البطاقة.

لم يتم خصم أي مبلغ الآن.
الحد الأقصى المحتمل لتعويض عدم الحضور: {{ $guarantee_amount }} (حتى {{ $guarantee_per_guest_amount }} لكل شخص).
@if($free_cancellation_deadline)
يمكن الإلغاء مجاناً حتى {{ $free_cancellation_deadline }}.
@endif

الشروط التي وافقت عليها (الإصدار {{ $guarantee_terms_version }}):
{{ $guarantee_terms }}

موافقتك:
{{ $guarantee_consent }}

إدارة الحجز:
{{ $manage_url }}

يرجى الاحتفاظ بهذه الرسالة كتأكيد للشروط المتفق عليها.
@else
Hello {{ $customer_name }},

Your reservation {{ $reference }} at {{ $restaurant_name }} on {{ $reservation_date }} at {{ $reservation_time }} for {{ $reservation_guests }} guests was confirmed with a card guarantee.

Nothing was charged now.
Maximum possible no-show compensation: {{ $guarantee_amount }} (up to {{ $guarantee_per_guest_amount }} per guest).
@if($free_cancellation_deadline)
Free cancellation is available until {{ $free_cancellation_deadline }}.
@endif

The terms you accepted (version {{ $guarantee_terms_version }}):
{{ $guarantee_terms }}

Your consent:
{{ $guarantee_consent }}

Manage reservation:
{{ $manage_url }}

Please keep this email as confirmation of the agreed terms.
@endif
==
@if($locale === 'de')
<p>Hallo {{ $customer_name }},</p>
<p>Ihre Reservierung <strong>{{ $reference }}</strong> bei <strong>{{ $restaurant_name }}</strong> am {{ $reservation_date }} um {{ $reservation_time }} Uhr für {{ $reservation_guests }} Personen wurde mit einer Kartengarantie bestätigt.</p>
<p><strong>Jetzt wurde nichts belastet.</strong><br>Maximale mögliche Ausfallentschädigung: <strong>{{ $guarantee_amount }}</strong> (bis zu {{ $guarantee_per_guest_amount }} pro Person).</p>
@if($free_cancellation_deadline)<p>Kostenfreie Stornierung ist bis <strong>{{ $free_cancellation_deadline }} Uhr</strong> möglich.</p>@endif
<p><strong>Die von Ihnen akzeptierten Bedingungen (Version {{ $guarantee_terms_version }}):</strong><br>{{ $guarantee_terms }}</p>
<p><strong>Ihre Zustimmung:</strong><br>{{ $guarantee_consent }}</p>
@elseif($locale === 'tr')
<p>Merhaba {{ $customer_name }},</p>
<p>{{ $restaurant_name }} için {{ $reservation_date }} tarihinde saat {{ $reservation_time }} rezervasyonunuz (<strong>{{ $reference }}</strong>, {{ $reservation_guests }} kişi) kart garantisiyle onaylandı.</p>
<p><strong>Şu anda herhangi bir ücret alınmadı.</strong><br>Olası azami no-show tazminatı: <strong>{{ $guarantee_amount }}</strong> (kişi başı en fazla {{ $guarantee_per_guest_amount }}).</p>
@if($free_cancellation_deadline)<p>Ücretsiz iptal son zamanı: <strong>{{ $free_cancellation_deadline }}</strong>.</p>@endif
<p><strong>Kabul ettiğiniz koşullar (sürüm {{ $guarantee_terms_version }}):</strong><br>{{ $guarantee_terms }}</p>
<p><strong>Onayınız:</strong><br>{{ $guarantee_consent }}</p>
@elseif($locale === 'ar')
<p>مرحباً {{ $customer_name }},</p>
<p>تم تأكيد حجزك <strong>{{ $reference }}</strong> لدى <strong>{{ $restaurant_name }}</strong> بتاريخ {{ $reservation_date }} الساعة {{ $reservation_time }} لعدد {{ $reservation_guests }} أشخاص مع ضمان البطاقة.</p>
<p><strong>لم يتم خصم أي مبلغ الآن.</strong><br>الحد الأقصى المحتمل لتعويض عدم الحضور: <strong>{{ $guarantee_amount }}</strong> (حتى {{ $guarantee_per_guest_amount }} لكل شخص).</p>
@if($free_cancellation_deadline)<p>يمكن الإلغاء مجاناً حتى <strong>{{ $free_cancellation_deadline }}</strong>.</p>@endif
<p><strong>الشروط التي وافقت عليها (الإصدار {{ $guarantee_terms_version }}):</strong><br>{{ $guarantee_terms }}</p>
<p><strong>موافقتك:</strong><br>{{ $guarantee_consent }}</p>
@else
<p>Hello {{ $customer_name }},</p>
<p>Your reservation <strong>{{ $reference }}</strong> at <strong>{{ $restaurant_name }}</strong> on {{ $reservation_date }} at {{ $reservation_time }} for {{ $reservation_guests }} guests was confirmed with a card guarantee.</p>
<p><strong>Nothing was charged now.</strong><br>Maximum possible no-show compensation: <strong>{{ $guarantee_amount }}</strong> (up to {{ $guarantee_per_guest_amount }} per guest).</p>
@if($free_cancellation_deadline)<p>Free cancellation is available until <strong>{{ $free_cancellation_deadline }}</strong>.</p>@endif
<p><strong>The terms you accepted (version {{ $guarantee_terms_version }}):</strong><br>{{ $guarantee_terms }}</p>
<p><strong>Your consent:</strong><br>{{ $guarantee_consent }}</p>
@endif

@partial('button', ['url' => $manage_url, 'type' => 'primary'])
@if($locale === 'de')Reservierung verwalten
@elseif($locale === 'tr')Rezervasyonu yönet
@elseif($locale === 'ar')إدارة الحجز
@else Manage reservation
@endif
@endpartial
