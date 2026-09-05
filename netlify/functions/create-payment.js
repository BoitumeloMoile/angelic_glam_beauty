// ---------------------------------------------------------------------
// Runs on Netlify's servers (not the client), so your Merchant Key and
// Passphrase stay private. Holds the slot with a "pending" appointment
// row, then builds the signed PayFast payment fields for the browser
// to submit as a form POST to PayFast's hosted payment page.
//
// PayFast doesn't have a "Checkout Session" API like Stripe — instead
// you build a set of fields yourself, sign them, and redirect the client
// there via a real HTML form submission (see js/booking.js).
// ---------------------------------------------------------------------
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role, server-only — never expose this in frontend code
);

const DEPOSIT_AMOUNT = '200.00'; // R200 non-refundable deposit. PayFast wants a string like "200.00".

const PAYFAST_PROCESS_URL = process.env.PAYFAST_MODE === 'live'
  ? 'https://www.payfast.co.za/eng/process'
  : 'https://sandbox.payfast.co.za/eng/process';

// PayFast's signature spec is built around PHP's urlencode(): spaces become
// "+", and a few characters JS's encodeURIComponent leaves alone need
// escaping too. This mirrors that behaviour.
function pfEncode(value) {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

// IMPORTANT: PayFast recalculates the signature over these exact key/value
// pairs in this exact order, so the form built in booking.js must submit
// them in the same order. Double check this field list against PayFast's
// current docs (developers.payfast.co.za) before going live — payment
// gateway specs occasionally add or reorder fields.
function buildSignature(fields, passphrase) {
  const paramString = Object.entries(fields)
    .map(([key, value]) => `${key}=${pfEncode(String(value))}`)
    .join('&');
  const withPassphrase = passphrase
    ? `${paramString}&passphrase=${pfEncode(passphrase)}`
    : paramString;
  return crypto.createHash('md5').update(withPassphrase).digest('hex');
}

exports.handler = async (event) => {
  try {
    const { service, startTime, userId, userEmail, userName } = JSON.parse(event.body);

    if (!service || !startTime || !userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing booking details.' }) };
    }

    // 1. Hold the slot with a pending appointment row.
    const { data: appointment, error: dbError } = await supabase
      .from('appointments')
      .insert({ user_id: userId, service, start_time: startTime, status: 'pending' })
      .select()
      .single();

    if (dbError) {
      return { statusCode: 500, body: JSON.stringify({ error: dbError.message }) };
    }

    const [firstName, ...rest] = (userName || userEmail || 'Client').split(' ');

    const fields = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: `${process.env.SITE_URL}/appointments.html?booked=1`,
      cancel_url: `${process.env.SITE_URL}/appointments.html?cancelled=1`,
      notify_url: `${process.env.SITE_URL}/.netlify/functions/payfast-itn`,
      name_first: firstName,
      name_last: rest.join(' ') || '-',
      email_address: userEmail,
      m_payment_id: appointment.id,
      amount: DEPOSIT_AMOUNT,
      item_name: 'Booking deposit (non-refundable)',
      item_description: `Deposit for ${service} on ${new Date(startTime).toLocaleString()}`,
      custom_str1: appointment.id, // carried through so the ITN handler knows which row to confirm
    };

    const signature = buildSignature(fields, process.env.PAYFAST_PASSPHRASE);

    // Sent back to the browser, which builds a real <form> and submits it —
    // see payBtn's click handler in js/booking.js.
    return {
      statusCode: 200,
      body: JSON.stringify({ processUrl: PAYFAST_PROCESS_URL, fields: { ...fields, signature } }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
