"use client"

import React from "react"
import {
  OrganicBotanicalNoteDialog,
  OrganicBotanicalWaiterDialog,
} from "./OrganicGuestDialogs"

type WaiterProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  tableId: string
  tableName?: string
}

type NoteProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  note: string
  setNote: (note: string) => void
  onSend: () => void
  tableId: string
  tableName?: string
}

export function OrganicWaiterCardV2({ tableName: _tableName, ...props }: WaiterProps) {
  return <OrganicBotanicalWaiterDialog {...props} />
}

export function OrganicNoteCardV2({ tableId: _tableId, tableName: _tableName, ...props }: NoteProps) {
  return <OrganicBotanicalNoteDialog {...props} />
}
