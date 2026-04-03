
// stripe-diagnose.js
// Usage:
// STRIPE_SECRET_KEY=sk_test_XXXX node stripe-diagnose.js

const Stripe = require("stripe");

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY;

  if (!secret) {
    console.error("❌ Missing STRIPE_SECRET_KEY environment variable.");
    console.log("Usage:");
    console.log("STRIPE_SECRET_KEY=sk_test_xxx node stripe-diagnose.js");
    process.exit(1);
  }

  const stripe = new Stripe(secret, {
    apiVersion: "2023-10-16",
  });

  console.log("=== Last 5 PaymentIntents ===");
  const intents = await stripe.paymentIntents.list({ limit: 5 });

  intents.data.forEach(pi => {
    console.log({
      id: pi.id,
      amount: pi.amount,
      currency: pi.currency,
      status: pi.status,
      created: new Date(pi.created * 1000).toISOString(),
    });
  });

  console.log("\n=== Last 5 Checkout Sessions ===");
  const sessions = await stripe.checkout.sessions.list({ limit: 5 });

  sessions.data.forEach(s => {
    console.log({
      id: s.id,
      currency: s.currency,
      amount_total: s.amount_total,
      payment_intent: s.payment_intent,
      created: new Date(s.created * 1000).toISOString(),
    });
  });

  console.log("\n✅ Done.");
}

main().catch(err => {
  console.error("Stripe Error:", err.message);
  process.exit(1);
});
