/* ====================================================================
   MY FINANCE - CATEGORIES & SUBCATEGORIES MANAGEMENT
   ==================================================================== */

const DEFAULT_CATEGORIES = [
  { id: "cat-makanan", name: "🍔 Makanan & Minuman", type: "expense", is_active: true },
  { id: "cat-transportasi", name: "🚗 Transportasi", type: "expense", is_active: true },
  { id: "cat-kebutuhan", name: "🛒 Kebutuhan Harian", type: "expense", is_active: true },
  { id: "cat-tagihan", name: "💡 Tagihan & Utilitas", type: "expense", is_active: true },
  { id: "cat-hiburan", name: "🛍️ Hiburan & Belanja", type: "expense", is_active: true },
  { id: "cat-lainnya-exp", name: "📦 Lain-lain", type: "expense", is_active: true },
  
  { id: "cat-gaji", name: "💰 Gaji / Uang Saku", type: "income", is_active: true },
  { id: "cat-bonus", name: "🎁 Bonus & Hadiah", type: "income", is_active: true },
  { id: "cat-usaha", name: "💼 Hasil Usaha", type: "income", is_active: true },
  { id: "cat-lainnya-inc", name: "💸 Pemasukan Lainnya", type: "income", is_active: true }
];

async function fetchCategories(userId, type = null) {
  const client = getSupabase();
  let result = [];

  if (client) {
    try {
      let query = client
        .from("categories")
        .select("*")
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .eq("is_active", true);

      if (type) query = query.eq("type", type);
      query = query.order("name", { ascending: true });

      const { data } = await query;
      if (data && data.length > 0) result = data;
    } catch (err) {
      console.warn("Using default category fallbacks:", err);
    }
  }

  if (!result || result.length === 0) {
    result = DEFAULT_CATEGORIES;
    if (type) result = result.filter(c => c.type === type);
  }

  return result;
}