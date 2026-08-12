/* ====================================================================
   MY FINANCE - TRANSACTIONS ENGINE & SIMULATOR
   ==================================================================== */

async function saveTransaction(userId, txData) {
  const amount = Number(txData.amount) || 0;

  if (amount <= 0) {
    showToast("Nominal transaksi harus lebih besar dari Rp0", "warning");
    return { success: false };
  }

  const defaultAccount = "default-cash";
  const defaultCategory = txData.type === "income" ? "cat-lainnya-inc" : "cat-lainnya-exp";
  const defaultDesc = txData.description && txData.description.trim() !== "" 
    ? txData.description 
    : (txData.type === "income" ? "Pemasukan" : txData.type === "transfer" ? "Transfer Saldo" : "Pengeluaran");

  const payload = {
    id: "tx-" + Date.now(),
    user_id: userId,
    type: txData.type || "expense",
    amount: amount,
    description: defaultDesc,
    category_id: txData.category_id || defaultCategory,
    account_id: txData.account_id || defaultAccount,
    destination_account_id: txData.destination_account_id || null,
    income_source: txData.income_source || null,
    transaction_date: txData.transaction_date || new Date().toISOString().split("T")[0],
    transaction_time: txData.transaction_time || new Date().toTimeString().split(" ")[0],
    created_at: new Date().toISOString()
  };

  const client = getSupabase();
  let savedData = null;

  if (client) {
    try {
      const { data, error } = await client.from("transactions").insert([payload]).select().single();
      if (!error && data) savedData = data;
    } catch (err) {}
  }

  if (!savedData) {
    const localTxsSaved = localStorage.getItem("MYFINANCE_LOCAL_TXS");
    let localTxs = localTxsSaved ? JSON.parse(localTxsSaved) : [];
    localTxs.unshift(payload);
    localStorage.setItem("MYFINANCE_LOCAL_TXS", JSON.stringify(localTxs));
    savedData = payload;
  }

  showToast("Transaksi berhasil disimpan!", "success");
  return { success: true, transaction: savedData };
}