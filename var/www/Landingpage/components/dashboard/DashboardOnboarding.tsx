// components/dashboard/DashboardOnboarding.tsx
import { CheckCircle, Clock, FileText, CreditCard, User, ArrowRight, Star, TrendingUp } from "lucide-react"
import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

const steps = [
  { step: 1, title: "dashboard.steps.choosePlan", description: "dashboard.steps.choosePlanDesc", status: "completed" },
  { step: 2, title: "dashboard.steps.uploadDocs", description: "dashboard.steps.uploadDocsDesc", status: "current" },
  { step: 3, title: "dashboard.steps.signContract", description: "dashboard.steps.signContractDesc", status: "pending" },
  { step: 4, title: "dashboard.steps.setupComplete", description: "dashboard.steps.setupCompleteDesc", status: "pending" }
]

const timeline = [
  { event: "Account Created", date: "2025-01-19", status: "completed" },
  { event: "Plan Selected", date: "2025-01-19", status: "completed" },
  { event: "Documents Uploaded", date: "—", status: "current" },
  { event: "Contract Signed", date: "—", status: "pending" },
  { event: "App Installed", date: "—", status: "pending" }
]

const currentStatus = {
  planSelected: "Professional Plan",
  totalSteps: 4,
  completedSteps: 1,
  currentStep: "Upload Documents",
  estimatedCompletion: "2-3 business days"
}

function getStatusIcon(status: string) {
  if (status === "completed") return <CheckCircle className="w-6 h-6 text-green-500" />;
  if (status === "current") return <Clock className="w-6 h-6 text-gold-500 animate-pulse" />;
  return <ArrowRight className="w-6 h-6 text-gray-400" />;
}

export default function DashboardOnboarding() {
  const [loading, setLoading] = useState<string | null>(null)
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  const handleButtonClick = async (action: string) => {
    setLoading(action)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(null)
    // Handle the action here
    console.log(`Action: ${action}`)
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-gold-500 to-amber-500 rounded-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("dashboard.onboarding.welcome")}</h1>
            <p className="text-gold-100 mb-4">
              {t("dashboard.onboarding.subtitle")}
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-1" />
                {t("dashboard.onboarding.selected")}: {currentStatus.planSelected}
              </div>
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                {t("dashboard.onboarding.progress")}: {currentStatus.completedSteps}/{currentStatus.totalSteps} steps
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {t("dashboard.onboarding.eta")}: {currentStatus.estimatedCompletion}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{Math.round((currentStatus.completedSteps / currentStatus.totalSteps) * 100)}%</div>
            <div className="text-gold-100 text-sm">{t("dashboard.onboarding.complete")}</div>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-brown-900">{t("dashboard.onboarding.currentStatus")}</h3>
          <span className="bg-gold-100 text-gold-800 px-3 py-1 rounded-full text-sm font-medium">
            {currentStatus.currentStep}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gold-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${(currentStatus.completedSteps / currentStatus.totalSteps) * 100}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Step {currentStatus.completedSteps + 1} of {currentStatus.totalSteps}: {currentStatus.currentStep}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-brown-900 mb-6">{t("dashboard.onboarding.steps")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300
                ${step.status === "completed" ? "bg-green-100 ring-2 ring-green-500" : 
                  step.status === "current" ? "bg-gold-100 ring-2 ring-gold-500" : "bg-gray-100"}
              `}>
                {step.status === "completed" && <CheckCircle className="w-8 h-8 text-green-500" />}
                {step.status === "current" && <Clock className="w-8 h-8 text-gold-500 animate-pulse" />}
                {step.status === "pending" && <span className="text-2xl font-bold text-gray-400">{step.step}</span>}
              </div>
              <div className="font-semibold text-brown-900 mb-2">{t(step.title)}</div>
              <div className="text-sm text-gray-500">{t(step.description)}</div>
              {step.status === "current" && (
                <button 
                  onClick={() => handleButtonClick(`continue-${step.step}`)}
                  disabled={loading === `continue-${step.step}`}
                  className="mt-3 bg-gold-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === `continue-${step.step}` ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
            </div>
                  ) : (
                    t("dashboard.onboarding.continue")
                  )}
                </button>
            )}
          </div>
        ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-brown-900 mb-4">{t("dashboard.onboarding.timeline")}</h3>
        <div className="space-y-4">
          {timeline.map((item, idx) => (
            <div key={idx} className="flex items-center space-x-4">
              <div>
                {getStatusIcon(item.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                <div className="font-medium text-brown-900">{item.event}</div>
                <div className="text-sm text-gray-500">{item.date}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-brown-900 mb-4">{t("dashboard.onboarding.whatsNext")}</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-gold-50 rounded-lg">
            <FileText className="w-5 h-5 text-gold-600" />
            <div className="flex-1">
              <div className="font-medium text-brown-900">{t("dashboard.steps.uploadDocs")}</div>
              <div className="text-sm text-gray-600">{t("dashboard.steps.uploadDocsDesc")}</div>
            </div>
            <button 
              onClick={() => handleButtonClick('upload-docs')}
              disabled={loading === 'upload-docs'}
              className="bg-gold-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'upload-docs' ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading...
                </div>
              ) : (
                t("dashboard.onboarding.uploadNow")
              )}
            </button>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-gray-600" />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{t("dashboard.steps.signContract")}</div>
              <div className="text-sm text-gray-600">{t("dashboard.steps.signContractDesc")}</div>
            </div>
            <span className="text-sm text-gray-500">{t("dashboard.onboarding.pending")}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
