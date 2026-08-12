/* ====================================================================
   MY FINANCE - SAVINGS GOALS & DEPOSITS
   ==================================================================== */

// Fetch Savings Goals
async function fetchSavingsGoals(userId) {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from("savings_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching savings goals:", error);
    return [];
  }

  return (data || []).map(g => {
    const progress = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
    return {
      ...g,
      progress: Math.min(progress, 100).toFixed(1)
    };
  });
}

// Create Savings Goal
async function createSavingsGoal(userId, name, targetAmount, deadline, description) {
  const client = getSupabase();
  if (!client) return { success: false };

  const { data, error } = await client
    .from("savings_goals")
    .insert([{
      user_id: userId,
      name,
      target_amount: Number(targetAmount),
      current_amount: 0,
      deadline: deadline || null,
      description: description || null,
      status: "in_progress"
    }])
    .select()
    .single();

  if (error) {
    showToast("Gagal membuat target tabungan", "error");
    return { success: false };
  }

  showToast("Target tabungan berhasil dibuat!", "success");
  return { success: true, goal: data };
}

// Deposit or Withdraw from Savings Goal
async function updateSavingsAmount(userId, goalId, amount, type = "deposit", notes = "") {
  const client = getSupabase();
  if (!client) return { success: false };

  // 1. Get current goal state
  const { data: goal } = await client
    .from("savings_goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (!goal) return { success: false };

  const delta = type === "deposit" ? Number(amount) : -Number(amount);
  const newCurrent = Math.max(0, (Number(goal.current_amount) || 0) + delta);
  const isCompleted = newCurrent >= goal.target_amount;

  // 2. Insert savings transaction
  await client
    .from("savings_transactions")
    .insert([{
      user_id: userId,
      goal_id: goalId,
      amount: Number(amount),
      type,
      notes
    }]);

  // 3. Update goal current_amount
  const { error } = await client
    .from("savings_goals")
    .update({
      current_amount: newCurrent,
      status: isCompleted ? "completed" : "in_progress"
    })
    .eq("id", goalId);

  if (error) {
    showToast("Gagal memperbarui tabungan", "error");
    return { success: false };
  }

  showToast(type === "deposit" ? "Setoran tabungan berhasil!" : "Penarikan tabungan dicatat!", "success");
  return { success: true };
}
