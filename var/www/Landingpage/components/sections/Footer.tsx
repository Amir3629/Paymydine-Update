"use client"

// components/sections/Footer.tsx
import Image from "next/image";
import Link from "next/link";
import { Mail, Facebook, Twitter, Linkedin, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { useState } from "react";

export default function Footer() {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <>
      <footer className="bg-brown-900 text-white pt-12 pb-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:justify-between gap-10">
          {/* Logo & Description */}
          <div className="flex-1 min-w-[220px]">
            <Link href="/" className="flex items-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-cream-100 rounded-lg blur-xl opacity-50 transform scale-110"></div>
                <Image
                  src="/images/logo.png"
                  alt="PayMyDine Logo"
                  width={160}
                  height={160}
                  className="relative z-10 rounded-lg drop-shadow-2xl"
                />
              </div>
            </Link>
            <p className="text-cream-100 mb-4">
              {t("footer.description")}
            </p>
            <div className="flex gap-3 mt-2">
              <a href="mailto:Sales@paymydine.con" className="hover:text-cream-400 transition">
                <Mail className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-cream-400 transition">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-cream-400 transition">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-cream-400 transition">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex-1 min-w-[180px]">
                          <h4 className="font-semibold text-lg mb-3 text-amber-500">{t("footer.quickLinks")}</h4>
            <ul className="space-y-2">
                              <li><Link href="/#features" className="hover:text-gold-300 transition">{t("nav.features")}</Link></li>
                <li><Link href="/#demo" className="hover:text-gold-300 transition">{t("nav.demo")}</Link></li>
                <li><Link href="/#how-it-works" className="hover:text-gold-300 transition">{t("nav.howItWorks")}</Link></li>
                <li><Link href="/#pricing" className="hover:text-gold-300 transition">{t("nav.pricing")}</Link></li>
                <li><Link href="/#faq" className="hover:text-gold-300 transition">{t("nav.faq")}</Link></li>
                <li><Link href="/#contact" className="hover:text-gold-300 transition">{t("nav.contact")}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="flex-1 min-w-[180px]">
                          <h4 className="font-semibold text-lg mb-3 text-amber-500">{t("footer.legal")}</h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => setShowTerms(true)}
                  className="hover:text-gold-300 transition text-left"
                >
                  {language === 'de' ? 'Impressum' : 'Legal Notice'}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setShowPrivacy(true)}
                  className="hover:text-gold-300 transition text-left"
                >
                  {language === 'de' ? 'Datenschutzerklärung' : 'Privacy Policy'}
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gold-900 mt-10 pt-6 text-center text-gold-200 text-sm">
          {t("footer.copyright")}
        </div>
      </footer>

      {/* Legal Notice Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Blurred Background */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all duration-500"
            onClick={() => setShowTerms(false)}
          />
          
          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-3xl mx-4 max-h-[80vh] overflow-y-auto transform transition-all duration-500 scale-100 opacity-100">
            {/* Close Button */}
            <button
              onClick={() => setShowTerms(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Content */}
            <div className="pr-8">
              <h2 className="font-serif text-3xl font-bold text-brown-900 mb-6">
                {language === 'de' ? 'Impressum' : 'Legal Notice'}
              </h2>
              
              <div className="space-y-4 text-gray-700">
                <p className="font-semibold">
                  {language === 'de' 
                    ? 'Angaben gemäß § 5 TMG:'
                    : 'Information according to § 5 TMG:'
                  }
                </p>
                
                <div className="space-y-2">
                  <p className="font-semibold">SANCLUSTER GMBH</p>
                  <p>Grand Towers, Europa Allee 2,</p>
                  <p>60327 Frankfurt am Main</p>
                  <p>Germany</p>
                </div>
                
                <div className="space-y-2">
                  <p className="font-semibold">
                    {language === 'de' ? 'Vertreten durch:' : 'Represented by:'}
                  </p>
                  <p>Saeed Meskinnavaz</p>
                </div>
                
                <div className="space-y-2">
                  <p className="font-semibold">
                    {language === 'de' ? 'Kontakt:' : 'Contact:'}
                  </p>
                  <p>Email: Sales@paymydine.con</p>
                </div>
                
                <div className="space-y-2">
                  <p className="font-semibold">
                    {language === 'de' ? 'Registrierung:' : 'Registration:'}
                  </p>
                  <p>
                    {language === 'de' 
                      ? 'Eingetragen im Handelsregister.'
                      : 'Registered in the Commercial Register.'
                    }
                  </p>
                  <p>
                    {language === 'de' ? 'Registergericht:' : 'Registration Court:'} Frankfurt
                  </p>
                  <p>
                    {language === 'de' ? 'Registernummer:' : 'Registration Number:'} HRB 111478
                  </p>
                  <p>VAT: DE32 0013766</p>
                  <p>
                    {language === 'de' 
                      ? 'Identifikationsnummer gemäß §27a des Umsatzsteuergesetzes'
                      : 'Identification Number according to §27a of the Value Added Tax Act'
                    }
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="font-semibold">
                    {language === 'de' ? 'Streitbeilegung' : 'Dispute Resolution'}
                  </p>
                  <p>
                    {language === 'de'
                      ? 'Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.'
                      : 'We are neither willing nor obligated to participate in dispute resolution proceedings before a consumer arbitration board.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Blurred Background */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all duration-500"
            onClick={() => setShowPrivacy(false)}
          />
          
          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-3xl mx-4 max-h-[80vh] overflow-y-auto transform transition-all duration-500 scale-100 opacity-100">
            {/* Close Button */}
            <button
              onClick={() => setShowPrivacy(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Content */}
            <div className="pr-8">
              <h2 className="font-serif text-3xl font-bold text-brown-900 mb-6">
                {language === 'de' ? 'Datenschutzerklärung' : 'Privacy Policy'}
              </h2>
              
              <div className="space-y-4 text-gray-700">
                {language === 'de' ? (
                  <>
                    <p><b>1. Einführung</b><br />
                    I Cube Solutions GmbH („wir“, „uns“ oder „unser“) verpflichtet sich, Ihre Privatsphäre zu schützen. Diese Datenschutzerklärung erklärt, wie wir Ihre Informationen erfassen, verwenden, offenlegen und schützen, wenn Sie unsere Website i-cube-solutions.de besuchen, einschließlich aller anderen Medienformen, Medienkanäle, mobilen Websites oder mobilen Anwendungen, die damit verbunden sind (zusammenfassend die „Seite“).
                    </p>
                    <p>
                    Bitte lesen Sie diese Datenschutzerklärung sorgfältig durch. Wenn Sie mit den Bedingungen dieser Datenschutzerklärung nicht einverstanden sind, greifen Sie bitte nicht auf die Seite zu.
                    </p>
                    <p><b>2. Erfassung Ihrer Informationen</b><br />
                    Wir können Informationen über Sie auf verschiedene Weise erfassen. Die Informationen, die wir erfassen können, umfassen:
                    </p>
                    <p>
                    <b>Personenbezogene Daten:</b> Persönlich identifizierbare Informationen wie Ihr Name, Ihre Versandadresse, E-Mail-Adresse und Telefonnummer sowie demografische Informationen wie Ihr Alter, Geschlecht, Wohnort und Interessen, die Sie uns freiwillig zur Verfügung stellen, wenn Sie sich auf der Seite registrieren oder an verschiedenen Aktivitäten auf der Seite teilnehmen. Sie sind nicht verpflichtet, uns personenbezogene Daten jeglicher Art zur Verfügung zu stellen, aber Ihre Weigerung kann Sie daran hindern, bestimmte Funktionen der Seite zu nutzen.
                    </p>
                    <p>
                    <b>Abgeleitete Daten:</b> Informationen, die unsere Server automatisch erfassen, wenn Sie auf die Seite zugreifen, wie Ihre IP-Adresse, Ihr Browsertyp, Ihr Betriebssystem, Ihre Zugriffszeiten und die Seiten, die Sie direkt vor und nach dem Zugriff auf die Seite angesehen haben.
                    </p>
                    <p>
                    <b>Finanzdaten:</b> Finanzinformationen wie Daten zu Ihrer Zahlungsmethode (z. B. gültige Kreditkartennummer, Kartenmarke, Ablaufdatum), die wir erfassen können, wenn Sie über die Seite unsere Dienstleistungen kaufen, bestellen, zurückgeben, umtauschen oder Informationen anfordern.
                    </p>
                    <p>
                    <b>Mobile Gerätedaten:</b> Geräteinformationen wie Ihre mobile Geräte-ID, Modell und Hersteller sowie Informationen über den Standort Ihres Geräts, wenn Sie von einem mobilen Gerät aus auf die Seite zugreifen.
                    </p>
                    <p><b>3. Verwendung Ihrer Informationen</b><br />
                    Die genaue Kenntnis Ihrer Informationen ermöglicht es uns, Ihnen ein reibungsloses, effizientes und individuelles Erlebnis zu bieten. Insbesondere können wir die über die Seite erfassten Informationen verwenden, um:
                    </p>
                    <ul className="list-disc ml-6">
                      <li>Ihr Konto zu erstellen und zu verwalten.</li>
                      <li>Ihre Bestellungen zu bearbeiten und Ihre Transaktionen zu verwalten.</li>
                      <li>Ihnen E-Mails bezüglich Ihres Kontos oder Ihrer Bestellung zu senden.</li>
                      <li>Käufe, Bestellungen, Zahlungen und andere Transaktionen im Zusammenhang mit der Seite zu erfüllen und zu verwalten.</li>
                      <li>Gewinnspiele, Werbeaktionen und Wettbewerbe zu verwalten.</li>
                      <li>Anonyme statistische Daten und Analysen für interne Zwecke oder mit Dritten zu erstellen.</li>
                      <li>Zielgerichtete Werbung, Newsletter und andere Informationen zu Werbeaktionen und der Seite an Sie zu liefern.</li>
                      <li>Benutzer-zu-Benutzer-Kommunikation zu ermöglichen.</li>
                      <li>Die Effizienz und den Betrieb der Seite zu steigern.</li>
                      <li>Nutzung und Trends zu überwachen und zu analysieren, um Ihre Erfahrung mit der Seite zu verbessern.</li>
                      <li>Sie über Updates der Seite zu benachrichtigen.</li>
                      <li>Ihnen neue Produkte, Dienstleistungen und/oder Empfehlungen anzubieten.</li>
                      <li>Andere geschäftliche Aktivitäten nach Bedarf durchzuführen.</li>
                      <li>Betrügerische Transaktionen zu verhindern, Diebstahl zu überwachen und vor kriminellen Aktivitäten zu schützen.</li>
                      <li>Feedback anzufordern und Sie bezüglich Ihrer Nutzung der Seite zu kontaktieren.</li>
                      <li>Streitigkeiten zu lösen und Probleme zu beheben.</li>
                      <li>Auf Produkt- und Kundendienstanfragen zu reagieren.</li>
                    </ul>
                    <p><b>4. Offenlegung Ihrer Informationen</b><br />
                    Wir können Informationen, die wir über Sie gesammelt haben, in bestimmten Situationen weitergeben. Ihre Informationen können wie folgt offengelegt werden:
                    </p>
                    <ul className="list-disc ml-6">
                      <li><b>Gesetzlich oder zum Schutz von Rechten:</b> Wenn wir glauben, dass die Weitergabe Ihrer Informationen erforderlich ist, um auf rechtliche Verfahren zu reagieren, potenzielle Verstöße gegen unsere Richtlinien zu untersuchen oder zu beheben oder die Rechte, das Eigentum und die Sicherheit anderer zu schützen, können wir Ihre Informationen im Rahmen des geltenden Rechts weitergeben.</li>
                      <li><b>Drittanbieter:</b> Wir können Ihre Informationen an Dritte weitergeben, die Dienstleistungen für uns oder in unserem Namen erbringen, einschließlich Zahlungsabwicklung, Datenanalyse, E-Mail-Versand, Hosting-Dienste, Kundendienst und Marketingunterstützung.</li>
                      <li><b>Marketingkommunikation:</b> Mit Ihrer Zustimmung oder mit der Möglichkeit, Ihre Zustimmung zu widerrufen, können wir Ihre Informationen zu Marketingzwecken an Dritte weitergeben, soweit dies gesetzlich zulässig ist.</li>
                      <li><b>Interaktionen mit anderen Nutzern:</b> Wenn Sie mit anderen Nutzern der Seite interagieren, können diese Nutzer Ihren Namen, Ihr Profilfoto und Beschreibungen Ihrer Aktivitäten sehen.</li>
                      <li><b>Online-Veröffentlichungen:</b> Wenn Sie Kommentare, Beiträge oder andere Inhalte auf der Seite veröffentlichen, können Ihre Beiträge von allen Nutzern eingesehen und außerhalb der Seite dauerhaft verbreitet werden.</li>
                      <li><b>Unternehmensübertragungen:</b> Wir können Ihre Informationen im Zusammenhang mit oder während Verhandlungen über Fusionen, den Verkauf von Unternehmensvermögen, Finanzierungen oder Übernahmen unseres gesamten oder eines Teils unseres Unternehmens an ein anderes Unternehmen weitergeben oder übertragen.</li>
                    </ul>
                    <p><b>5. Sicherheit Ihrer Informationen</b><br />
                    Wir verwenden administrative, technische und physische Sicherheitsmaßnahmen, um Ihre persönlichen Daten zu schützen. Obwohl wir angemessene Schritte unternommen haben, um die von Ihnen bereitgestellten persönlichen Daten zu sichern, beachten Sie bitte, dass keine Sicherheitsmaßnahmen perfekt oder undurchdringlich sind und keine Methode der Datenübertragung gegen jegliche Art von Missbrauch garantiert werden kann.
                    </p>
                    <p><b>6. Richtlinie für Kinder</b><br />
                    Wir fordern wissentlich keine Informationen von Kindern unter 13 Jahren an und vermarkten diese auch nicht an sie. Wenn Sie Kenntnis davon erlangen, dass wir Daten von Kindern unter 13 Jahren gesammelt haben, kontaktieren Sie uns bitte unter den unten angegebenen Kontaktdaten.
                    </p>
                    <p><b>7. Steuerung von Do-Not-Track-Funktionen</b><br />
                    Die meisten Webbrowser und einige mobile Betriebssysteme enthalten eine Do-Not-Track („DNT“)-Funktion oder -Einstellung, die Sie aktivieren können, um Ihr Datenschutzinteresse zu signalisieren, dass keine Daten über Ihre Online-Browsing-Aktivitäten überwacht und gesammelt werden sollen. Da kein einheitlicher Technologiestandard für die Erkennung und Umsetzung von DNT-Signalen fertiggestellt wurde, reagieren wir derzeit nicht auf DNT-Browsersignale oder andere Mechanismen, die Ihre Wahl, nicht online verfolgt zu werden, automatisch kommunizieren.
                    </p>
                    <p><b>8. Optionen bezüglich Ihrer Informationen</b><br />
                    <b>Kontoinformationen:</b> Sie können Ihre Kontoinformationen jederzeit überprüfen oder ändern oder Ihr Konto kündigen, indem Sie:
                    </p>
                    <ul className="list-disc ml-6">
                      <li>Sich in Ihre Kontoeinstellungen einloggen und Ihr Konto aktualisieren</li>
                      <li>Uns unter den unten angegebenen Kontaktdaten kontaktieren</li>
                    </ul>
                    <p>
                    Nach Ihrer Anfrage zur Kündigung Ihres Kontos werden wir Ihr Konto und Ihre Informationen aus unseren aktiven Datenbanken deaktivieren oder löschen. Einige Informationen können jedoch in unseren Dateien gespeichert bleiben, um Betrug zu verhindern, Probleme zu beheben, bei Untersuchungen zu helfen, unsere Nutzungsbedingungen durchzusetzen und/oder gesetzlichen Anforderungen zu entsprechen.
                    </p>
                    <p><b>9. Kontakt</b><br />
                    Wenn Sie Fragen oder Kommentare zu dieser Datenschutzerklärung haben, kontaktieren Sie uns bitte unter:
                    </p>
                    <div className="space-y-1">
                      <p>Sancluster GmbH</p>
                      <p>Grand Towers, Europa Allee 2</p>
                      <p>60327 Frankfurt am Main</p>
                      <p>Deutschland</p>
                      <p>Telefon: +49-69-92039970</p>
                      <p>Email: Sales@paymydine.con</p>
                    </div>
                  </>
                ) : (
                  <>
                    <p><b>1. Introduction</b><br />
                    I Cube Solutions GmbH ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website i-cube-solutions.de, including any other media form, media channel, mobile website, or mobile application related or connected thereto (collectively, the "Site").
                    </p>
                    <p>
                    Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
                    </p>
                    <p><b>2. Collection of Your Information</b><br />
                    We may collect information about you in a variety of ways. The information we may collect includes:
                    </p>
                    <p>
                    <b>Personal Data:</b> Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us when you register with the Site or when you choose to participate in various activities related to the Site. You are under no obligation to provide us with personal information of any kind, however your refusal to do so may prevent you from using certain features of the Site.
                    </p>
                    <p>
                    <b>Derivative Data:</b> Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site.
                    </p>
                    <p>
                    <b>Financial Data:</b> Financial information, such as data related to your payment method (e.g. valid credit card number, card brand, expiration date) that we may collect when you purchase, order, return, exchange, or request information about our services from the Site.
                    </p>
                    <p>
                    <b>Mobile Device Data:</b> Device information, such as your mobile device ID, model, and manufacturer, and information about the location of your device, if you access the Site from a mobile device.
                    </p>
                    <p><b>3. Use of Your Information</b><br />
                    Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:
                    </p>
                    <ul className="list-disc ml-6">
                      <li>Create and manage your account.</li>
                      <li>Process your orders and manage your transactions.</li>
                      <li>Email you regarding your account or order.</li>
                      <li>Fulfill and manage purchases, orders, payments, and other transactions related to the Site.</li>
                      <li>Administer sweepstakes, promotions, and contests.</li>
                      <li>Compile anonymous statistical data and analysis for use internally or with third parties.</li>
                      <li>Deliver targeted advertising, newsletters, and other information regarding promotions and the Site to you.</li>
                      <li>Enable user-to-user communications.</li>
                      <li>Increase the efficiency and operation of the Site.</li>
                      <li>Monitor and analyze usage and trends to improve your experience with the Site.</li>
                      <li>Notify you of updates to the Site.</li>
                      <li>Offer new products, services, and/or recommendations to you.</li>
                      <li>Perform other business activities as needed.</li>
                      <li>Prevent fraudulent transactions, monitor against theft, and protect against criminal activity.</li>
                      <li>Request feedback and contact you about your use of the Site.</li>
                      <li>Resolve disputes and troubleshoot problems.</li>
                      <li>Respond to product and customer service requests.</li>
                    </ul>
                    <p><b>4. Disclosure of Your Information</b><br />
                    We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
                    </p>
                    <ul className="list-disc ml-6">
                      <li><b>By Law or to Protect Rights:</b> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.</li>
                      <li><b>Third-Party Service Providers:</b> We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.</li>
                      <li><b>Marketing Communications:</b> With your consent, or with an opportunity for you to withdraw consent, we may share your information with third parties for marketing purposes, as permitted by law.</li>
                      <li><b>Interactions with Other Users:</b> If you interact with other users of the Site, those users may see your name, profile photo, and descriptions of your activity, including sending invitations to other users, chatting with other users, liking posts, following blogs.</li>
                      <li><b>Online Postings:</b> When you post comments, contributions or other content to the Site, your posts may be viewed by all users and may be publicly distributed outside the Site in perpetuity.</li>
                      <li><b>Business Transfers:</b> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
                    </ul>
                    <p><b>5. Security of Your Information</b><br />
                    We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
                    </p>
                    <p><b>6. Policy for Children</b><br />
                    We do not knowingly solicit information from or market to children under the age of 13. If you become aware of any data we have collected from children under age 13, please contact us using the contact information provided below.
                    </p>
                    <p><b>7. Controls for Do-Not-Track Features</b><br />
                    Most web browsers and some mobile operating systems include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. No uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online.
                    </p>
                    <p><b>8. Options Regarding Your Information</b><br />
                    <b>Account Information:</b> You may at any time review or change the information in your account or terminate your account by:
                    </p>
                    <ul className="list-disc ml-6">
                      <li>Logging into your account settings and updating your account</li>
                      <li>Contacting us using the contact information provided below</li>
                    </ul>
                    <p>
                    Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, some information may be retained in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our Terms of Use and/or comply with legal requirements.
                    </p>
                    <p><b>9. Contact Us</b><br />
                    If you have questions or comments about this Privacy Policy, please contact us at:
                    </p>
                    <div className="space-y-1">
                      <p>Sancluster GmbH</p>
                      <p>Grand Towers, Europa Allee 2</p>
                      <p>60327 Frankfurt am Main</p>
                      <p>Germany</p>
                      <p>Phone: +49-69-92039970</p>
                      <p>Email: Sales@paymydine.con</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
