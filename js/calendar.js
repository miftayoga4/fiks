/* ====================================================================
   MY FINANCE - FINANCIAL CALENDAR ENGINE
   ==================================================================== */

// Fetch Month Transactions & Bills for Calendar View
async function fetchMonthCalendarData(userId, month, year) {
  const client = getSupabase();
  if (!client) return { transactions: [], bills: [] };

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: txs } = await client
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .gte("transaction_date", startDate)
    .lte("transaction_date", endDate);

  const { data: bills } = await client
    .from("recurring_bills")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .gte("next_due_date", startDate)
    .lte("next_due_date", endDate);

  return {
    transactions: txs || [],
    bills: bills || []
  };
}

// Generate Calendar Matrix for Month
function generateCalendarMatrix(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const matrix = [];

  let currentWeek = new Array(firstDay).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      matrix.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    matrix.push(currentWeek);
  }

  return matrix;
}
