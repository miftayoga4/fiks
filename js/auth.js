/* ====================================================================
   MY FINANCE - AUTHENTICATION & PROFILE
   ==================================================================== */

// Login with Key / PIN
async function loginWithKey(enteredKey) {
  const validKey = window.ACCESS_KEY || DEFAULT_ACCESS_KEY || "12345";
  
  if (!enteredKey || String(enteredKey).trim() !== String(validKey).trim()) {
    showToast("Key / PIN salah. Coba lagi (default: 12345)", "error");
    return { success: false };
  }

  localStorage.setItem("MYFINANCE_LOGGED_IN", "true");
  showToast("Akses diberikan! Mengalihkan...", "success");
  setTimeout(() => { window.location.href = "dashboard.html"; }, 600);
  return { success: true };
}

// Change Access Key
function changeAccessKey(newKey) {
  if (!newKey || newKey.trim().length < 3) {
    showToast("Key baru minimal 3 karakter", "warning");
    return false;
  }
  localStorage.setItem("MYFINANCE_USER_KEY", newKey.trim());
  window.ACCESS_KEY = newKey.trim();
  showToast("Key akses berhasil diubah!", "success");
  return true;
}

// Login User (Fallback Supabase Email/Password)
async function loginUser(email, password) {
  const client = getSupabase();
  if (!client) {
    showToast("Supabase client belum terkonfigurasi", "error");
    return { success: false };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      showToast(error.message, "error");
      return { success: false, error };
    }
    localStorage.setItem("MYFINANCE_LOGGED_IN", "true");
    showToast("Login berhasil! Mengalihkan...", "success");
    setTimeout(() => { window.location.href = "dashboard.html"; }, 800);
    return { success: true, user: data.user };
  } catch (err) {
    showToast("Gagal melakukan login. Periksa koneksi internet.", "error");
    return { success: false, error: err };
  }
}

// Register User
async function registerUser(email, password, fullName) {
  const client = getSupabase();
  if (!client) {
    showToast("Supabase client belum terkonfigurasi", "error");
    return { success: false };
  }

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (error) {
      showToast(error.message, "error");
      return { success: false, error };
    }

    showToast("Registrasi berhasil! Silakan login.", "success");
    return { success: true, user: data.user };
  } catch (err) {
    showToast("Gagal mendaftar. Silakan coba lagi.", "error");
    return { success: false, error: err };
  }
}

// Logout User
async function logoutUser() {
  localStorage.removeItem("MYFINANCE_LOGGED_IN");
  const client = getSupabase();
  if (client) {
    await client.auth.signOut().catch(() => {});
  }
  showToast("Berhasil keluar.", "info");
  setTimeout(() => { window.location.href = "login.html"; }, 500);
}

