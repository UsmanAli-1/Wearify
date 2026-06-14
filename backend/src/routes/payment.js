const express = require("express");
const Stripe = require("stripe");
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");
const auth = require("../middleware/auth");

const plans = {
  basic: { name: "Basic Plan", amount: 120000, points: 400 },
  pro: { name: "Pro Plan", amount: 300000, points: 1000 },
  premium: { name: "Premium Plan", amount: 600000, points: 2000 },
};

// Create checkout session
router.post("/create-checkout", auth, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    const selected = plans[plan];
    if (!selected) return res.status(400).json({ message: "Invalid plan" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "pkr",
          product_data: { name: selected.name },
          unit_amount: selected.amount,
        },
        quantity: 1,
      }],
      metadata: { userId: userId.toString(), plan },
      success_url: `${process.env.CLIENT_URL}/plans?plan=${plan}`,
      cancel_url: `${process.env.CLIENT_URL}/plans`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
});

// Shared helper — credit a user's points for a plan, idempotently.
// Uses a per-PaymentIntent guard (creditedPaymentIntents) so the same
// payment can never be credited twice, whether confirmed via webhook,
// direct confirm endpoint, or both (race-safe enough for this use case).
async function creditPointsForPaymentIntent(userId, plan, paymentIntentId, source) {
  const pointsToAdd = plans[plan]?.points;
  if (!userId || !pointsToAdd) {
    console.error(`❌ [${source}] Missing userId or invalid plan:`, userId, plan);
    return { ok: false, reason: "invalid_plan_or_user" };
  }

  const user = await User.findById(userId);
  if (!user) {
    console.error(`❌ [${source}] User not found:`, userId);
    return { ok: false, reason: "user_not_found" };
  }

  // Idempotency guard: skip if this PaymentIntent was already credited.
  const alreadyCredited = (user.creditedPaymentIntents || []).includes(paymentIntentId);
  if (alreadyCredited) {
    console.log(`ℹ️ [${source}] PaymentIntent ${paymentIntentId} already credited for user ${userId}, skipping`);
    return { ok: true, alreadyCredited: true, points: parseInt(user.points) || 0 };
  }

  const currentPoints = parseInt(user.points) || 0;
  const newPoints = currentPoints + pointsToAdd;

  await User.findByIdAndUpdate(userId, {
    $set: { plan, points: newPoints },
    $push: { creditedPaymentIntents: paymentIntentId },
  });

  console.log(`✅ [${source}] User ${userId} +${pointsToAdd} points → ${newPoints} (${paymentIntentId})`);
  return { ok: true, alreadyCredited: false, points: newPoints };
}

// Webhook handler — exported separately so it can use raw body
const webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("✅ Webhook received:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, plan } = session.metadata;

    try {
      await creditPointsForPaymentIntent(userId, plan, session.payment_intent, "webhook:checkout.session.completed");
    } catch (err) {
      console.error("❌ DB update error:", err);
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const { userId, plan } = intent.metadata;

    try {
      await creditPointsForPaymentIntent(userId, plan, intent.id, "webhook:payment_intent.succeeded");
    } catch (err) {
      console.error("❌ DB update error (PaymentIntent):", err);
    }
  }

  res.json({ received: true });
};

// Create PaymentIntent for mobile (native Stripe sheet)
router.post("/create-payment-intent", auth, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    const selected = plans[plan];
    if (!selected) return res.status(400).json({ message: "Invalid plan" });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: selected.amount,
      currency: "pkr",
      metadata: { userId: userId.toString(), plan },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    console.error("PaymentIntent error:", err);
    res.status(500).json({ message: "Failed to create payment intent" });
  }
});

// NEW: Direct, webhook-independent confirmation for mobile.
// Called right after presentPaymentSheet() succeeds. Retrieves the
// PaymentIntent from Stripe (source of truth), verifies it belongs to
// this user and has actually succeeded, then credits points immediately.
// Safe to call even if the webhook also fires later — credits are
// idempotent per PaymentIntent ID.
router.post("/confirm-payment-intent", auth, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!paymentIntentId) {
      return res.status(400).json({ message: "paymentIntentId is required" });
    }

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!intent) {
      return res.status(404).json({ message: "Payment intent not found" });
    }

    if (intent.status !== "succeeded") {
      return res.status(400).json({ message: `Payment not completed (status: ${intent.status})` });
    }

    const { userId: metaUserId, plan } = intent.metadata || {};

    if (!metaUserId || metaUserId !== userId.toString()) {
      console.error(`❌ confirm-payment-intent: userId mismatch. token=${userId} metadata=${metaUserId}`);
      return res.status(403).json({ message: "This payment does not belong to the current user" });
    }

    const result = await creditPointsForPaymentIntent(metaUserId, plan, intent.id, "confirm-payment-intent");

    if (!result.ok) {
      return res.status(400).json({ message: "Failed to credit points", reason: result.reason });
    }

    res.json({
      received: true,
      alreadyCredited: result.alreadyCredited,
      points: result.points,
      plan,
    });
  } catch (err) {
    console.error("confirm-payment-intent error:", err);
    res.status(500).json({ message: "Failed to confirm payment" });
  }
});

module.exports = { router, webhook };
