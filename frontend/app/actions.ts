"use server"

import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import type { CartItem } from "@/store/cart-store"

const TABLE_NUMBER = 7 // Hardcoded for this example

export async function submitOrder(items: CartItem[], totalAmount: number) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("orders")
    .insert([{ table_number: TABLE_NUMBER, items: items as any, total_amount: totalAmount }])
    .select()

  if (error) {
    console.error("Error submitting order:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function submitServiceRequest(requestType: "call_waiter" | "pack_food" | "note", details?: string) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("service_requests")
    .insert([{ table_number: TABLE_NUMBER, request_type: requestType, details }])
    .select()

  if (error) {
    console.error("Error submitting service request:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function saveSubscription(subscription: PushSubscription) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("push_subscriptions")
    .insert([{ subscription_details: subscription as any }])

  if (error) {
    console.error("Error saving push subscription:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
