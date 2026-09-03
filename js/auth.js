// ---------------------------------------------------------------------
// Handles the Login and Register forms using Supabase Auth.
// ---------------------------------------------------------------------
import { supabase } from './supabaseClient.js';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    errorEl.style.display = 'none';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      errorEl.textContent = 'Enter your email and password.';
      errorEl.style.display = 'block';
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      errorEl.textContent = error.message;
      errorEl.style.display = 'block';
      return;
    }

    window.location.href = 'appointments.html';
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('register-error');
    errorEl.style.display = 'none';

    const fullName = document.getElementById('full-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;

    if (!fullName || !email || !phone || password.length < 8) {
      errorEl.textContent = 'Fill in every field. Password must be at least 8 characters.';
      errorEl.style.display = 'block';
      return;
    }

    // Creates the auth user. The full name/phone get saved into a
    // "profiles" table via a Supabase trigger, or you can insert them
    // here manually after signUp succeeds — see the README for the SQL.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });

    if (error) {
      errorEl.textContent = error.message;
      errorEl.style.display = 'block';
      return;
    }

    window.location.href = 'appointments.html';
  });
}
