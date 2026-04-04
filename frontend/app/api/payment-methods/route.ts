import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "payment-methods.json")
    const raw = fs.readFileSync(filePath, "utf8")
    const data = JSON.parse(raw)
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to load payment methods snapshot",
        error: String(error?.message || error),
      },
      { status: 500 }
    )
  }
}
