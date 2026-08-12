/* ====================================================================
   MY FINANCE - ACCOUNTS & BALANCE CALCULATOR
   ==================================================================== */

const DEFAULT_ACCOUNTS = [
  { id: "default-cash", name: "Kas / Tunai", type: "cash", initial_balance: 0, current_balance: 0, is_emergency: false, is_savings: false, is_active: true },
  { id: "default-bank", name: "Bank (BCA/Mandiri/BRI)", type: "bank", initial_balance: 0, current_balance: 0, is_emergency: false, is_savings: false, is_active: true },
  { id: "default-ewallet", name: "E-Wallet (GoPay/DANA/OVO)", type: "ewallet", initial_balance: 0, current_balance: 0, is_emergency: false, is_savings: false, is_active: true }
];

// Fetch all active accounts with calculated current balances
async function fetchAccountsWithBalances(userId) {
  const client = getSupabase();
  let accounts = [];
  let transactionsList = [];
  let adjustmentList = [];

  if (client) {
    try {
      const { data: accData } = await client
        .from("accounts")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (accData && accData.length > 0) accounts = accData;

      const { data: txs } = await client
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null);

      transactionsList = txs || [];

      const { data: adjustments } = await client
        .from("balance_adjustments")
        .select("*")
        .eq("user_id", userId);

      adjustmentList = adjustments || [];
    } catch (err) {
      console.warn("Using local accounts fallback:", err);
    }
  }

  if (!accounts || accounts.length === 0) {
    accounts = DEFAULT_ACCOUNTS;
  }

  const localTxsSaved = localStorage.getItem("MYFINANCE_LOCAL_TXS");
  if (localTxsSaved) {
    try {
      const localTxs = JSON.parse(localTxsSaved);
      transactionsList = [...transactionsList, ...localTxs];
    } catch(e) {}
  }

  return accounts.map(acc => {
    let balance = Number(acc.initial_balance) || 0;

    transactionsList.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === "income" && t.account_id === acc.id) balance += amt;
      else if (t.type === "expense" && t.account_id === acc.id) balance -= amt;
      else if (t.type === "transfer") {
        if (t.account_id === acc.id) balance -= amt;
        if (t.destination_account_id === acc.id) balance += amt;
      }
    });

    adjustmentList.forEach(adj => {
      if (adj.account_id === acc.id) balance += Number(adj.difference) || 0;
    });

    return { ...acc, current_balance: balance };
  });
}