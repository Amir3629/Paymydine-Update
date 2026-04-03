"use client"

import type React from "react"

import { useState } from "react"
import type { BlogPost } from "@/lib/db"
import { Plus, Edit3, Trash2, Eye } from "lucide-react"
import toast from "react-hot-toast"

interface BlogEditorProps {
  posts: BlogPost[]
  onUpdate: () => void
}

export default function BlogEditor({ posts, onUpdate }: BlogEditorProps) {
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const createPost = async (postData: Omit<BlogPost, "id">) => {
    try {
      const response = await fetch("/api/cms/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      })

      if (response.ok) {
        toast.success("Blog post created successfully")
        onUpdate()
        setIsCreating(false)
      } else {
        toast.error("Failed to create blog post")
      }
    } catch (error) {
      toast.error("Failed to create blog post")
    }
  }

  const updatePost = async (id: string, updates: Partial<BlogPost>) => {
    try {
      const response = await fetch(`/api/cms/blog/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        toast.success("Blog post updated successfully")
        onUpdate()
        setEditingPost(null)
      } else {
        toast.error("Failed to update blog post")
      }
    } catch (error) {
      toast.error("Failed to update blog post")
    }
  }

  const deletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return

    try {
      const response = await fetch(`/api/cms/blog/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Blog post deleted successfully")
        onUpdate()
      } else {
        toast.error("Failed to delete blog post")
      }
    } catch (error) {
      toast.error("Failed to delete blog post")
    }
  }

  const BlogPostForm = ({
    post,
    onSave,
    onCancel,
  }: {
    post?: BlogPost
    onSave: (data: Omit<BlogPost, "id">) => void
    onCancel: () => void
  }) => {
    const [formData, setFormData] = useState({
      title: post?.title || "",
      slug: post?.slug || "",
      excerpt: post?.excerpt || "",
      content: post?.content || "",
      featuredImage: post?.featuredImage || "",
      author: post?.author || "PayMyDine Team",
      publishedAt: post?.publishedAt || new Date().toISOString().split("T")[0],
      tags: post?.tags?.join(", ") || "",
      published: post?.published ?? true,
    })

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      onSave({
        ...formData,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      })
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
          <textarea
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content (Markdown)</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500 font-mono text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Featured Image URL</label>
            <input
              type="url"
              value={formData.featuredImage}
              onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Published Date</label>
            <input
              type="date"
              value={formData.publishedAt}
              onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
              placeholder="Technology, Restaurant, Tips"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="published"
            checked={formData.published}
            onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
            className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-gray-300 rounded"
          />
          <label htmlFor="published" className="ml-2 block text-sm text-gray-900">
            Published
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="bg-accent-600 text-white px-6 py-2 rounded-lg hover:bg-accent-700 transition-colors"
          >
            {post ? "Update Post" : "Create Post"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  if (isCreating) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-6">Create New Blog Post</h3>
        <BlogPostForm onSave={createPost} onCancel={() => setIsCreating(false)} />
      </div>
    )
  }

  if (editingPost) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-6">Edit Blog Post</h3>
        <BlogPostForm
          post={editingPost}
          onSave={(data) => updatePost(editingPost.id, data)}
          onCancel={() => setEditingPost(null)}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Blog Posts</h3>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-accent-600 text-white px-4 py-2 rounded-lg hover:bg-accent-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>
      </div>

      <div className="p-6">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No blog posts yet. Create your first post!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-lg">{post.title}</h4>
                      {!post.published && (
                        <span className="bg-cream-100 text-brown-800 px-2 py-1 rounded-full text-xs">Draft</span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{post.excerpt}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>By {post.author}</span>
                      <span>•</span>
                      <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{post.tags.join(", ")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                      title="View Post"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => setEditingPost(post)}
                      className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                      title="Edit Post"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deletePost(post.id)}
                      className="p-2 text-red-600 hover:text-red-800 transition-colors"
                      title="Delete Post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
