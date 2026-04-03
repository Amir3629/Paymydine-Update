// Simple JSON-based CMS for demo purposes
// In production, use Prisma with PostgreSQL or a headless CMS

export interface CMSContent {
  hero: {
    title: string
    subtitle: string
    primaryCTA: string
    secondaryCTA: string
    backgroundImage: string
  }
  features: Array<{
    id: string
    title: string
    description: string
    icon: string
    order: number
  }>
  howItWorks: Array<{
    id: string
    title: string
    description: string
    icon: string
    order: number
  }>
  pricing: Array<{
    id: string
    name: string
    price: string
    period: string
    description: string
    features: string[]
    popular: boolean
    stripeLink: string
    order: number
  }>
  testimonials: Array<{
    id: string
    quote: string
    name: string
    position: string
    company: string
    image: string
    order: number
  }>
  faqs: Array<{
    id: string
    question: string
    answer: string
    order: number
  }>
  contact: {
    title: string
    subtitle: string
    email: string
    phone: string
    address: string
  }
  navigation: Array<{
    label: string
    href: string
    order: number
  }>
  seo: {
    title: string
    description: string
    keywords: string
  }
}

// Default content
export const defaultContent: CMSContent = {
  hero: {
    title: "Pay at the Table - No More Waiting",
    subtitle: "Transform your restaurant with instant QR payment. Customers scan, pay, and go - no waiting, no hassle.",
    primaryCTA: "Start Free Trial",
    secondaryCTA: "See How It Works",
    backgroundImage: "/placeholder.svg?height=1080&width=1920",
  },
  features: [
    {
      id: "1",
      title: "QR Payment System",
      description: "Customers scan QR codes to instantly pay at their table. No waiting, no cash handling, seamless experience.",
      icon: "QrCode",
      order: 1,
    },
    {
      id: "2",
      title: "Table Service",
      description: "Staff can focus on service, not payments. Real-time order tracking and instant payment processing.",
      icon: "Tablet",
      order: 2,
    },
    {
      id: "3",
      title: "Customer Experience",
      description: "Faster service, no waiting in line. Customers love the convenience of instant payment.",
      icon: "Users",
      order: 3,
    },
    {
      id: "4",
      title: "Payment Analytics",
      description: "Track payment trends, average transaction times, and customer satisfaction metrics.",
      icon: "BarChart3",
      order: 4,
    },
  ],
  howItWorks: [
    {
      id: "1",
      title: "Sign Up",
      description: "Choose your plan and create your account. Get started with our 14-day free trial - no credit card required.",
      icon: "UserPlus",
      order: 1,
    },
    {
      id: "2",
      title: "Customize",
      description: "Set up your menu, customize your branding, and configure your restaurant settings. Our onboarding team will guide you through the process.",
      icon: "Globe",
      order: 2,
    },
    {
      id: "3",
      title: "Go Live",
      description: "Launch your online ordering system and start accepting orders. Scale with additional locations as your business grows.",
      icon: "TrendingUp",
      order: 3,
    },
  ],
  pricing: [
    {
      id: "single",
      name: "Single Plan",
      description: "Perfect for small restaurants and cafes",
      price: "55 EUR",
      period: "/month",
      features: [
        "Single location",
        "Basic menu management", 
        "Standard ordering system",
        "Email support",
        "Mobile-responsive design",
        "Basic analytics"
      ],
      popular: false,
      stripeLink: "https://stripe.com/single-plan",
      order: 1
    },
    {
      id: "professional", 
      name: "Professional Plan",
      description: "Ideal for growing restaurant chains",
      price: "80 EUR",
      period: "/month",
      features: [
        "Up to 3 locations",
        "Advanced analytics",
        "Custom branding", 
        "Priority support",
        "Inventory management",
        "Marketing tools",
        "Loyalty programs"
      ],
      popular: true,
      stripeLink: "https://stripe.com/professional-plan",
      order: 2
    },
    {
      id: "enterprise",
      name: "Enterprise Plan", 
      description: "For large restaurant groups and franchises",
      price: "130 EUR",
      period: "/month",
      features: [
        "Unlimited locations",
        "White-label options",
        "API access",
        "Dedicated support", 
        "Custom integrations",
        "Advanced security",
        "Multi-tenant isolation"
      ],
      popular: false,
      stripeLink: "https://stripe.com/enterprise-plan",
      order: 3
    }
  ],
  testimonials: [
    {
      id: "1",
      quote:
        "PayMyDine's Laravel-based system gave us the flexibility we needed. The multi-tenant architecture allows us to manage all our locations while keeping each restaurant's data completely isolated.",
      name: "Maria Rodriguez",
      position: "Owner",
      company: "Bella Vista Restaurant Group",
      image: "/placeholder.svg?height=80&width=80",
      order: 1,
    },
    {
      id: "2",
      quote:
        "The TastyIgniter integration was seamless. We were able to migrate our existing menu and customer data without any downtime. The system handles our peak hours perfectly.",
      name: "James Chen",
      position: "Operations Manager",
      company: "Golden Dragon Chain",
      image: "/placeholder.svg?height=80&width=80",
      order: 2,
    },
    {
      id: "3",
      quote:
        "The Next.js frontend provides our customers with a lightning-fast ordering experience. Our online orders increased by 60% within the first month of using PayMyDine.",
      name: "Sophie Laurent",
      position: "General Manager",
      company: "Le Petit Bistro",
      image: "/placeholder.svg?height=80&width=80",
      order: 3,
    },
  ],
  faqs: [
    {
      id: "1",
      question: "What technology stack does PayMyDine use?",
      answer:
        "PayMyDine is built on Laravel 8.x with TastyIgniter framework for the backend, Next.js 14 with TypeScript for the frontend, and MySQL for the database. We use Ubuntu 24.04 LTS with Nginx for deployment.",
      order: 1,
    },
    {
      id: "2",
      question: "How does the multi-tenant architecture work?",
      answer:
        "Each restaurant gets its own isolated database and subdomain (e.g., yourrestaurant.paymydine.com). This ensures complete data separation while allowing centralized management through our super admin panel.",
      order: 2,
    },
    {
      id: "3",
      question: "Can I integrate with my existing POS system?",
      answer:
        "Yes! PayMyDine integrates with most popular POS systems including Square, Toast, Clover, and many others. We also provide comprehensive API access for custom integrations.",
      order: 3,
    },
    {
      id: "4",
      question: "What kind of support do you provide?",
      answer:
        "All plans include comprehensive onboarding support and technical assistance. Professional and Enterprise plans get priority support and dedicated account managers. We also provide extensive documentation and training resources.",
      order: 4,
    },
    {
      id: "5",
      question: "Is there a free trial available?",
      answer:
        "Yes! We offer a 14-day free trial with no credit card required. This gives you full access to test all features and see how PayMyDine can transform your restaurant operations.",
      order: 5,
    },
    {
      id: "6",
      question: "How secure is my restaurant data?",
      answer:
        "We use enterprise-grade security with SSL encryption, database isolation per tenant, regular backups, and comply with industry standards. Each restaurant's data is completely isolated from others.",
      order: 6,
    },
  ],
  contact: {
    title: "Ready to Transform Your Restaurant?",
    subtitle: "Schedule a demo or get in touch with our team to learn how PayMyDine's multi-tenant platform can revolutionize your restaurant operations.",
    email: "Sales@paymydine.con",
    phone: "004915259079846",
    address: "Sancluster GmbH, Grand Towers, Europa Allee 2, 60327, Frankfurt am Main, Germany",
  },
  navigation: [
    { label: "Features", href: "#features", order: 1 },
    { label: "How It Works", href: "#how-it-works", order: 2 },
    { label: "Demo", href: "#demo", order: 3 },
    { label: "Pricing", href: "#pricing", order: 4 },
    { label: "Testimonials", href: "#testimonials", order: 5 },
    { label: "FAQ", href: "#faq", order: 6 },
    { label: "Blog", href: "/blog", order: 7 },
    { label: "Contact", href: "#contact", order: 8 },
  ],
  seo: {
    title: "PayMyDine - Multi-Tenant Restaurant Management System | Laravel + Next.js",
    description:
      "Complete restaurant management platform built on Laravel (TastyIgniter) with Next.js frontend. Multi-tenant architecture, online ordering, analytics, and more.",
    keywords: "restaurant management, Laravel, TastyIgniter, Next.js, multi-tenant, online ordering, POS system, restaurant analytics",
  },
}

