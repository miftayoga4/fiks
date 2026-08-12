/* ====================================================================
   MY FINANCE - TRANSACTIONS ENGINE & SIMULATOR
   ==================================================================== */

// Create Transaction (Income / Expense / Transfer)
async function saveTransaction(userId, txData) {
  const amount = Number(txData.amount) || 0;

  if (amount <= 0) {
    showToast("Nominal transaksi harus lebih besar dari Rp0", "warning");
    return { success: false };
  }

  const accountId = txData.account_id || "default-cash";
  let accountName = "Kas / Tunai";
  if (window.currentAccounts && window.currentAccounts.length > 0) {
    const foundAcc = window.currentAccounts.find(a => a.id === accountId);
    if (foundAcc) accountName = foundAcc.name;
  }

  const defaultCategory = txData.type === "income" ? "cat-lainnya-inc" : "cat-lainnya-exp";
  const defaultDesc = txData.description && txData.description.trim() !== "" 
    ? txData.description 
    : (txData.type === "income" ? "Pemasukan" : txData.type === "transfer" ? "Transfer Saldo" : "Pengeluaran");

  const payload = {
    id: "tx-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
    user_id: userId,
    type: txData.type || "expense",
    amount: amount,
    description: defaultDesc,
    category_id: txData.category_id || defaultCategory,
    subcategory_id: txData.subcategory_id || null,
    account_id: accountId,
    destination_account_id: txData.destination_account_id || null,
    income_source: txData.income_source || null,
    payment_method: txData.payment_method || null,
    transaction_date: txData.transaction_date || new Date().toISOString().split("T")[0],
    transaction_time: txData.transaction_time || new Date().toTimeString().split(" ")[0],
    location: txData.location || null,
    notes: txData.notes || null,
    created_at: new Date().toISOString(),
    account: { name: accountName }
  };

  if (payload.type === "transfer" && payload.account_id === payload.destination_account_id) {
    showToast("Akun asal dan akun tujuan transfer tidak boleh sama", "warning");
    return { success: false };
  }

  const client = getSupabase();
  if (client) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validAccId = isUuid.test(accountId) ? accountId : null;
      const validDestAccId = isUuid.test(txData.destination_account_id) ? txData.destination_account_id : null;
      const validCatId = isUuid.test(txData.category_id) ? txData.category_id : null;

      const dbPayload = {
        user_id: userId,
        type: payload.type,
        amount: payload.amount,
        description: payload.description,
        transaction_date: payload.transaction_date,
        transaction_time: payload.transaction_time,
        income_source: payload.income_source
      };
      if (validAccId) dbPayload.account_id = validAccId;
      if (validDestAccId) dbPayload.destination_account_id = validDestAccId;
      if (validCatId) dbPayload.category_id = validCatId;

      await client.from("transactions").insert([dbPayload]);
    } catch (err) {
      console.warn("Db insert error:", err);
    }
  }

  // Always save locally as reliable fallback
  const localTxsSaved = localStorage.getItem("MYFINANCE_LOCAL_TXS");
  let localTxs = [];
  if (localTxsSaved) {
    try { localTxs = JSON.parse(localTxsSaved); } catch(e) {}
  }
  localTxs.unshift(payload);
  localStorage.setItem("MYFINANCE_LOCAL_TXS", JSON.stringify(localTxs));

  showToast("Transaksi berhasil disimpan!", "success");
  return { success: true, transaction: payload };
}

// Fetch Transactions with optional filters
async function fetchTransactions(userId, filters = {}) {
  let data = [];
  const client = getSupabase();

  if (client) {
    try {
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

      const { data: dbData } = await query;
      if (dbData && dbData.length > 0) data = dbData;
    } catch (err) {
      console.warn("Fetching transactions from local storage fallback:", err);
    }
  }

  // Merge local transactions
  const localTxsSaved = localStorage.getItem("MYFINANCE_LOCAL_TXS");
  if (localTxsSaved) {
    try {
      const localTxs = JSON.parse(localTxsSaved);
      const existingIds = new Set(data.map(d => d.id));
      localTxs.forEach(ltx => {
        if (!existingIds.has(ltx.id)) {
          data.push(ltx);
        }
      });
    } catch(e) {}
  }

  // Client-side search if text search provided
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    data = data.filter(t => 
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.notes && t.notes.toLowerCase().includes(q)) ||
      (t.income_source && t.income_source.toLowerCase().includes(q)) ||
      (t.category && t.category.name && t.category.name.toLowerCase().includes(q))
    );
  }

  return data;
}