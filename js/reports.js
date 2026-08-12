/* ====================================================================
   MY FINANCE - ANNUAL & MONTHLY REPORTS + EXPORT
   ==================================================================== */

// Fetch Annual Report Data for Selected Year
async function fetchAnnualReport(userId, year) {
  const client = getSupabase();
  if (!client) return null;

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: txs } = await client
    .from("transactions")
    .select(`
      *,
      category:categories(name)
    `)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .gte("transaction_date", startDate)
    .lte("transaction_date", endDate);

  const months = Array(12).fill(0).map(() => ({ income: 0, expense: 0 }));
  let totalIncome = 0;
  let totalExpense = 0;
  let maxExpenseTx = null;
  const categoriesMap = {};

  (txs || []).forEach(t => {
    const amt = Number(t.amount) || 0;
    const monthIdx = new Date(t.transaction_date).getMonth();

    if (t.type === "income") {
      totalIncome += amt;
      months[monthIdx].income += amt;
    } else if (t.type === "expense") {
      totalExpense += amt;
      months[monthIdx].expense += amt;

      const catName = t.category ? t.category.name : "Lainnya";
      categoriesMap[catName] = (categoriesMap[catName] || 0) + amt;

      if (!maxExpenseTx || amt > maxExpenseTx.amount) {
        maxExpenseTx = t;
      }
    }
  });

  // Highest and lowest spending months
  let highestExpenseMonth = 0;
  let lowestExpenseMonth = 0;
  let maxExp = -1;
  let minExp = Infinity;

  months.forEach((m, idx) => {
    if (m.expense > maxExp) {
      maxExp = m.expense;
      highestExpenseMonth = idx;
    }
    if (m.expense < minExp && m.expense > 0) {
      minExp = m.expense;
      lowestExpenseMonth = idx;
    }
  });

  return {
    year,
    totalIncome,
    totalExpense,
    netSavings: totalIncome - totalExpense,
    monthlyAverageExpense: totalExpense / 12,
    dailyAverageExpense: totalExpense / 365,
    months,
    highestExpenseMonth,
    lowestExpenseMonth,
    maxExpenseTx,
    categoriesMap
  };
}

// Export Transactions to CSV File
function exportTransactionsToCSV(transactions) {
  if (!transactions || transactions.length === 0) {
    showToast("Tidak ada data transaksi untuk diexport", "warning");
    return;
  }

  const headers = ["Tanggal", "Waktu", "Jenis", "Nominal", "Deskripsi", "Kategori", "Akun", "Sumber/Tujuan", "Catatan"];
  const rows = transactions.map(t => [
    t.transaction_date,
    t.transaction_time,
    t.type,
    t.amount,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    `"${(t.category ? t.category.name : '').replace(/"/g, '""')}"`,
    `"${(t.account ? t.account.name : '').replace(/"/g, '""')}"`,
    `"${(t.type === 'transfer' ? (t.destination_account ? t.destination_account.name : '') : (t.income_source || '')).replace(/"/g, '""')}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `MY_FINANCE_Export_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("CSV berhasil didownload!", "success");
}