// Simple file-based storage (replace with database in production)
let content: CMSContent = defaultContent

export async function getContent(): Promise<CMSContent> {
  return content
}

export async function updateContent(newContent: Partial<CMSContent>): Promise<CMSContent> {
  content = { ...content, ...newContent }
  return content
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  featuredImage: string
  author: string
  publishedAt: string
  tags: string[]
  published: boolean
}

const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Why Laravel is Perfect for Multi-Tenant Restaurant Management Systems",
    slug: "laravel-multi-tenant-restaurant-management",
    excerpt: "Discover why Laravel's robust framework makes it the ideal choice for building scalable, secure multi-tenant restaurant management platforms.",
    content:
      "# Why Laravel is Perfect for Multi-Tenant Restaurant Management Systems\n\nWhen building PayMyDine, we chose Laravel as our backend framework for several compelling reasons. Laravel's elegant syntax, powerful features, and extensive ecosystem make it the perfect foundation for complex multi-tenant applications...",
    featuredImage: "/placeholder.svg?height=400&width=600",
    author: "PayMyDine Development Team",
    publishedAt: "2024-01-15",
    tags: ["Laravel", "Multi-Tenant", "Restaurant Technology", "Backend Development"],
    published: true,
  },
  {
    id: "2",
    title: "Building Modern Restaurant UIs with Next.js and TailwindCSS",
    slug: "nextjs-restaurant-ui-development",
    excerpt: "Learn how we built PayMyDine's lightning-fast frontend using Next.js 14 and TailwindCSS for optimal restaurant management experiences.",
    content: "# Building Modern Restaurant UIs with Next.js and TailwindCSS\n\nThe restaurant industry demands fast, responsive interfaces that work seamlessly across all devices. Here's how we leveraged Next.js 14 and TailwindCSS to create PayMyDine's exceptional user experience...",
    featuredImage: "/placeholder.svg?height=400&width=600",
    author: "PayMyDine Frontend Team",
    publishedAt: "2024-01-10",
    tags: ["Next.js", "TailwindCSS", "Frontend Development", "Restaurant UI"],
    published: true,
  },
  {
    id: "3",
    title: "TastyIgniter Integration: Extending Laravel for Restaurant Management",
    slug: "tastyigniter-laravel-restaurant-integration",
    excerpt: "How we integrated TastyIgniter's powerful restaurant features with Laravel to create a comprehensive multi-tenant platform.",
    content: "# TastyIgniter Integration: Extending Laravel for Restaurant Management\n\nTastyIgniter provides excellent restaurant-specific functionality, but we needed to extend it for multi-tenant architecture. Here's how we seamlessly integrated TastyIgniter with Laravel...",
    featuredImage: "/placeholder.svg?height=400&width=600",
    author: "PayMyDine Architecture Team",
    publishedAt: "2024-01-05",
    tags: ["TastyIgniter", "Laravel", "Restaurant Management", "Integration"],
    published: true,
  },
]

export async function getBlogPosts(): Promise<BlogPost[]> {
  return blogPosts.filter((post) => post.published)
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  return blogPosts
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  return blogPosts.find((post) => post.slug === slug) || null
}

export async function createBlogPost(post: Omit<BlogPost, "id">): Promise<BlogPost> {
  const newPost = { ...post, id: Date.now().toString() }
  blogPosts.push(newPost)
  return newPost
}

export async function updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost | null> {
  const index = blogPosts.findIndex((post) => post.id === id)
  if (index === -1) return null

  blogPosts[index] = { ...blogPosts[index], ...updates }
  return blogPosts[index]
}

export async function deleteBlogPost(id: string): Promise<boolean> {
  const index = blogPosts.findIndex((post) => post.id === id)
  if (index === -1) return false

  blogPosts.splice(index, 1)
  return true
}
