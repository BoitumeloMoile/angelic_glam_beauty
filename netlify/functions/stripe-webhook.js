// ---------------------------------------------------------------------
// Stripe calls this URL directly when a payment succeeds. It verifies
// the event really came from Stripe, then flips the appointment from
// "pending" to "confirmed". Register this URL in your Stripe dashboard:
//   https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook
// ---------------------------------------------------------------------
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  const signature = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook signature verification failed: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const appointmentId = session.metadata.appointment_id;

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'confirmed', deposit_paid: true })
      .eq('id', appointmentId);

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
