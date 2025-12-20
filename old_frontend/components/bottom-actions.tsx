"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { HandPlatter, NotebookPen, ShoppingCart, ChevronUp, ChevronDown, CheckCircle } from "lucide-react"
import { useCartStore } from "@/store/cart-store"
import { useLanguageStore } from "@/store/language-store"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { OptimizedImage } from "@/components/ui/optimized-image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { type MenuItem } from "@/lib/data"
import { formatCurrency } from "@/lib/currency"

// Hook to get current theme background color
function useThemeBackgroundColor() {
  const [color, setColor] = useState('#FAFAFA');
  const [themeId, setThemeId] = useState('clean-light');
  
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const updateColor = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'clean-light';
      const themeBg = getComputedStyle(document.documentElement).getPropertyValue('--theme-background').trim();
      
      // Special case: Clean Light theme uses black text
      if (currentTheme === 'clean-light') {
        setColor('#000000');
      } else if (currentTheme === 'minimal') {
        setColor('#CFEBF7'); // Light Blue
      } else {
        setColor(themeBg || '#FAFAFA');
      }
      setThemeId(currentTheme);
    };
    
    updateColor();
    
    // Watch for theme changes
    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    
    return () => observer.disconnect();
  }, []);
  
  return color;
}

type ToolbarState = "collapsed" | "preview" | "expanded"

type CartItem = {
  item: MenuItem;
  quantity: number;
}

// Enhanced Waiter Dialog Component
const EnhancedWaiterDialog = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}) => {
  const { t } = useLanguageStore()
  const [dialogState, setDialogState] = useState<"confirming" | "confirmed" | "closing">("confirming")
  const [showSuccess, setShowSuccess] = useState(false)

  const handleConfirm = async () => {
    setDialogState("confirmed")
    setShowSuccess(true)
    
    // Longer delays for smoother transitions
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Show success state for longer
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setShowSuccess(false)
    await new Promise(resolve => setTimeout(resolve, 300))
    
    setDialogState("closing")
    await new Promise(resolve => setTimeout(resolve, 300))
    
    setDialogState("confirming")
    onOpenChange(false)
  }

  const handleClose = async () => {
    setDialogState("closing")
    await new Promise(resolve => setTimeout(resolve, 300))
    setDialogState("confirming")
    onOpenChange(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ 
              scale: dialogState === "closing" ? 0.95 : 1,
              opacity: dialogState === "closing" ? 0 : 1,
              y: dialogState === "closing" ? 20 : 0
            }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className="rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            style={{ 
              backgroundColor: 'var(--page-bg, #FAFAFA)',
              opacity: 0.95,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Success State */}
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="p-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"
                  >
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="text-2xl font-semibold mb-2"
                    style={{ color: 'var(--theme-text-primary, #1A202C)', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                  >
                    {t("waiterComing")}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    style={{ color: 'var(--theme-text-secondary, #4A5568)' }}
                  >
                    {t("waiterCalledDesc")}
                  </motion.p>
                </motion.div>
              ) : (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8"
                >
                  <div className="text-center mb-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="mx-auto w-16 h-16 bg-paydine-champagne rounded-full flex items-center justify-center mb-4"
                    >
                      <HandPlatter className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="text-2xl font-semibold mb-2" style={{ color: 'var(--theme-text-primary, #1A202C)', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                      {t("callWaiter")}
                    </h3>
                    <p style={{ color: 'var(--theme-text-secondary, #4A5568)', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                      {t("callWaiterConfirm")}
                    </p>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleClose}
                      className="flex-1 py-3 px-6 rounded-xl font-medium transition-colors"
                      style={{ 
                        backgroundColor: 'var(--theme-input, #F7FAFC)', 
                        color: 'var(--theme-text-primary, #1A202C)',
                        border: '1px solid var(--theme-border, #E2E8F0)'
                      }}
                    >
                      {t("no")}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirm}
                      className="flex-1 py-3 px-6 rounded-xl bg-paydine-champagne text-white font-medium hover:bg-paydine-champagne/90 transition-colors"
                    >
                      {t("yes")}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Enhanced Note Dialog with smooth animations
const EnhancedNoteDialog = ({
  isOpen,
  onOpenChange,
  note,
  setNote,
  onSend,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  note: string
  setNote: (v: string) => void
  onSend: () => void
}) => {
  const { t } = useLanguageStore()
  const [dialogState, setDialogState] = useState<"editing" | "sending" | "sent" | "closing">("editing")
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSend = () => {
    if (note.trim()) {
      setDialogState("sending")
      
      // Simulate sending
      setTimeout(() => {
        setDialogState("sent")
        setShowSuccess(true)
        
        // Auto close after showing success
        setTimeout(() => {
          setShowSuccess(false)
          setDialogState("closing")
          setTimeout(() => {
            setDialogState("editing")
        setNote("")
        onOpenChange(false)
          }, 300)
      }, 2000)
      }, 800)
    }
  }

  const handleClose = () => {
    setDialogState("closing")
    setTimeout(() => {
      setDialogState("editing")
    setNote("")
    onOpenChange(false)
    }, 300)
  }

  return (
      <AnimatePresence>
        {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
            <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ 
              scale: dialogState === "closing" ? 0.8 : 1, 
              opacity: dialogState === "closing" ? 0 : 1, 
              y: dialogState === "closing" ? 20 : 0 
            }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: dialogState === "closing" ? 0.3 : 0.5
            }}
            className="backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            style={{ 
              backgroundColor: 'var(--page-bg, #FAFAFA)', 
              opacity: 0.95,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Success State */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="p-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"
                  >
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="text-xl font-semibold mb-2"
                    style={{ color: 'var(--theme-text-primary, #1A202C)' }}
                  >
                    {t("messageReceived")}
                  </motion.h3>
                  <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    style={{ color: 'var(--theme-text-secondary, #4A5568)' }}
                >
                    {t("messageReceivedDesc")}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Editing State */}
            <AnimatePresence>
              {!showSuccess && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-8"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="text-center mb-6"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="mx-auto w-16 h-16 bg-paydine-champagne/20 rounded-full flex items-center justify-center mb-4"
                    >
                      <NotebookPen className="w-8 h-8 text-paydine-champagne" />
                    </motion.div>
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                      className="text-xl font-semibold mb-2"
                      style={{ color: 'var(--theme-text-primary, #1A202C)' }}
                    >
                      {t("leaveNoteTitle")}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                      style={{ color: 'var(--theme-text-secondary, #4A5568)' }}
                    >
                      {t("leaveNoteDesc")}
                    </motion.p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="mb-6"
                >
                  <Textarea
                    placeholder={t("notePlaceholder")}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                      className="w-full min-h-[120px] rounded-2xl resize-none focus:ring-2 focus:ring-paydine-champagne/20"
                      style={{ 
                        border: '1px solid var(--theme-border, #E2E8F0)',
                        backgroundColor: 'var(--theme-input, #F7FAFC)',
                        color: 'var(--theme-text-primary, #1A202C)'
                      }}
                      disabled={dialogState === "sending"}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                    className="flex gap-3 justify-center"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleClose}
                      disabled={dialogState === "sending"}
                      className="flex-1 py-3 px-6 rounded-2xl font-medium transition-colors disabled:opacity-50"
                      style={{ 
                        border: '1px solid var(--theme-border, #E2E8F0)',
                        color: 'var(--theme-text-primary, #1A202C)',
                        backgroundColor: 'var(--theme-input, #F7FAFC)'
                      }}
                    >
                      {t("cancel")}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSend}
                      disabled={dialogState === "sending" || !note.trim()}
                      className="flex-1 py-3 px-6 rounded-2xl bg-paydine-champagne text-white font-medium transition-colors hover:bg-paydine-champagne/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {dialogState === "sending" ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        t("sendNote")
                      )}
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
  )
}

