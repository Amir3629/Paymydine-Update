// components/dashboard/DashboardDocuments.tsx
import { UploadCloud, FileText, CheckCircle, AlertCircle, X } from "lucide-react"
import { useState, useRef } from "react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

const requiredDocs = [
  { name: "dashboard.documents.businessLicense", key: "businessLicense" },
  { name: "dashboard.documents.taxCertificate", key: "taxCertificate" },
  { name: "dashboard.documents.bankAccount", key: "bankAccount" },
  { name: "dashboard.documents.identity", key: "identity" }
]

interface UploadedFile {
  name: string
  size: number
  type: string
  uploadedAt: Date
}

export default function DashboardDocuments() {
  const [uploaded, setUploaded] = useState<{ [key: string]: UploadedFile }>({})
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({})
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const { language } = useLanguage()
  const { t } = useTranslation(language)

  const handleFileSelect = (key: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB')
      return
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      alert('Only PDF, JPG, and PNG files are allowed')
      return
    }

    handleUpload(key, file)
  }

  const handleUpload = async (key: string, file: File) => {
    setUploading(prev => ({ ...prev, [key]: true }))
    setUploadProgress(prev => ({ ...prev, [key]: 0 }))

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const currentProgress = prev[key] || 0
        if (currentProgress >= 100) {
          clearInterval(interval)
          return prev
        }
        return { ...prev, [key]: currentProgress + 10 }
      })
    }, 200)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))

    setUploaded(prev => ({ 
      ...prev, 
      [key]: {
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date()
      }
    }))
    setUploading(prev => ({ ...prev, [key]: false }))
    setUploadProgress(prev => ({ ...prev, [key]: 100 }))
  }

  const handleRemoveFile = (key: string) => {
    setUploaded(prev => {
      const newUploaded = { ...prev }
      delete newUploaded[key]
      return newUploaded
    })
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[key]
      return newProgress
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const allDocumentsUploaded = requiredDocs.every(doc => uploaded[doc.key])

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-brown-900 mb-4">{t("dashboard.documents.title")}</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t("dashboard.documents.subtitle")}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-brown-900">Upload Progress</h3>
          <span className="text-sm text-gray-500">
            {Object.keys(uploaded).length} of {requiredDocs.length} documents uploaded
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gold-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${(Object.keys(uploaded).length / requiredDocs.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Document Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {requiredDocs.map((doc) => (
          <div key={doc.key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gold-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-gold-600" />
            </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-brown-900 mb-1">{t(doc.name)}</div>
                <div className="text-sm text-gray-500 mb-3">{t("dashboard.documents.acceptedFormats")}</div>
                
                {uploaded[doc.key] ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="text-sm font-medium text-green-800">{uploaded[doc.key].name}</div>
                          <div className="text-xs text-green-600">
                            {formatFileSize(uploaded[doc.key].size)} • {t("dashboard.documents.uploaded")}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(doc.key)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : uploading[doc.key] ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium text-blue-800">Uploading...</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress[doc.key] || 0}%` }}
                      ></div>
                    </div>
            </div>
                ) : (
            <div>
                    <input
                      ref={el => fileInputRefs.current[doc.key] = el}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileSelect(doc.key, file)
                      }}
                      className="hidden"
                    />
                <button
                      onClick={() => fileInputRefs.current[doc.key]?.click()}
                      className="flex items-center bg-gold-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-700 transition-colors"
                >
                      <UploadCloud className="w-4 h-4 mr-2" />
                      {t("dashboard.documents.upload")}
                </button>
                  </div>
              )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success Message */}
      {allDocumentsUploaded && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <div className="font-semibold text-green-800">All documents uploaded successfully!</div>
              <div className="text-sm text-green-600">
                Your documents are being reviewed. You'll receive an email confirmation within 24 hours.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gradient-to-r from-gold-500 to-amber-500 rounded-lg p-8 text-white text-center">
        <h3 className="text-2xl font-bold mb-4">{t("dashboard.documents.needHelp")}</h3>
        <p className="text-gold-100 mb-4">
          {t("dashboard.documents.needHelpDesc")}
        </p>
        <button className="bg-white text-gold-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
          {t("dashboard.documents.contactSupport")}
        </button>
      </div>
    </div>
  )
}
