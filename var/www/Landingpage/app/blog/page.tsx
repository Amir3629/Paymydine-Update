import { getBlogPosts } from "@/lib/db"
import Link from "next/link"
import Image from "next/image"
import Navigation from "@/components/Navigation"
import Footer from "@/components/sections/Footer"
import { getContent } from "@/lib/db"

export default async function BlogPage() {
  const posts = await getBlogPosts()
  const content = await getContent()

  return (
    <main className="min-h-screen bg-white">
      <Navigation navigation={content.navigation} />

      <section className="py-20 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-900 mb-6">
              Restaurant Insights & Tips
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stay updated with the latest trends, tips, and insights for restaurant management and growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="relative h-48">
                  <Image
                    src={post.featuredImage || "/placeholder.svg"}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="p-6">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-accent-100 text-accent-700 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h2 className="font-serif text-xl font-bold text-primary-900 mb-3 line-clamp-2">{post.title}</h2>

                  <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{new Date(post.publishedAt).toLocaleDateString()}</span>

                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-accent-600 hover:text-accent-700 font-medium transition-colors"
                    >
                      Read More →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
