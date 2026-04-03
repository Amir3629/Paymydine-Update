import { getContent } from "@/lib/db"
import Navigation from "@/components/Navigation"
import Hero from "@/components/sections/Hero"
import Features from "@/components/sections/Features"
import PayAtTableJourney from "@/components/sections/PayAtTableJourney"
import SeeItInAction from "@/components/sections/SeeItInAction"
import HowItWorks from "@/components/sections/HowItWorks"
import Pricing from "@/components/sections/Pricing"
import Testimonials from "@/components/sections/Testimonials"
import FAQ from "@/components/sections/FAQ"
import Contact from "@/components/sections/Contact"
import Footer from "@/components/sections/Footer"

export default async function Home() {
  const content = await getContent()

  return (
    <main className="min-h-screen bg-white">
      <Navigation navigation={content.navigation} />
      <Hero hero={content.hero} />
      <Features features={content.features} />
      <PayAtTableJourney />
      <SeeItInAction />
      <HowItWorks steps={content.howItWorks} />
      <Pricing plans={content.pricing} />
      <Testimonials testimonials={content.testimonials} />
      <FAQ faqs={content.faqs} />
      <Contact contact={content.contact} />
      <Footer />
    </main>
  )
}
