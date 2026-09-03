// ---------------------------------------------------------------------
// Runs on Netlify's servers (not the client), so your Stripe secret key
// stays private. Creates a Checkout Session for the fixed deposit and
// writes a "pending" appointment row before redirecting to Stripe.
// ---------------------------------------------------------------------
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role, NOT the anon key — server-only
);

const DEPOSIT_AMOUNT_CENTS = 2000; // $20.00

exports.handler = async (event) => {
  try {
    const { service, startTime, userId, userEmail } = JSON.parse(event.body);

    if (!service || !startTime || !userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing booking details.' }) };
    }

    // 1. Create a pending appointment row so the slot is provisionally held.
    const { data: appointment, error: dbError } = await supabase
      .from('appointments')
      .insert({
        user_id: userId,
        service,
        start_time: startTime,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      return { statusCode: 500, body: JSON.stringify({ error: dbError.message }) };
    }

    // 2. Create the Stripe Checkout Session for the deposit.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: DEPOSIT_AMOUNT_CENTS,
            product_data: {
              name: 'Booking deposit (non-refundable)',
              description: `Deposit for ${service} on ${new Date(startTime).toLocaleString()}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { appointment_id: appointment.id },
      success_url: `${process.env.SITE_URL}/appointments.html?booked=1`,
      cancel_url: `${process.env.SITE_URL}/appointments.html?cancelled=1`,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
