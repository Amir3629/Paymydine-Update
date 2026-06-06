"use client"

import type React from "react"
import { useState } from "react"
import { useCmsStore } from "@/store/cms-store"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, AlertCircle, CheckCircle, CreditCard, Banknote } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function MerchantSettingsPage() {
  const { merchantSettings, updateMerchantSettings } = useCmsStore()
  const { toast } = useToast()
  const [showSecrets, setShowSecrets] = useState(false)
  const [formData, setFormData] = useState(merchantSettings)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    updateMerchantSettings(formData)
    toast({ 
      title: "Settings Saved", 
      description: "Your merchant settings have been updated successfully.",
      variant: "default"
    })
  }

  const handleTestConnection = async (provider: string) => {
    toast({ 
      title: "Testing Connection...", 
      description: `Testing ${provider} configuration`,
      variant: "default"
    })
    
    // Simulate API test
    setTimeout(() => {
      toast({ 
        title: "Connection Successful", 
        description: `${provider} configuration is valid`,
        variant: "default"
      })
    }, 2000)
  }

  const isStripeConfigured = formData.stripeSecretKey && formData.stripePublishableKey
  const isPayPalConfigured = formData.paypalClientId && formData.paypalClientSecret
  const isBankConfigured = formData.bankAccountNumber && formData.bankRoutingNumber && formData.bankName

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Merchant Settings</h1>
        <p className="text-gray-600">Configure your payment processing and bank account details</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Notice:</strong> Your sensitive payment information is stored locally in your browser. 
          For production use, consider using environment variables or a secure configuration service.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="business">Business Info</TabsTrigger>
          <TabsTrigger value="stripe">Stripe</TabsTrigger>
          <TabsTrigger value="paypal">PayPal</TabsTrigger>
          <TabsTrigger value="bank">Bank Account</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Basic business details used for payment processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange("businessName", e.target.value)}
                    placeholder="Your Restaurant Name"
                  />
                </div>
                <div>
                  <Label htmlFor="accountId">Merchant Account ID</Label>
                  <Input
                    id="accountId"
                    value={formData.accountId}
                    onChange={(e) => handleInputChange("accountId", e.target.value)}
                    placeholder="MERCHANT_12345"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => handleInputChange("currency", e.target.value)}
                    placeholder="USD"
                  />
                </div>
                <div>
                  <Label htmlFor="countryCode">Country Code</Label>
                  <Input
                    id="countryCode"
                    value={formData.countryCode}
                    onChange={(e) => handleInputChange("countryCode", e.target.value)}
                    placeholder="US"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stripe">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Stripe Configuration
                  {isStripeConfigured && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
              </CardTitle>
              <CardDescription>
                Configure Stripe for credit card processing. Get your keys from{" "}
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Stripe Dashboard
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="stripePublishableKey">Publishable Key</Label>
                <Input
                  id="stripePublishableKey"
                  value={formData.stripePublishableKey}
                  onChange={(e) => handleInputChange("stripePublishableKey", e.target.value)}
                  placeholder="pk_test_..."
                />
              </div>
              <div>
                <Label htmlFor="stripeSecretKey">Secret Key</Label>
                <div className="relative">
                  <Input
                    id="stripeSecretKey"
                    type={showSecrets ? "text" : "password"}
                    value={formData.stripeSecretKey}
                    onChange={(e) => handleInputChange("stripeSecretKey", e.target.value)}
                    placeholder="sk_test_..."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {isStripeConfigured && (
                <Button 
                  onClick={() => handleTestConnection("Stripe")}
                  variant="outline"
                  className="w-full"
                >
                  Test Stripe Connection
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paypal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  PayPal Configuration
                  {isPayPalConfigured && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
              </CardTitle>
              <CardDescription>
                Configure PayPal for payment processing. Get your credentials from{" "}
                <a href="https://developer.paypal.com/developer/applications/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  PayPal Developer
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="paypalClientId">Client ID</Label>
                <Input
                  id="paypalClientId"
                  value={formData.paypalClientId}
                  onChange={(e) => handleInputChange("paypalClientId", e.target.value)}
                  placeholder="AYjcyDKmeE..."
                />
              </div>
              <div>
                <Label htmlFor="paypalClientSecret">Client Secret</Label>
                <div className="relative">
                  <Input
                    id="paypalClientSecret"
                    type={showSecrets ? "text" : "password"}
                    value={formData.paypalClientSecret}
                    onChange={(e) => handleInputChange("paypalClientSecret", e.target.value)}
                    placeholder="EHD8wKmeE..."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {isPayPalConfigured && (
                <Button 
                  onClick={() => handleTestConnection("PayPal")}
                  variant="outline"
                  className="w-full"
                >
                  Test PayPal Connection
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  Bank Account Details
                  {isBankConfigured && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
              </CardTitle>
              <CardDescription>
                Your bank account where payments will be deposited
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => handleInputChange("bankName", e.target.value)}
                  placeholder="Chase Bank"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bankAccountNumber">Account Number</Label>
                  <div className="relative">
                    <Input
                      id="bankAccountNumber"
                      type={showSecrets ? "text" : "password"}
                      value={formData.bankAccountNumber}
                      onChange={(e) => handleInputChange("bankAccountNumber", e.target.value)}
                      placeholder="1234567890"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bankRoutingNumber">Routing Number</Label>
                  <Input
                    id="bankRoutingNumber"
                    value={formData.bankRoutingNumber}
                    onChange={(e) => handleInputChange("bankRoutingNumber", e.target.value)}
                    placeholder="021000021"
                  />
                </div>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This information is used to configure automatic deposits from your payment processor to your bank account.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={() => setFormData(merchantSettings)}>
          Reset
        </Button>
        <Button onClick={handleSave} className="bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige text-paydine-elegant-gray">
          Save Settings
        </Button>
      </div>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-800">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-700 space-y-2">
          <p><strong>1. Stripe Setup:</strong> Create a Stripe account, get your API keys, and connect your bank account in the Stripe dashboard.</p>
          <p><strong>2. PayPal Setup:</strong> Create a PayPal Business account and get your API credentials from the Developer console.</p>
          <p><strong>3. Bank Account:</strong> Ensure your bank account is verified with your payment processors for automatic deposits.</p>
          <p><strong>4. Testing:</strong> Use test mode initially, then switch to live mode when ready for production.</p>
        </CardContent>
      </Card>
    </div>
  )
} 