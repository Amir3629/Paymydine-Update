"use client"

import { useState, useEffect } from "react"
import { signOut } from "next-auth/react"
import type { CMSContent, BlogPost } from "@/lib/db"
import ContentEditor from "./ContentEditor"
import BlogEditor from "./BlogEditor"
import toast from "react-hot-toast"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("content")
  const [content, setContent] = useState<CMSContent | null>(null)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContent()
    fetchBlogPosts()
  }, [])

  const fetchContent = async () => {
    try {
      const response = await fetch("/api/cms/content")
      const data = await response.json()
      setContent(data)
    } catch (error) {
      toast.error("Failed to fetch content")
    }
  }

  const fetchBlogPosts = async () => {
    try {
      const response = await fetch("/api/cms/blog")
      const data = await response.json()
      setBlogPosts(data)
    } catch (error) {
      toast.error("Failed to fetch blog posts")
    } finally {
      setLoading(false)
    }
  }

  const updateContent = async (updates: Partial<CMSContent>) => {
    try {
      const response = await fetch("/api/cms/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updatedContent = await response.json()
        setContent(updatedContent)
        toast.success("Content updated successfully")
      } else {
        toast.error("Failed to update content")
      }
    } catch (error) {
      toast.error("Failed to update content")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-accent-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">PayMyDine CMS</h1>
            <button
              onClick={() => signOut()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("content")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "content"
                  ? "border-accent-500 text-accent-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Page Content
            </button>
            <button
              onClick={() => setActiveTab("blog")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "blog"
                  ? "border-accent-500 text-accent-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Blog Posts
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === "content" && content && <ContentEditor content={content} onUpdate={updateContent} />}

        {activeTab === "blog" && <BlogEditor posts={blogPosts} onUpdate={fetchBlogPosts} />}
      </div>
    </div>
  )
}
