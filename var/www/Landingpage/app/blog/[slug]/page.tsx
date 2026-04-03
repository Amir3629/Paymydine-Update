import { getBlogPost, getContent } from "@/lib/db"
import { notFound } from "next/navigation"
import Image from "next/image"
import Navigation from "@/components/Navigation"
import Footer from "@/components/sections/Footer"
import ReactMarkdown from "react-markdown"

interface BlogPostPageProps {
  params: {
    slug: string
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getBlogPost(params.slug)
  const content = await getContent()

  if (!post) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-white">
      <Navigation navigation={content.navigation} />

      <article className="py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mb-12">
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <span key={tag} className="bg-accent-100 text-accent-700 px-3 py-1 rounded-full text-sm font-medium">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-900 mb-6">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-gray-600 mb-8">
              <span>By {post.author}</span>
              <span>•</span>
              <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
            </div>

            <div className="relative h-64 sm:h-96 rounded-2xl overflow-hidden">
              <Image src={post.featuredImage || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
            </div>
          </header>

          <div className="prose prose-lg max-w-none">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
