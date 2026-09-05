// ---------------------------------------------------------------------
// PayFast calls this URL directly after a payment completes (or fails).
// This is PayFast's equivalent of a Stripe webhook, called an ITN
// (Instant Transaction Notification). It arrives as a normal form POST,
// not JSON. We recompute the signature to make sure it really came from
// PayFast, then flip the appointment from "pending" to "confirmed".
//
// Production hardening (not included below, worth adding before going
// live): PayFast also recommends (1) confirming the request came from
// PayFast's IP ranges, and (2) doing a server-to-server "validate" call
// back to PayFast before trusting the ITN. See developers.payfast.co.za.
// ---------------------------------------------------------------------
const crypto = require('crypto');
const querystring = require('querystring');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function pfEncode(value) {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

// Rebuilds the same signature PayFast generated, from the fields it sent
// back, so we can confirm nothing was tampered with in transit.
function verifySignature(fields, passphrase) {
  const { signature, ...rest } = fields;
  const paramString = Object.entries(rest)
    .map(([key, value]) => `${key}=${pfEncode(String(value))}`)
    .join('&');
  const withPassphrase = passphrase
    ? `${paramString}&passphrase=${pfEncode(passphrase)}`
    : paramString;
  const expected = crypto.createHash('md5').update(withPassphrase).digest('hex');
  return expected === signature;
}

exports.handler = async (event) => {
  const fields = querystring.parse(event.body);

  const isValid = verifySignature(fields, process.env.PAYFAST_PASSPHRASE);
  if (!isValid) {
    return { statusCode: 400, body: 'Invalid signature' };
  }

  // PayFast sends several statuses (COMPLETE, FAILED, PENDING) — only
  // confirm the booking on a genuine completed payment.
  if (fields.payment_status === 'COMPLETE') {
    const appointmentId = fields.m_payment_id || fields.custom_str1;

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'confirmed', deposit_paid: true })
      .eq('id', appointmentId);

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }

  // PayFast just needs a 200 response to know the ITN was received.
  return { statusCode: 200, body: 'OK' };
};
