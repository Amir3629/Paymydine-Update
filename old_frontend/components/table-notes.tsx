"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, X, Check } from "lucide-react"

interface TableNotesProps {
  tableId: string
}

export function TableNotes({ tableId }: TableNotesProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [note, setNote] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/v1/table-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: tableId,
          note: note.trim(),
          timestamp: new Date().toISOString()
        })
      })
      
      const result = await response.json()
      if (result.ok) {
        setIsSuccess(true)
        setNote("")
        setTimeout(() => {
          setIsSuccess(false)
          setIsOpen(false)
        }, 2000)
      } else {
        throw new Error(result.error || 'Failed to submit note')
      }
    } catch (error) {
      console.error('Table note failed:', error)
      alert('Failed to submit note. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="w-full bg-paydine-rose-beige hover:bg-paydine-rose-beige/90 text-paydine-elegant-gray"
        variant="outline"
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        Leave Note
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Leave a Note</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {isSuccess ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-green-800 mb-2">
                    Note Sent!
                  </h4>
                  <p className="text-gray-600">
                    Your note has been sent to the staff.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="note">Note for Staff</Label>
                    <textarea
                      id="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Leave a note for the staff..."
                      maxLength={500}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-paydine-rose-beige focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {note.length}/500 characters
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !note.trim()}
                      className="flex-1"
                    >
                      {isSubmitting ? "Sending..." : "Send Note"}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}