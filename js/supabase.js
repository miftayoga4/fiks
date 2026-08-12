/* ====================================================================
   MY FINANCE - SUPABASE CLIENT INITIALIZATION & AUTH GUARD
   ==================================================================== */

let supabaseClient = null;

function initSupabase() {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// Global Supabase Getter
function getSupabase() {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
}

// Auth Guard - Redirect to login if user is not authenticated
async function requireAuth() {
  const isKeyAuth = localStorage.getItem("MYFINANCE_LOGGED_IN") === "true";
  
  if (isKeyAuth) {
    return {
      id: "11111111-1111-1111-1111-111111111111",
      email: "owner@myfinance.local",
      user_metadata: { full_name: "Pemilik Aplikasi" }
    };
  }

  const client = getSupabase();
  if (client) {
    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (session && session.user) {
        return session.user;
      }
    } catch (err) {
      console.error("Auth session check error:", err);
    }
  }

  // If not on login.html or index.html, redirect to login
  const isLoginPage = window.location.pathname.endsWith("login.html") || window.location.pathname.endsWith("index.html");
  if (!isLoginPage) {
    window.location.href = "login.html";
  }
  return null;
}

// Fetch Current User
async function getCurrentUser() {
  const isKeyAuth = localStorage.getItem("MYFINANCE_LOGGED_IN") === "true";
  if (isKeyAuth) {
    return {
      id: "11111111-1111-1111-1111-111111111111",
      email: "owner@myfinance.local",
      user_metadata: { full_name: "Pemilik Aplikasi" }
    };
  }

  const client = getSupabase();
  if (!client) return null;
  const { data: { user } } = await client.auth.getUser();
  return user;
}
