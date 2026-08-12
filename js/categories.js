/* ====================================================================
   MY FINANCE - CATEGORIES & SUBCATEGORIES MANAGEMENT
   ==================================================================== */

// Fetch Active Categories
async function fetchCategories(userId, type = null) {
  const client = getSupabase();
  if (!client) return [];

  let query = client
    .from("categories")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .eq("is_active", true);

  if (type) {
    query = query.eq("type", type);
  }

  query = query.order("name", { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  return data || [];
}

// Add Custom Category
async function createCategory(userId, name, type, parentId = null, icon = "tag") {
  const client = getSupabase();
  if (!client) return { success: false };

  const { data, error } = await client
    .from("categories")
    .insert([{
      user_id: userId,
      name,
      type,
      parent_id: parentId || null,
      icon,
      is_active: true
    }])
    .select()
    .single();

  if (error) {
    showToast("Gagal menambah kategori", "error");
    return { success: false };
  }

  showToast("Kategori berhasil ditambahkan!", "success");
  return { success: true, category: data };
}
