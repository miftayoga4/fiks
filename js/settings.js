/* ====================================================================
   MY FINANCE - SETTINGS & PREFERENCES
   ==================================================================== */

// Save Supabase credentials to localStorage
function saveSupabaseCredentials(url, anonKey) {
  if (!url || !anonKey) {
    showToast("URL dan Anon Key harus diisi!", "warning");
    return;
  }
  localStorage.setItem("MYFINANCE_SUPABASE_URL", url.trim());
  localStorage.setItem("MYFINANCE_SUPABASE_ANON_KEY", anonKey.trim());
  showToast("Kredensial Supabase berhasil disimpan! Memuat ulang...", "success");
  setTimeout(() => window.location.reload(), 1000);
}

// Toggle Theme (Light, Dark, System)
function setThemePreference(theme) {
  localStorage.setItem("MYFINANCE_THEME", theme);
  initTheme();
  showToast(`Tema diubah ke ${theme.toUpperCase()}`, "info");
}
