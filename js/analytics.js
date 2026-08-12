/* ====================================================================
   MY FINANCE - ANALYTICS & FINANCIAL INSIGHTS
   ==================================================================== */

// Fetch Analytics Summary for a given Date Range
async function fetchAnalyticsData(userId, startDate, endDate) {
  const client = getSupabase();
  if (!client) return { totalIncome: 0, totalExpense: 0, categoryBreakdown: [], incomeSources: [] };

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

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryMap = {};
  const incomeSourceMap = {};

  (txs || []).forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === "income") {
      totalIncome += amt;
      const src = t.income_source || "Lainnya";
      incomeSourceMap[src] = (incomeSourceMap[src] || 0) + amt;
    } else if (t.type === "expense") {
      totalExpense += amt;
      const catName = t.category ? t.category.name : "Tanpa Kategori";
      categoryMap[catName] = (categoryMap[catName] || 0) + amt;
    }
  });

  const categoryBreakdown = Object.keys(categoryMap).map(k => ({ name: k, amount: categoryMap[k] }));
  const incomeSources = Object.keys(incomeSourceMap).map(k => ({ name: k, amount: incomeSourceMap[k] }));

  return {
    totalIncome,
    totalExpense,
    netCashflow: totalIncome - totalExpense,
    categoryBreakdown,
    incomeSources,
    rawTransactions: txs || []
  };
}

// Generate Rule-Based Financial Insights
function generateFinancialInsights(analyticsCurrent, analyticsPrevious) {
  const insights = [];

  // Insight 1: Makanan Comparison
  if (analyticsPrevious && analyticsPrevious.totalExpense > 0) {
    const currFood = (analyticsCurrent.categoryBreakdown.find(c => c.name.toLowerCase().includes("makan")) || {}).amount || 0;
    const prevFood = (analyticsPrevious.categoryBreakdown.find(c => c.name.toLowerCase().includes("makan")) || {}).amount || 0;

    if (prevFood > 0) {
      const diffPct = (((currFood - prevFood) / prevFood) * 100).toFixed(0);
      if (diffPct > 0) {
        insights.push(`🍔 Pengeluaran makananmu periode ini ${diffPct}% lebih tinggi dibandingkan periode sebelumnya.`);
      } else if (diffPct < 0) {
        insights.push(`🎉 Hebat! Pengeluaran makananmu turun ${Math.abs(diffPct)}% dibanding periode sebelumnya.`);
      }
    }
  }

  // Insight 2: Top Income Source
  if (analyticsCurrent.incomeSources.length > 0 && analyticsCurrent.totalIncome > 0) {
    const topIncome = [...analyticsCurrent.incomeSources].sort((a,b) => b.amount - a.amount)[0];
    const pct = ((topIncome.amount / analyticsCurrent.totalIncome) * 100).toFixed(0);
    insights.push(`💼 Sumber pemasukan terbesar periode ini adalah "${topIncome.name}" menyumbang ${pct}% (${formatRupiah(topIncome.amount)}).`);
  }

  // Insight 3: Net Cash Flow
  if (analyticsCurrent.netCashflow > 0) {
    insights.push(`📈 Arus kas positif! Kamu berhasil menyisihkan ${formatRupiah(analyticsCurrent.netCashflow)} periode ini.`);
  } else if (analyticsCurrent.netCashflow < 0) {
    insights.push(`⚠️ Pengeluaran melebihi pemasukan sebesar ${formatRupiah(Math.abs(analyticsCurrent.netCashflow))}. Perhatikan budget kamu!`);
  }

  return insights;
}
