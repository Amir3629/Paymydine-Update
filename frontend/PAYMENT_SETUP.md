# Secure Payment System Setup Guide

This guide will help you set up a secure, production-ready payment system for your PayMyDine restaurant platform.

## 🚀 Features

- **PCI Compliant**: Card data never touches your servers
- **Multiple Payment Methods**: Visa, Mastercard, PayPal, Apple Pay, Google Pay, Cash
- **Marketplace Payments**: Automatic money splitting to restaurant owners
- **Fraud Protection**: Built-in security measures
- **Real-time Processing**: Instant payment confirmation
- **Mobile Optimized**: Works on all devices

## 📋 Prerequisites

1. **Stripe Account** (for card payments)
2. **PayPal Business Account** (for PayPal payments)
3. **Apple Developer Account** (for Apple Pay)
4. **Google Pay Merchant Account** (for Google Pay)
5. **SSL Certificate** (HTTPS required)

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install @stripe/stripe-js @stripe/react-stripe-js @paypal/react-paypal-js stripe crypto-js uuid
npm install -D @types/crypto-js @types/uuid
```

### 2. Environment Variables

Create a `.env.local` file in the frontend directory:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_RESTAURANT_ACCOUNT_ID=acct_your_restaurant_stripe_account_id_here

# PayPal Configuration
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_MERCHANT_ID=your_paypal_merchant_id_here

# Apple Pay Configuration
APPLE_PAY_MERCHANT_ID=merchant.com.yourcompany.paymydine
APPLE_PAY_DOMAIN_NAME=yourdomain.com

# Google Pay Configuration
NEXT_PUBLIC_STRIPE_ACCOUNT_ID=acct_your_stripe_account_id_here

# Security
NEXT_PUBLIC_PAYMENT_ENCRYPTION_KEY=your_32_character_encryption_key_here

# Application URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Stripe Setup

1. **Create Stripe Account**: Go to [stripe.com](https://stripe.com) and create an account
2. **Get API Keys**: Find your publishable and secret keys in the Stripe Dashboard
3. **Enable Marketplace**: Set up Stripe Connect for marketplace payments
4. **Create Restaurant Accounts**: Each restaurant needs a Stripe Connect account

#### Stripe Connect Setup (for marketplace payments):

```javascript
// Create a Stripe Connect account for each restaurant
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: 'restaurant@example.com',
  capabilities: {
    card_payments: {requested: true},
    transfers: {requested: true},
  },
});
```

### 4. PayPal Setup

1. **Create PayPal Business Account**: Go to [paypal.com](https://paypal.com)
2. **Get API Credentials**: Create an app in PayPal Developer Dashboard
3. **Enable Marketplace**: Set up PayPal for Marketplaces
4. **Configure Webhooks**: Set up webhooks for payment notifications

### 5. Apple Pay Setup

1. **Apple Developer Account**: Required for Apple Pay
2. **Merchant ID**: Create a merchant ID in Apple Developer Console
3. **Domain Verification**: Verify your domain with Apple
4. **Certificates**: Download and install Apple Pay certificates

### 6. Google Pay Setup

1. **Google Pay Console**: Set up your merchant account
2. **API Access**: Enable Google Pay API
3. **Test Cards**: Use Google Pay test cards for development

## 🔒 Security Features

### PCI Compliance
- Card data is tokenized by Stripe
- No sensitive data stored on your servers
- HTTPS encryption for all communications

### Fraud Protection
- 3D Secure authentication
- Address verification
- CVV verification
- Risk scoring

### Data Encryption
- All payment data encrypted in transit
- Secure key management
- Regular security audits

## 💰 Marketplace Payment Flow

1. **Customer pays** using any supported method
2. **Platform fee** (3%) is automatically calculated
3. **Restaurant receives** the remaining amount
4. **Real-time notifications** sent to restaurant
5. **Transaction records** stored securely

## 🧪 Testing

### Test Cards (Stripe)
- **Visa**: 4242 4242 4242 4242
- **Mastercard**: 5555 5555 5555 4444
- **Declined**: 4000 0000 0000 0002

### Test PayPal
- Use PayPal sandbox accounts for testing
- Test with different payment scenarios

### Test Apple Pay
- Use iOS Simulator or physical device
- Test with different card types

## 🚀 Production Deployment

### 1. Update Environment Variables
- Change all test keys to production keys
- Update URLs to production domains
- Enable production webhooks

### 2. SSL Certificate
- Ensure HTTPS is enabled
- Use a valid SSL certificate
- Test all payment flows

### 3. Database Setup
- Create transaction tables
- Set up proper indexing
- Configure backups

### 4. Monitoring
- Set up payment monitoring
- Configure alerts for failures
- Monitor transaction volumes

## 📊 Database Schema

### Transactions Table
```sql
CREATE TABLE transactions (
  id VARCHAR(255) PRIMARY KEY,
  restaurant_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  table_number INT,
  items JSON,
  platform_fee DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Restaurant Payment Accounts
```sql
CREATE TABLE restaurant_payment_accounts (
  id VARCHAR(255) PRIMARY KEY,
  restaurant_id VARCHAR(255) NOT NULL,
  stripe_account_id VARCHAR(255),
  paypal_merchant_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 🔧 Troubleshooting

### Common Issues

1. **Payment Intent Creation Fails**
   - Check Stripe API keys
   - Verify restaurant account exists
   - Check amount format (must be in cents)

2. **PayPal Order Creation Fails**
   - Verify PayPal credentials
   - Check merchant ID
   - Ensure webhook URLs are correct

3. **Apple Pay Not Available**
   - Check device compatibility
   - Verify merchant ID
   - Test on physical device

4. **Google Pay Not Working**
   - Check Google Pay configuration
   - Verify domain setup
   - Test with different browsers

### Debug Mode
Enable debug logging by setting:
```env
NODE_ENV=development
PAYMENT_DEBUG=true
```

## 📞 Support

For technical support:
- Check the logs in your application
- Review Stripe/PayPal dashboards
- Contact payment gateway support
- Check this documentation

## 🔄 Updates

To update the payment system:
1. Pull latest changes from repository
2. Update dependencies: `npm update`
3. Test all payment methods
4. Deploy to production

## 📈 Analytics

Track payment performance:
- Success rates by payment method
- Average transaction amounts
- Peak payment times
- Failed payment reasons

## 🛡️ Compliance

Ensure compliance with:
- PCI DSS requirements
- GDPR data protection
- Local payment regulations
- Tax reporting requirements

---

**⚠️ Important**: Always test thoroughly in sandbox/test mode before going live. Payment systems handle real money and require careful testing.