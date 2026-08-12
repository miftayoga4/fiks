/* ====================================================================
   MY FINANCE - ACCOUNTS & BALANCE CALCULATOR
   ==================================================================== */

// Fetch all active accounts with calculated current balances
async function fetchAccountsWithBalances(userId) {
  const client = getSupabase();
  if (!client) return [];

  // 1. Fetch Accounts
  const { data: accounts, error: accError } = await client
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (accError) {
    console.error("Error fetching accounts:", accError);
    return [];
  }

  // 2. Fetch Active Non-deleted Transactions
  const { data: txs, error: txError } = await client
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (txError) {
    console.error("Error fetching transactions for balance:", txError);
  }

  // 3. Fetch Balance Adjustments
  const { data: adjustments } = await client
    .from("balance_adjustments")
    .select("*")
    .eq("user_id", userId);

  const transactionsList = txs || [];
  const adjustmentList = adjustments || [];

  // 4. Calculate live balances based on core formula
  return accounts.map(acc => {
    let balance = Number(acc.initial_balance) || 0;

    // Process transactions
    transactionsList.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === "income" && t.account_id === acc.id) {
        balance += amt;
      } else if (t.type === "expense" && t.account_id === acc.id) {
        balance -= amt;
      } else if (t.type === "transfer") {
        if (t.account_id === acc.id) balance -= amt; // Transfer Out
        if (t.destination_account_id === acc.id) balance += amt; // Transfer In
      }
    });

    // Process balance adjustments
    adjustmentList.forEach(adj => {
      if (adj.account_id === acc.id) {
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
  const client = getSupabase();
  if (!client) return { success: false };

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

  if (error) {
    showToast("Gagal menambah akun: " + error.message, "error");
    return { success: false, error };
  }

  showToast("Akun berhasil ditambahkan!", "success");
  return { success: true, account: data };
}

// Record Balance Adjustment (Koreksi Saldo)
async function recordBalanceAdjustment(userId, accountId, currentBalance, actualBalance, reason) {
  const client = getSupabase();
  if (!client) return { success: false };

  const diff = Number(actualBalance) - Number(currentBalance);

  const { error } = await client
    .from("balance_adjustments")
    .insert([{
      user_id: userId,
      account_id: accountId,
      previous_balance: Number(currentBalance),
      actual_balance: Number(actualBalance),
      difference: diff,
      reason,
      adjustment_date: new Date().toISOString().split("T")[0]
    }]);

  if (error) {
    showToast("Gagal mencatat koreksi saldo", "error");
    return { success: false, error };
  }

  showToast("Koreksi saldo berhasil dicatat", "success");
  return { success: true };
}