export function BottomActions() {
  const { t } = useLanguageStore()
  const { items } = useCartStore()
  const [toolbarState, setToolbarState] = useState<ToolbarState>("collapsed")
  const [waiterConfirmOpen, setWaiterConfirmOpen] = useState(false)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [note, setNote] = useState("")
  const { toast } = useToast()
  const themeBackgroundColor = useThemeBackgroundColor()

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)
  const totalPrice = items.reduce((acc, item) => acc + (item.item.price || 0) * item.quantity, 0)
  const showBillArrow = totalItems > 0

  useEffect(() => {
    if (totalItems === 0) {
      setToolbarState("collapsed")
    } else if (toolbarState === "collapsed") {
      setToolbarState("preview")
    }
  }, [totalItems, toolbarState])

  const handleWaiterCall = () => {
    setWaiterConfirmOpen(true)
  }

  const handleSendNote = () => {
    if (note.trim()) {
      toast({
        title: t("noteSent"),
        description: t("noteSentDesc"),
      })
      setNote("")
    }
  }

  // Heights for each state
  const collapsedHeight = 76
  const previewHeight = 180
  const expandedHeight = 420

  let height = collapsedHeight
  if (toolbarState === "preview") height = previewHeight
  if (toolbarState === "expanded") height = expandedHeight

  return (
    <>
      <motion.div
        className="fixed bottom-[1.35rem] left-1/2 -translate-x-1/2 w-full max-w-[23.04rem] z-40 px-2"
        animate={
          toolbarState === "expanded"
            ? { height: "auto" }
            : { height }
        }
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ pointerEvents: "auto" }}
      >
        <div
          className="
            relative flex flex-col w-full h-full
            backdrop-blur-lg
            rounded-[2.5rem] shadow-2xl border border-white/30 ring-1 ring-paydine-champagne/10
          "
          style={{ 
            minHeight: 76, 
            height: "100%",
            backgroundColor: "var(--theme-background, #FAFAFA)",
            opacity: 0.7
          }}
        >
          {/* Arrow for expanding/collapsing bill */}
          {showBillArrow && (
            <button
              className="absolute left-1/2 -top-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow border border-paydine-champagne/30 transition-all"
              style={{ transform: "translateX(-50%)" }}
              onClick={() =>
                setToolbarState(toolbarState === "expanded" ? "preview" : "expanded")
              }
              aria-label={toolbarState === "expanded" ? "Hide bill" : "Show bill"}
            >
              {toolbarState === "expanded" ? (
                <ChevronDown className="w-5 h-5 text-paydine-champagne" />
              ) : (
                <ChevronUp className="w-5 h-5 text-paydine-champagne" />
              )}
            </button>
          )}

          {/* Bill preview/expanded */}
          <AnimatePresence mode="popLayout">
            {(toolbarState === "preview" || toolbarState === "expanded") && (
              <motion.div
                key="bill"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="w-full px-6 pt-8 pb-2 scrollbar-hide"
                style={{
                  maxHeight: toolbarState === "expanded" ? 320 : 90,
                  overflowY: toolbarState === "expanded" ? "auto" : "visible",
                  height: toolbarState === "expanded" ? "auto" : undefined,
                  msOverflowStyle: "none",
                  scrollbarWidth: "none",
                }}
              >
                <div className="flex flex-col">
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {items.slice(toolbarState === "preview" ? -1 : 0).map((item: CartItem) => (
                        <motion.div
                          key={item.item.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            transition: { duration: 0.25 }
                          }}
                          exit={{
                            opacity: 0,
                            scale: 0.95,
                            transition: { duration: 0.18 }
                          }}
                          className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center space-x-3">
                            <motion.div
                              className="relative w-12 h-12"
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0.8 }}
                            >
                              <OptimizedImage
                                src={item.item.image || "/placeholder.svg"}
                                alt={item.item.name}
                                fill
                                className="rounded-xl object-cover"
                              />
                            </motion.div>
                            <div>
                              <motion.div
                                className="font-medium text-paydine-elegant-gray text-base"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                              >
                                {item.item.name}
                              </motion.div>
                              <motion.div
                                className="text-sm text-gray-500"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                              >
          {formatCurrency(item.item.price)} × {item.quantity}
                              </motion.div>
                            </div>
                          </div>
                          <motion.div
                            className="font-semibold text-paydine-champagne text-lg"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                          >
          {formatCurrency((item.item.price || 0) * item.quantity)}
                          </motion.div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  {/* Show total only in expanded */}
                  {toolbarState === "expanded" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-4 pt-4 border-t border-paydine-champagne/30 bg-paydine-rose-beige/10 rounded-xl p-4"
                    >
                      <div className="flex justify-between items-center">
                        <motion.span
                          className="font-bold text-paydine-elegant-gray text-lg"
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                        >
                          Total
                        </motion.span>
                        <motion.span
                          className="font-bold text-paydine-champagne text-2xl"
                          initial={{ x: 10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                        >
        {formatCurrency(totalPrice)}
                        </motion.span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom actions */}
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              className="relative w-12 h-12 rounded-xl"
              onClick={handleWaiterCall}
            >
              <HandPlatter className="w-8 h-8 text-paydine-elegant-gray" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative w-12 h-12 rounded-xl"
              onClick={() => setNoteModalOpen(true)}
            >
              <NotebookPen className="w-8 h-8 text-paydine-elegant-gray" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative w-12 h-12 rounded-xl"
              onClick={() => setToolbarState("expanded")}
            >
              <ShoppingCart className="w-8 h-8 text-paydine-elegant-gray" />
              {totalItems > 0 && (
                <span 
                  className="absolute -top-1 -right-1 w-5 h-5 bg-paydine-champagne flex items-center justify-center rounded-full cart-badge-number"
                  style={{ 
                    fontSize: '12px',
                    color: themeBackgroundColor
                  }}>
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      <EnhancedWaiterDialog
        isOpen={waiterConfirmOpen}
        onOpenChange={setWaiterConfirmOpen}
      />

      <EnhancedNoteDialog
        isOpen={noteModalOpen}
        onOpenChange={setNoteModalOpen}
        note={note}
        setNote={setNote}
        onSend={handleSendNote}
      />
    </>
  )
}