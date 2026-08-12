/* ====================================================================
   MY FINANCE - DEBTS (HUTANG) & RECEIVABLES (PIUTANG)
   ==================================================================== */

// Fetch Debts & Receivables
async function fetchDebtsAndReceivables(userId) {
  const client = getSupabase();
  if (!client) return { debts: [], receivables: [] };

  const { data: debts } = await client
    .from("debts")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { ascending: true });

  const { data: receivables } = await client
    .from("receivables")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { ascending: true });

  return {
    debts: debts || [],
    receivables: receivables || []
  };
}

// Create Debt / Receivable
async function createDebtOrReceivable(userId, isDebt, personName, amount, dueDate, notes) {
  const client = getSupabase();
  if (!client) return { success: false };

  const table = isDebt ? "debts" : "receivables";
  const { error } = await client
    .from(table)
    .insert([{
      user_id: userId,
      person_name: personName,
      amount: Number(amount),
      due_date: dueDate || null,
      notes: notes || null,
      status: "unpaid"
    }]);

  if (error) {
    showToast("Gagal menyimpan catatan", "error");
    return { success: false };
  }

  showToast((isDebt ? "Hutang" : "Piutang") + " berhasil dicatat!", "success");
  return { success: true };
}

// Pay Debt or Receive Receivable
async function recordDebtPayment(userId, id, isDebt, paymentAmount, accountId) {
  const client = getSupabase();
  if (!client) return { success: false };

  const table = isDebt ? "debts" : "receivables";
  const { data: item } = await client.from(table).select("*").eq("id", id).single();
  if (!item) return { success: false };

  const payAmt = Number(paymentAmount);
  const currentPaid = isDebt ? Number(item.paid_amount || 0) : Number(item.received_amount || 0);
  const newPaid = currentPaid + payAmt;
  const newStatus = newPaid >= Number(item.amount) ? "paid" : "partial";

  const updatePayload = isDebt ? { paid_amount: newPaid, status: newStatus } : { received_amount: newPaid, status: newStatus };

  await client.from(table).update(updatePayload).eq("id", id);

  // Convert to financial transaction if account specified
  if (accountId) {
    await saveTransaction(userId, {
      type: isDebt ? "expense" : "income",
      amount: payAmt,
      description: (isDebt ? "Bayar Hutang: " : "Terima Piutang: ") + item.person_name,
      account_id: accountId,
      income_source: isDebt ? null : "Piutang",
      transaction_date: new Date().toISOString().split("T")[0]
    });
  }

  showToast("Pembayaran berhasil dicatat!", "success");
  return { success: true };
}
