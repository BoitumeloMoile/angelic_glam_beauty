// ---------------------------------------------------------------------
// Renders the booking calendar, lets the client pick an open slot,
// and kicks off a PayFast payment for the deposit.
// ---------------------------------------------------------------------
import { supabase } from './supabaseClient.js';

const calendarEl = document.getElementById('booking-calendar');
const summaryEl = document.getElementById('booking-summary');
const serviceSelect = document.getElementById('service-select');
const payBtn = document.getElementById('pay-deposit-btn');
const inspoInput = document.getElementById('inspo-photos');
const inspoPreview = document.getElementById('inspo-preview');
const inspoError = document.getElementById('inspo-error');

let selectedSlot = null; // { dateStr, timeStr }
let inspoFiles = [];

// Limits to 2 photos, shows small thumbnails, and blocks submission with a
// clear message if someone selects more than 2.
inspoInput?.addEventListener('change', () => {
  const chosen = Array.from(inspoInput.files);

  if (chosen.length > 2) {
    inspoError.style.display = 'block';
    inspoInput.value = '';
    inspoFiles = [];
    inspoPreview.innerHTML = '';
    return;
  }

  inspoError.style.display = 'none';
  inspoFiles = chosen;
  inspoPreview.innerHTML = '';
  inspoFiles.forEach((file) => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    inspoPreview.appendChild(img);
  });
});

// Uploads the chosen inspo photos to Supabase Storage and returns their
// public URLs. Requires a public "inspo-photos" bucket — see the README.
async function uploadInspoPhotos(userId) {
  const urls = [];
  for (const file of inspoFiles) {
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('inspo-photos')
      .upload(path, file);

    if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

    const { data } = supabase.storage.from('inspo-photos').getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

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
  payBtn.textContent = 'Uploading photos…';

  let inspoPhotoUrls = [];
  try {
    inspoPhotoUrls = await uploadInspoPhotos(session.user.id);
  } catch (err) {
    alert(err.message);
    payBtn.disabled = false;
    payBtn.textContent = 'Pay deposit & confirm';
    return;
  }

  payBtn.textContent = 'Redirecting to payment…';

  // Calls the serverless function in netlify/functions/create-payment.js,
  // which holds the slot and returns a signed set of PayFast fields —
  // PayFast needs a real form POST, not a simple redirect URL.
  const res = await fetch('/.netlify/functions/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service: serviceSelect.value,
      startTime: selectedSlot.start.toISOString(),
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.user_metadata?.full_name,
      inspoPhotoUrls,
    }),
  });

  const { processUrl, fields, error } = await res.json();

  if (error) {
    alert(error);
    payBtn.disabled = false;
    payBtn.textContent = 'Pay deposit & confirm';
    return;
  }

  // Build a hidden form and submit it — this is how PayFast expects to
  // receive the signed payment fields (a JSON redirect won't work here).
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = processUrl;

  for (const [key, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
});

init();
