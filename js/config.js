/* ====================================================================
   MY FINANCE - SUPABASE CONFIGURATION & KEY AUTH
   ==================================================================== */

// Default Supabase project configuration
const DEFAULT_SUPABASE_URL = "https://lbehiuislxixevvwjrrn.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_0GTng3UTlIMKUCoPaWN7TA_WgA5cG2O";
const DEFAULT_SUPABASE_SECRET_KEY = "";

// Default Key / PIN for personal login
const DEFAULT_ACCESS_KEY = "12345";

// Retrieve configuration from localStorage if customized
window.SUPABASE_URL = localStorage.getItem("MYFINANCE_SUPABASE_URL") || DEFAULT_SUPABASE_URL;
window.SUPABASE_ANON_KEY = localStorage.getItem("MYFINANCE_SUPABASE_ANON_KEY") || DEFAULT_SUPABASE_ANON_KEY;
window.ACCESS_KEY = localStorage.getItem("MYFINANCE_USER_KEY") || DEFAULT_ACCESS_KEY;

