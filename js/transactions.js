/* ====================================================================
   MY FINANCE - TRANSACTIONS ENGINE & SIMULATOR
   ==================================================================== */

// Create Transaction (Income / Expense / Transfer)
async function saveTransaction(userId, txData) {
  const client = getSupabase();
  if (!client) return { success: false };

  // Validation
  if (!txData.amount || Number(txData.amount) <= 0) {
    showToast("Nominal transaksi harus lebih besar dari Rp0", "warning");
    return { success: false };
  }

  if (txData.type === "transfer" && txData.account_id === txData.destination_account_id) {
    showToast("Akun asal dan akun tujuan transfer tidak boleh sama", "warning");
    return { success: false };
  }

  const payload = {
    user_id: userId,
    type: txData.type,
    amount: Number(txData.amount),
    description: txData.description || "",
    category_id: txData.category_id || null,
    subcategory_id: txData.subcategory_id || null,
    account_id: txData.account_id || null,
    destination_account_id: txData.destination_account_id || null,
    income_source: txData.income_source || null,
    payment_method: txData.payment_method || null,
    transaction_date: txData.transaction_date || new Date().toISOString().split("T")[0],
    transaction_time: txData.transaction_time || new Date().toTimeString().split(" ")[0],
    location: txData.location || null,
    notes: txData.notes || null,
    receipt_url: txData.receipt_url || null
  };

  const { data, error } = await client
    .from("transactions")
    .insert([payload])
    .select()
    .single();

  if (error) {
    showToast("Gagal menyimpan transaksi: " + error.message, "error");
    return { success: false, error };
  }

  showToast("Transaksi berhasil disimpan!", "success");
  return { success: true, transaction: data };
}

// Fetch Transactions with optional filters
async function fetchTransactions(userId, filters = {}) {
  const client = getSupabase();
  if (!client) return [];

  let query = client
    .from("transactions")
    .select(`
      *,
      category:categories!transactions_category_id_fkey(name, icon),
      account:accounts!transactions_account_id_fkey(name),
      destination_account:accounts!transactions_destination_account_id_fkey(name)
    `)
    .eq("user_id", userId);

  if (filters.includeDeleted) {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
  }

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  if (filters.startDate) {
    query = query.gte("transaction_date", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("transaction_date", filters.endDate);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters.accountId) {
    query = query.eq("account_id", filters.accountId);
  }

  query = query.order("transaction_date", { ascending: false }).order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }

  // Client-side search if text search provided
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    return (data || []).filter(t => 
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.notes && t.notes.toLowerCase().includes(q)) ||
      (t.income_source && t.income_source.toLowerCase().includes(q)) ||
      (t.category && t.category.name.toLowerCase().includes(q))
    );
  }

  return data || [];
}

// Soft Delete Transaction
async function deleteTransaction(userId, transactionId) {
  const client = getSupabase();
  if (!client) return { success: false };

  const { error } = await client
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", transactionId)
    .eq("user_id", userId);

  if (error) {
    showToast("Gagal menghapus transaksi", "error");
    return { success: false };
  }

  showToast("Transaksi berhasil dipindahkan ke Recently Deleted", "info");
  return { success: true };
}

// Restore Soft Deleted Transaction
async function restoreTransaction(userId, transactionId) {
  const client = getSupabase();
  if (!client) return { success: false };

  const { error } = await client
    .from("transactions")
    .update({ deleted_at: null })
    .eq("id", transactionId)
    .eq("user_id", userId);

  if (error) {
    showToast("Gagal memulihkan transaksi", "error");
    return { success: false };
  }

  showToast("Transaksi berhasil dipulihkan!", "success");
  return { success: true };
}

// Transaction Simulator Logic
function simulateTransactionEffect(currentOperationalBalance, expenseAmount, currentCategorySpent, categoryBudgetAmount) {
  const amount = Number(expenseAmount) || 0;
  const balanceBefore = Number(currentOperationalBalance) || 0;
  const balanceAfter = balanceBefore - amount;

  let budgetStatus = "aman";
  let budgetMsg = "Budget kategori masih sangat aman.";

  if (categoryBudgetAmount && categoryBudgetAmount > 0) {
    const newSpent = Number(currentCategorySpent || 0) + amount;
    const percentage = (newSpent / categoryBudgetAmount) * 100;

    if (percentage > 100) {
      budgetStatus = "exceeded";
      budgetMsg = `🔴 Transaksi ini akan melebihi budget (${percentage.toFixed(0)}%)!`;
    } else if (percentage >= 80) {
      budgetStatus = "warning";
      budgetMsg = `⚠️ Transaksi ini mendekati batas budget (${percentage.toFixed(0)}%).`;
    }
  }

  return {
    balanceBefore,
    balanceAfter,
    budgetStatus,
    budgetMsg
  };
}
