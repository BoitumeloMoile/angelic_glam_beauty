// ---------------------------------------------------------------------
// Renders the booking calendar, lets the client pick an open slot,
// and kicks off a Stripe Checkout session for the deposit.
// ---------------------------------------------------------------------
import { supabase } from './supabaseClient.js';

const calendarEl = document.getElementById('booking-calendar');
const summaryEl = document.getElementById('booking-summary');
const serviceSelect = document.getElementById('service-select');
const payBtn = document.getElementById('pay-deposit-btn');

let selectedSlot = null; // { dateStr, timeStr }

async function loadBookedSlots() {
  // Replace with a real query once your "appointments" table exists:
  // const { data, error } = await supabase.from('appointments').select('start_time, status');
  // Filter these out as "background" events so clients can't pick them.
  return [];
}

async function init() {
  const bookedEvents = await loadBookedSlots();

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' },
    slotMinTime: '09:00:00',
    slotMaxTime: '19:00:00',
    allDaySlot: false,
    height: 'auto',
    selectable: true,
    events: bookedEvents,
    select: (info) => {
      selectedSlot = { start: info.start };
      showSummary(info.start);
    },
  });

  calendar.render();
}

function showSummary(date) {
  document.getElementById('summary-service').textContent =
    serviceSelect.options[serviceSelect.selectedIndex].text;
  document.getElementById('summary-date').textContent = date.toLocaleDateString();
  document.getElementById('summary-time').textContent = date.toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });
  summaryEl.style.display = 'block';
}

payBtn?.addEventListener('click', async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  if (!selectedSlot) return;

  payBtn.disabled = true;
  payBtn.textContent = 'Redirecting to payment…';

  // Calls the serverless function in netlify/functions/create-checkout-session.js
  // which creates a Stripe Checkout Session and returns its URL.
  const res = await fetch('/.netlify/functions/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service: serviceSelect.value,
      startTime: selectedSlot.start.toISOString(),
      userId: session.user.id,
      userEmail: session.user.email,
    }),
  });

  const { url, error } = await res.json();

  if (error) {
    alert(error);
    payBtn.disabled = false;
    payBtn.textContent = 'Pay deposit & confirm';
    return;
  }

  window.location.href = url; // Stripe-hosted checkout page
});

init();
