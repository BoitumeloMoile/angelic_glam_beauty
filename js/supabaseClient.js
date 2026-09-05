// ---------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------
// 1. Create a free project at https://supabase.com
// 2. Go to Project Settings -> API and copy your Project URL and anon key
// 3. Paste them below. The anon key is safe to expose in frontend code —
//    it only has the permissions you grant via Row Level Security rules.
// ---------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://ynbqqfntsbmlftzvjwax.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYnFxZm50c2JtbGZ0enZqd2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0Njc2ODEsImV4cCI6MjEwNDA0MzY4MX0.ViQrZ2a20UOFcI6sbTwV6Cc82BEdOHsodrpDKNellWU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
