/* ==========================================================================
   THEBETTERSELF members app — configuration
   Fill in SUPABASE_URL and SUPABASE_ANON_KEY (Project Settings → API in the
   Supabase dashboard). While they are empty, the app runs in DEMO MODE with
   example data stored only in this browser.
   ========================================================================== */
window.TBS_CONFIG = {
  SUPABASE_URL: 'https://yieancdskfefxorzndzx.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_ZWDQrloAeiv02cvCRmIxZA_QZBDHZua',

  // Set to true after enabling the Google provider in Supabase (Authentication → Providers → Google).
  GOOGLE_LOGIN: false,

  // Emails that get the admin role automatically (also enforced in supabase/schema.sql).
  ADMIN_EMAILS: ['tiagosampaiocontact@gmail.com'],

  // Demo accounts (demo mode only; nothing leaves the browser).
  DEMO_ACCOUNTS: [
    { email: 'tiagosampaiocontact@gmail.com', password: 'tbs-demo', full_name: 'Tiago Sampaio', role: 'admin', program: 'PRIME' },
    { email: 'juan@thebetterself.com', password: 'tbs-demo', full_name: 'Juan', role: 'admin', program: 'PRIME' },
    { email: 'member@example.com', password: 'tbs-demo', full_name: 'Demo Member', role: 'member', program: 'EVOLVE' }
  ],

  BRAND: 'THEBETTERSELF'
};
