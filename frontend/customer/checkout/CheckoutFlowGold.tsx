import { CustomerModal } from "../components/CustomerModal"
import type { CheckoutFlowGoldProps } from "./types"
import { CheckoutMyOrderGold } from "./CheckoutMyOrderGold"
import { CheckoutOrderStatusGold } from "./CheckoutOrderStatusGold"
import { CheckoutPaymentGold } from "./CheckoutPaymentGold"
import { CheckoutSplitBillGold } from "./CheckoutSplitBillGold"

export default function CheckoutFlowGold(props: CheckoutFlowGoldProps) {
  if (!props.isOpen) return null

  const renderStep = () => {
    if (props.step === "payment") return <CheckoutPaymentGold {...props} />
    if (props.step === "submitted" || props.step === "paid") return <CheckoutOrderStatusGold {...props} />
    if (props.step === "split" || props.step === "split-items" || props.step === "split-shares" || props.step === "split-review") return <CheckoutSplitBillGold {...props} />
    return <CheckoutMyOrderGold {...props} />
  }

  return (
    <div data-pmd-customer-app="gold-v1" data-pmd-customer-checkout="gold-v1">
      <CustomerModal title={props.title} onBack={props.onBack}>
        {renderStep()}
      </CustomerModal>
    </div>
  )
}
