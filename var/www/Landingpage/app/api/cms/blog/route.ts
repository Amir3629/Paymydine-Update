import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getAllBlogPosts, createBlogPost } from "@/lib/db"

export async function GET() {
  try {
    const posts = await getAllBlogPosts()
    return NextResponse.json(posts)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || (session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const postData = await request.json()
    const post = await createBlogPost(postData)

    return NextResponse.json(post)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create blog post" }, { status: 500 })
  }
}
