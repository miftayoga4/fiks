/* ====================================================================
   MY FINANCE - BUDGET MANAGEMENT & ALERTS
   ==================================================================== */

// Fetch Budgets with Actual Spent amounts for a given month/year
async function fetchBudgetsWithSpent(userId, month, year) {
  const client = getSupabase();
  if (!client) return [];

  // Fetch defined budgets
  const { data: budgets, error: budgetError } = await client
    .from("budgets")
    .select(`
      *,
      category:categories(name, icon)
    `)
    .eq("user_id", userId)
    .eq("month", month)
    .eq("year", year);

  if (budgetError) {
    console.error("Error fetching budgets:", budgetError);
    return [];
  }

  // Calculate start & end date for the month
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Fetch active expense transactions for the month
  const { data: txs } = await client
    .from("transactions")
    .select("category_id, amount")
    .eq("user_id", userId)
    .eq("type", "expense")
    .is("deleted_at", null)
    .gte("transaction_date", startDate)
    .lte("transaction_date", endDate);

  const spentMap = {};
  (txs || []).forEach(t => {
    if (t.category_id) {
      spentMap[t.category_id] = (spentMap[t.category_id] || 0) + Number(t.amount);
    }
  });

  return (budgets || []).map(b => {
    const actualSpent = spentMap[b.category_id] || 0;
    const percentage = b.amount > 0 ? (actualSpent / b.amount) * 100 : 0;
    
    let alertStatus = "normal";
    if (percentage >= 100) {
      alertStatus = "exceeded";
    } else if (percentage >= (b.warning_percentage || 80)) {
      alertStatus = "warning";
    }

    return {
      ...b,
      actual_spent: actualSpent,
      percentage: Math.min(percentage, 100),
      raw_percentage: percentage,
      alert_status: alertStatus
    };
  });
}

// Set or Update Category Budget
async function saveBudget(userId, categoryId, amount, month, year, warningPercentage = 80) {
  const client = getSupabase();
  if (!client) return { success: false };

  const payload = {
    user_id: userId,
    category_id: categoryId,
    amount: Number(amount),
    warning_percentage: Number(warningPercentage),
    month: Number(month),
    year: Number(year)
  };

  const { error } = await client
    .from("budgets")
    .upsert([payload], { onConflict: "user_id, category_id, month, year" });

  if (error) {
    showToast("Gagal menyimpan budget: " + error.message, "error");
    return { success: false };
  }

  showToast("Budget berhasil diperbarui!", "success");
  return { success: true };
}
