// components/dashboard/DashboardAccount.tsx
import { User, CreditCard, Settings, Mail, Phone, Building, Eye, EyeOff, Download, Shield, Globe, Bell } from "lucide-react"
import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { useTranslation } from "@/lib/i18n"

interface UserProfile {
  name: string
  email: string
  phone: string
  company: string
  plan: string
  nextBilling: string
  paymentMethod: string
  language: string
  timezone: string
  notifications: boolean
  twoFactorEnabled: boolean
}

export default function DashboardAccount() {
  const { language } = useLanguage()
  const { t } = useTranslation(language)
  
  const [profile, setProfile] = useState<UserProfile>({
    name: "Admin User",
    email: "admin@restaurant.com",
    phone: "+1 (555) 123-4567",
    company: "My Restaurant",
    plan: "Professional",
    nextBilling: "2025-02-19",
    paymentMethod: "Credit Card ending in 4242",
    language: "English",
    timezone: "UTC-5 (Eastern Time)",
    notifications: true,
    twoFactorEnabled: false
  })

  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  })

  const handleSave = async (field: string, value: any) => {
    setLoading(field)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setProfile(prev => ({ ...prev, [field]: value }))
    setEditing(null)
    setLoading(null)
  }

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      alert("New passwords don't match")
      return
    }
    if (passwords.new.length < 8) {
      alert("Password must be at least 8 characters")
      return
    }

    setLoading('password')
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setPasswords({ current: "", new: "", confirm: "" })
    setLoading(null)
    alert("Password updated successfully!")
  }

  const handleToggle2FA = async () => {
    setLoading('2fa')
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setProfile(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))
    setLoading(null)
  }

  const handleDownloadInvoice = async () => {
    setLoading('invoice')
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(null)
    // In real app, this would download the invoice
    alert("Invoice downloaded!")
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-brown-900 mb-4">{t("dashboard.account.title")}</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t("dashboard.account.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <User className="w-6 h-6 text-gold-600 mr-3" />
            <h3 className="text-lg font-semibold text-brown-900">{t("dashboard.account.personalInfo")}</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("dashboard.account.name")}</label>
              {editing === 'name' ? (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                  <button
                    onClick={() => handleSave('name', profile.name)}
                    disabled={loading === 'name'}
                    className="bg-gold-600 text-white px-4 py-2 rounded-lg hover:bg-gold-700 disabled:opacity-50"
                  >
                    {loading === 'name' ? '...' : t("dashboard.account.save")}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    {t("dashboard.account.cancel")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-gray-900">{profile.name}</span>
                  <button
                    onClick={() => setEditing('name')}
                    className="text-gold-600 hover:text-gold-700 text-sm font-medium"
                  >
                    {t("dashboard.account.edit")}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("dashboard.account.email")}</label>
              {editing === 'email' ? (
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                  <button
                    onClick={() => handleSave('email', profile.email)}
                    disabled={loading === 'email'}
                    className="bg-gold-600 text-white px-4 py-2 rounded-lg hover:bg-gold-700 disabled:opacity-50"
                  >
                    {loading === 'email' ? '...' : t("dashboard.account.save")}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    {t("dashboard.account.cancel")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-gray-900">{profile.email}</span>
                  <button
                    onClick={() => setEditing('email')}
                    className="text-gold-600 hover:text-gold-700 text-sm font-medium"
                  >
                    {t("dashboard.account.edit")}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("dashboard.account.phone")}</label>
              {editing === 'phone' ? (
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                  <button
                    onClick={() => handleSave('phone', profile.phone)}
                    disabled={loading === 'phone'}
                    className="bg-gold-600 text-white px-4 py-2 rounded-lg hover:bg-gold-700 disabled:opacity-50"
                  >
                    {loading === 'phone' ? '...' : t("dashboard.account.save")}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    {t("dashboard.account.cancel")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-gray-900">{profile.phone}</span>
                  <button
                    onClick={() => setEditing('phone')}
                    className="text-gold-600 hover:text-gold-700 text-sm font-medium"
                  >
                    {t("dashboard.account.edit")}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("dashboard.account.company")}</label>
              {editing === 'company' ? (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={profile.company}
                    onChange={(e) => setProfile(prev => ({ ...prev, company: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                  <button
                    onClick={() => handleSave('company', profile.company)}
                    disabled={loading === 'company'}
                    className="bg-gold-600 text-white px-4 py-2 rounded-lg hover:bg-gold-700 disabled:opacity-50"
                  >
                    {loading === 'company' ? '...' : t("dashboard.account.save")}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    {t("dashboard.account.cancel")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-gray-900">{profile.company}</span>
                  <button
                    onClick={() => setEditing('company')}
                    className="text-gold-600 hover:text-gold-700 text-sm font-medium"
                  >
                    {t("dashboard.account.edit")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Billing Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <CreditCard className="w-6 h-6 text-gold-600 mr-3" />
            <h3 className="text-lg font-semibold text-brown-900">{t("dashboard.account.billingDetails")}</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t("dashboard.account.plan")}:</span>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-brown-900">{profile.plan}</span>
                <button className="text-gold-600 hover:text-gold-700 text-sm font-medium">
                  {t("dashboard.account.changePlan")}
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t("dashboard.account.paymentMethod")}:</span>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-brown-900">{profile.paymentMethod}</span>
                <button className="text-gold-600 hover:text-gold-700 text-sm font-medium">
                  {t("dashboard.account.updatePayment")}
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t("dashboard.account.nextBilling")}:</span>
              <span className="font-medium text-brown-900">{profile.nextBilling}</span>
            </div>
            
            <div className="pt-4 border-t">
              <button
                onClick={handleDownloadInvoice}
                disabled={loading === 'invoice'}
                className="flex items-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4 mr-2" />
                {loading === 'invoice' ? 'Downloading...' : t("dashboard.account.downloadInvoice")}
              </button>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <Settings className="w-6 h-6 text-gold-600 mr-3" />
            <h3 className="text-lg font-semibold text-brown-900">{t("dashboard.account.accountSettings")}</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t("dashboard.account.language")}:</span>
              <span className="font-medium text-brown-900">{profile.language}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t("dashboard.account.timezone")}:</span>
              <span className="font-medium text-brown-900">{profile.timezone}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t("dashboard.account.notifications")}:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.notifications}
                  onChange={(e) => handleSave('notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <Shield className="w-6 h-6 text-gold-600 mr-3" />
            <h3 className="text-lg font-semibold text-brown-900">{t("dashboard.account.security")}</h3>
          </div>
          
          <div className="space-y-6">
            {/* Change Password */}
            <div>
              <h4 className="font-medium text-brown-900 mb-3">{t("dashboard.account.changePassword")}</h4>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("dashboard.account.currentPassword")}
                    value={passwords.current}
                    onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
                
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("dashboard.account.newPassword")}
                  value={passwords.new}
                  onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("dashboard.account.confirmPassword")}
                  value={passwords.confirm}
                  onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                
                <button
                  onClick={handlePasswordChange}
                  disabled={loading === 'password' || !passwords.current || !passwords.new || !passwords.confirm}
                  className="bg-gold-600 text-white px-4 py-2 rounded-lg hover:bg-gold-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === 'password' ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </div>
                  ) : (
                    t("dashboard.account.updatePassword")
                  )}
                </button>
              </div>
            </div>
            
            {/* Two-Factor Authentication */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
            <div>
                  <h4 className="font-medium text-brown-900">{t("dashboard.account.twoFactor")}</h4>
                  <p className="text-sm text-gray-600">
                    {profile.twoFactorEnabled ? t("dashboard.account.enabled") : t("dashboard.account.disabled")}
                  </p>
                </div>
                <button
                  onClick={handleToggle2FA}
                  disabled={loading === '2fa'}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    profile.twoFactorEnabled
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {loading === '2fa' ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Loading...
                    </div>
                  ) : (
                    profile.twoFactorEnabled ? t("dashboard.account.disable2FA") : t("dashboard.account.enable2FA")
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
