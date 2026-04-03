import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { name, email, restaurant, message } = await request.json()

    // Here you would typically send an email or save to database
    console.log("Contact form submission:", { name, email, restaurant, message })

    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return NextResponse.json({ success: true, message: "Thank you for your message. We'll get back to you soon!" })
  } catch (error) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
