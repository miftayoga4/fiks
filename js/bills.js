/* ====================================================================
   MY FINANCE - RECURRING BILLS
   ==================================================================== */

// Fetch Active Recurring Bills
async function fetchRecurringBills(userId) {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from("recurring_bills")
    .select(`
      *,
      category:categories(name),
      account:accounts(name)
    `)
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("next_due_date", { ascending: true });

  if (error) {
    console.error("Error fetching bills:", error);
    return [];
  }

  return data || [];
}

// Add Recurring Bill
async function createRecurringBill(userId, name, amount, categoryId, accountId, frequency, dueDay, notes) {
  const client = getSupabase();
  if (!client) return { success: false };

  // Calculate initial next due date
  const today = new Date();
  let nextDate = new Date(today.getFullYear(), today.getMonth(), dueDay || 1);
  if (nextDate < today) {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }

  const { error } = await client
    .from("recurring_bills")
    .insert([{
      user_id: userId,
      name,
      amount: Number(amount),
      category_id: categoryId || null,
      account_id: accountId || null,
      frequency: frequency || "monthly",
      due_day: Number(dueDay) || 1,
      next_due_date: nextDate.toISOString().split("T")[0],
      is_active: true,
      notes
    }]);

  if (error) {
    showToast("Gagal menambah tagihan: " + error.message, "error");
    return { success: false };
  }

  showToast("Tagihan rutin berhasil ditambahkan!", "success");
  return { success: true };
}

// Mark Bill as Paid -> Creates Expense Transaction & Updates Next Due Date
async function markBillAsPaid(userId, billId, accountId) {
  const client = getSupabase();
  if (!client) return { success: false };

  const { data: bill } = await client
    .from("recurring_bills")
    .select("*")
    .eq("id", billId)
    .single();

  if (!bill) return { success: false };

  const chosenAccount = accountId || bill.account_id;

  // 1. Create expense transaction
  await saveTransaction(userId, {
    type: "expense",
    amount: bill.amount,
    description: "Bayar Tagihan: " + bill.name,
    category_id: bill.category_id,
    account_id: chosenAccount,
    transaction_date: new Date().toISOString().split("T")[0]
  });

  // 2. Compute next due date based on frequency
  let currentDue = new Date(bill.next_due_date || new Date());
  if (bill.frequency === "monthly") {
    currentDue.setMonth(currentDue.getMonth() + 1);
  } else if (bill.frequency === "weekly") {
    currentDue.setDate(currentDue.getDate() + 7);
  } else if (bill.frequency === "yearly") {
    currentDue.setFullYear(currentDue.getFullYear() + 1);
  }

  // 3. Update bill next_due_date
  await client
    .from("recurring_bills")
    .update({ next_due_date: currentDue.toISOString().split("T")[0] })
    .eq("id", billId);

  showToast(`Tagihan "${bill.name}" berhasil dibayar!`, "success");
  return { success: true };
}
