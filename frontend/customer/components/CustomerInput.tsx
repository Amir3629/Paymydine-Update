import type { InputHTMLAttributes } from "react"

export function CustomerInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={["pmd-customer-input", className].filter(Boolean).join(" ")} {...props} />
}
