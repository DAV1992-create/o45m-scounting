/* ============================================================
   Supabase client — shared across all pages
   ============================================================
   Paste your project URL and anon key below.
   Find them at: Supabase → Project Settings → API
   The anon key is safe to commit publicly; RLS protects your data.
   ============================================================ */

const SUPABASE_URL      = 'https://yunzbxjgndfdngneydhf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_a0WnjBJyvWkqNFALG7ZhGA_mMUVzD1C';

// Load supabase-js v2 from CDN if not already loaded
(function loadSupabase() {
  if (window.supabase) return;
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  s.async = false;
  document.head.appendChild(s);
})();

// Create the client once the lib is on window
function _getClient() {
  if (!window.supabase) throw new Error('Supabase JS not yet loaded');
  if (!window._supa) {
    window._supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  }
  return window._supa;
}

// Wait for the CDN script to finish loading
async function _ready() {
  if (window.supabase) return;
  await new Promise((resolve) => {
    const t = setInterval(() => {
      if (window.supabase) { clearInterval(t); resolve(); }
    }, 30);
    setTimeout(() => { clearInterval(t); resolve(); }, 5000);
  });
}

window.sb = async function sb() {
  await _ready();
  return _getClient();
};

// Quick boolean: was the config still placeholder?
window.SUPABASE_CONFIGURED =
  !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR-ANON-KEY');
