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
      // 1. Fetch Accounts
      const { data: accData } = await client
        .from("accounts")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (accData && accData.length > 0) {
        accounts = accData;
      }

      // 2. Fetch Active Non-deleted Transactions
      const { data: txs } = await client
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null);

      transactionsList = txs || [];

      // 3. Fetch Balance Adjustments
      const { data: adjustments } = await client
        .from("balance_adjustments")
        .select("*")
        .eq("user_id", userId);

      adjustmentList = adjustments || [];
    } catch (err) {
      console.warn("Using local accounts fallback due to connection/auth:", err);
    }
  }

  // Fallback to default accounts if database returns empty
  if (!accounts || accounts.length === 0) {
    accounts = [...DEFAULT_ACCOUNTS];
  }

  // Merge local accounts
  const localAccSaved = localStorage.getItem("MYFINANCE_LOCAL_ACCOUNTS");
  if (localAccSaved) {
    try {
      const localAccs = JSON.parse(localAccSaved);
      const existingIds = new Set(accounts.map(a => a.id));
      localAccs.forEach(la => {
        if (!existingIds.has(la.id)) {
          accounts.push(la);
        }
      });
    } catch(e) {}
  }

  // Also process local transactions if any exist
  const localTxsSaved = localStorage.getItem("MYFINANCE_LOCAL_TXS");
  if (localTxsSaved) {
    try {
      const localTxs = JSON.parse(localTxsSaved);
      const existingIds = new Set(transactionsList.map(t => t.id));
      localTxs.forEach(ltx => {
        if (!existingIds.has(ltx.id)) {
          transactionsList.push(ltx);
        }
      });
    } catch(e) {}
  }

  // Merge local adjustments
  const localAdjSaved = localStorage.getItem("MYFINANCE_LOCAL_ADJUSTMENTS");
  if (localAdjSaved) {
    try {
      const localAdjs = JSON.parse(localAdjSaved);
      const existingIds = new Set(adjustmentList.map(a => a.id));
      localAdjs.forEach(ladj => {
        if (!existingIds.has(ladj.id)) {
          adjustmentList.push(ladj);
        }
      });
    } catch(e) {}
  }

  const knownAccountIds = new Set(accounts.map(a => a.id));

  // 4. Calculate live balances based on core formula
  return accounts.map((acc, index) => {
    let balance = Number(acc.initial_balance) || 0;

    // Process transactions
    transactionsList.forEach(t => {
      const amt = Number(t.amount) || 0;
      
      const isAccMatch = (t.account_id === acc.id) || 
        ((!t.account_id || t.account_id === "null" || t.account_id === "default-cash" || !knownAccountIds.has(t.account_id)) && (acc.id === "default-cash" || index === 0));

      const isDestMatch = (t.destination_account_id === acc.id) || 
        ((t.destination_account_id === "default-cash" || t.destination_account_id === "default-bank") && acc.id === t.destination_account_id);

      if (t.type === "income" && isAccMatch) {
        balance += amt;
      } else if (t.type === "expense" && isAccMatch) {
        balance -= amt;
      } else if (t.type === "transfer") {
        if (isAccMatch) balance -= amt; // Transfer Out
        if (isDestMatch) balance += amt; // Transfer In
      }
    });

    // Process balance adjustments
    adjustmentList.forEach(adj => {
      if (adj.account_id === acc.id || (!knownAccountIds.has(adj.account_id) && index === 0)) {
        balance += Number(adj.difference) || 0;
      }
    });

    return {
      ...acc,
      current_balance: balance
    };
  });
}

// Calculate Financial Overview Totals
function calculateFinancialOverview(accountsWithBalances) {
  let totalMoney = 0;
  let operationalMoney = 0;
  let emergencyFund = 0;
  let totalSavings = 0;

  accountsWithBalances.forEach(acc => {
    const bal = acc.current_balance;
    totalMoney += bal;

    if (acc.is_emergency) {
      emergencyFund += bal;
    } else if (acc.is_savings) {
      totalSavings += bal;
    } else {
      operationalMoney += bal;
    }
  });

  return {
    totalMoney,
    operationalMoney,
    emergencyFund,
    totalSavings
  };
}

// Add New Account
async function createAccount(userId, name, type, initialBalance = 0, isEmergency = false, isSavings = false) {
  const newAccount = {
    id: "acc-" + Date.now(),
    user_id: userId,
    name,
    type,
    initial_balance: Number(initialBalance),
    is_emergency: isEmergency,
    is_savings: isSavings,
    is_active: true,
    created_at: new Date().toISOString()
  };

  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from("accounts")
        .insert([{
          user_id: userId,
          name,
          type,
          initial_balance: Number(initialBalance),
          is_emergency: isEmergency,
          is_savings: isSavings,
          is_active: true
        }])
        .select()
        .single();

      if (!error && data) {
        newAccount.id = data.id;
      }
    } catch(e) {}
  }

  // Always save locally as fallback
  const localAccSaved = localStorage.getItem("MYFINANCE_LOCAL_ACCOUNTS");
  let localAccs = localAccSaved ? JSON.parse(localAccSaved) : [];
  localAccs.push(newAccount);
  localStorage.setItem("MYFINANCE_LOCAL_ACCOUNTS", JSON.stringify(localAccs));

  showToast("Akun berhasil ditambahkan!", "success");
  return { success: true, account: newAccount };
}

// Record Balance Adjustment (Koreksi Saldo)
async function recordBalanceAdjustment(userId, accountId, currentBalance, actualBalance, reason) {
  const diff = Number(actualBalance) - Number(currentBalance);
  const adjObj = {
    id: "adj-" + Date.now(),
    user_id: userId,
    account_id: accountId,
    previous_balance: Number(currentBalance),
    actual_balance: Number(actualBalance),
    difference: diff,
    reason,
    adjustment_date: new Date().toISOString().split("T")[0]
  };

  const client = getSupabase();
  if (client) {
    try {
      await client.from("balance_adjustments").insert([{
        user_id: userId,
        account_id: accountId,
        previous_balance: Number(currentBalance),
        actual_balance: Number(actualBalance),
        difference: diff,
        reason,
        adjustment_date: adjObj.adjustment_date
      }]);
    } catch(e) {}
  }

  const localAdjSaved = localStorage.getItem("MYFINANCE_LOCAL_ADJUSTMENTS");
  let localAdjs = localAdjSaved ? JSON.parse(localAdjSaved) : [];
  localAdjs.push(adjObj);
  localStorage.setItem("MYFINANCE_LOCAL_ADJUSTMENTS", JSON.stringify(localAdjs));

  showToast("Koreksi saldo berhasil dicatat", "success");
  return { success: true };
}