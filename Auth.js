/* ============================================================
   auth.js — session helpers used across every protected page
   ============================================================ */

/* Configuration banner if Supabase isn't set up yet */
function showConfigBanner() {
  if (window.SUPABASE_CONFIGURED) return;
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    background: #BA7517; color: #fff; padding: 10px 16px;
    font-family: Inter, sans-serif; font-size: 13px; text-align: center;
  `;
  banner.innerHTML = '⚠️ Supabase not configured. Edit <code style="background:rgba(0,0,0,0.2);padding:2px 6px;border-radius:4px;">supabase-client.js</code> and add your project URL + anon key. See README.';
  document.body.appendChild(banner);
}

/* Cache of org_id for current user, refreshed on each page */
window._currentOrg = null;
window._currentUser = null;

/* Sign up a new user. Optionally create a new org or join one. */
async function signUp({ email, password, displayName, orgName, ageGroup, inviteCode }) {
  const supa = await window.sb();
  const { data, error } = await supa.auth.signUp({ email, password });
  if (error) throw error;
  // Auto-signin (Supabase usually does this if email confirmation is off)
  if (!data.session) {
    const { error: signinErr } = await supa.auth.signInWithPassword({ email, password });
    if (signinErr) throw new Error('Signed up but could not sign in. Check email confirmation settings in Supabase.');
  }
  // Create or join org
  let orgId;
  if (inviteCode) {
    const { data: joined, error: joinErr } = await supa.rpc('join_organisation_by_code', { code: inviteCode.trim() });
    if (joinErr) throw joinErr;
    orgId = joined;
  } else {
    if (!orgName) throw new Error('Programme name required');
    const { data: newOrg, error: createErr } = await supa.rpc('create_organisation_with_admin', {
      org_name: orgName,
      age_group: ageGroup || 'O45'
    });
    if (createErr) throw createErr;
    orgId = newOrg;
  }
  // Update display name on membership if provided
  if (displayName) {
    await supa.from('memberships').update({ display_name: displayName }).eq('user_id', data.user.id).eq('org_id', orgId);
  }
  return { user: data.user, orgId };
}

/* Sign in existing user */
async function signIn({ email, password }) {
  const supa = await window.sb();
  const { data, error } = await supa.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

/* Sign out */
async function signOut() {
  const supa = await window.sb();
  await supa.auth.signOut();
  window._currentOrg = null;
  window._currentUser = null;
  window.location.href = 'login.html';
}

/* Get current user, or null */
async function getUser() {
  const supa = await window.sb();
  const { data } = await supa.auth.getUser();
  window._currentUser = data.user || null;
  return window._currentUser;
}

/* Get the first org_id this user belongs to (we don't support multi-org switching yet) */
async function getCurrentOrgId() {
  if (window._currentOrg) return window._currentOrg;
  const supa = await window.sb();
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await supa.from('memberships').select('org_id').eq('user_id', user.id).limit(1);
  if (error || !data || data.length === 0) return null;
  window._currentOrg = data[0].org_id;
  return window._currentOrg;
}

/* Full org details */
async function getCurrentOrg() {
  const supa = await window.sb();
  const orgId = await getCurrentOrgId();
  if (!orgId) return null;
  const { data, error } = await supa.from('organisations').select('*').eq('id', orgId).single();
  if (error) return null;
  return data;
}

/* requireAuth — call at top of every protected page.
   Redirects to login.html if no session, returns { user, orgId } when good. */
async function requireAuth() {
  showConfigBanner();
  if (!window.SUPABASE_CONFIGURED) {
    return { user: null, orgId: null, demo: true };
  }
  const user = await getUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    // user authed but no org — send back to login to complete signup
    window.location.href = 'login.html?msg=no-org';
    return null;
  }
  return { user, orgId };
}

/* Run code only when DOM is ready and Supabase config is real */
window.auth = { signUp, signIn, signOut, getUser, getCurrentOrgId, getCurrentOrg, requireAuth };
