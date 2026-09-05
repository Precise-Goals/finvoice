/**
 * FinVoice High-Performance Financial RAG (Retrieval-Augmented Generation) Engine
 * Integrates live dashboard records, category spending patterns, transaction ledgers,
 * and milestone goals with Sarvam AI's Indic LLMs (sarvam-105b-conversations).
 */

import { chatCompletion } from "./sarvam.js";

/**
 * Format Indian Rupees cleanly with Indian numbering grouping (e.g. ₹1,25,000)
 */
export const formatINR = (amount) => {
  const num = Number(amount || 0);
  return `₹${num.toLocaleString("en-IN")}`;
};

/**
 * Construct structured Knowledge Base chunks from the user's live financial data
 */
export const buildFinancialKnowledgeBase = (financialData, userProfile = {}) => {
  const {
    totalBalance = 0,
    categoryTotals = { food: 0, medical: 0, education: 0, others: 0 },
    goals = [],
    recentTransactions = [],
    totalSavingsAmount = 0,
    totalExpensesAmount = 0,
    totalSpendingsAmount = 0,
    totalSpendings = 0,
    topExpenseCategory = { category: "others", amount: 0 },
  } = financialData || {};

  // 1. Account & Liquidity Snapshot
  const vitalsChunk = `[FINANCIAL VITALS & LIQUIDITY]
- Current Total Account Balance: ${formatINR(totalBalance)}
- Cumulative Savings Deposited: ${formatINR(totalSavingsAmount)}
- Cumulative Categorized Expenses: ${formatINR(totalExpensesAmount)}
- Cumulative General Spending: ${formatINR(totalSpendingsAmount)}
- Total Outflow: ${formatINR(totalSpendings)}
- Net Financial Health: ${
    totalBalance > 20000
      ? "Healthy liquidity buffer available"
      : totalBalance > 5000
      ? "Moderate liquidity; maintain disciplined budgeting"
      : "Low liquidity; recommend aggressive savings & expense cutting"
  }`;

  // 2. Category Expenditure Breakdown
  const catTotalSum = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 1;
  const categoryChunk = `[EXPENDITURE BREAKDOWN BY CATEGORY]
- Food & Groceries: ${formatINR(categoryTotals.food)} (${Math.round(
    ((categoryTotals.food || 0) / catTotalSum) * 100
  )}% of expenses)
- Healthcare & Medical: ${formatINR(categoryTotals.medical)} (${Math.round(
    ((categoryTotals.medical || 0) / catTotalSum) * 100
  )}% of expenses)
- Education & Learning: ${formatINR(categoryTotals.education)} (${Math.round(
    ((categoryTotals.education || 0) / catTotalSum) * 100
  )}% of expenses)
- Utilities & Others: ${formatINR(categoryTotals.others)} (${Math.round(
    ((categoryTotals.others || 0) / catTotalSum) * 100
  )}% of expenses)
- Top Expense Drain: ${topExpenseCategory.category.toUpperCase()} at ${formatINR(
    topExpenseCategory.amount
  )}`;

  // 3. Milestone Goals Portfolio
  let goalsChunk = `[MILESTONE SAVINGS & INVESTMENT GOALS] (Total Goals: ${goals.length})\n`;
  if (goals.length === 0) {
    goalsChunk += "- No active goals currently configured by the user.";
  } else {
    goals.forEach((g, idx) => {
      goalsChunk += `${idx + 1}. Goal: "${g.title}" | Type: ${g.type} | Plan: ${
        g.plan
      }\n   - Target Required: ${formatINR(g.required)}\n   - Funded Progress: ${
        g.progressPercent
      }% (Gap Remaining: ${formatINR(g.remainingAmount)})\n   - Status: ${
        g.isAchieved
          ? "ACHIEVED! Total balance exceeds goal target"
          : "IN PROGRESS"
      }\n`;
    });
  }

  // 4. Recent Transactions Ledger
  let txChunk = `[RECENT TRANSACTION AUDIT TRAIL] (Latest ${Math.min(
    8,
    recentTransactions.length
  )} entries)\n`;
  if (recentTransactions.length === 0) {
    txChunk += "- No recent transactions recorded.";
  } else {
    recentTransactions.slice(0, 8).forEach((tx, idx) => {
      const sign = tx.type === "savings" ? "+" : "-";
      const dateStr = tx.date || (tx.timestamp ? new Date(tx.timestamp).toLocaleDateString("en-IN") : "Recent");
      txChunk += `${idx + 1}. [${dateStr}] ${sign}${formatINR(tx.amount)} | ${
        tx.type.toUpperCase()
      } | ${tx.category ? tx.category.toUpperCase() : "GENERAL"} | "${
        tx.description || tx.voiceTranscript || "Transaction"
      }"\n`;
    });
  }

  // 5. User Profile & KYC
  const profileChunk = `[USER PROFILE & IDENTITY]
- Name: ${userProfile.name || "FinVoice Member"}
- KYC Status: ${
    userProfile.panCard && userProfile.aadhaar
      ? "Verified Indian Citizen (PAN & Aadhaar on file)"
      : "Standard Profile"
  }
- Preferred Currency: Indian Rupee (INR ₹)`;

  return {
    vitalsChunk,
    categoryChunk,
    goalsChunk,
    txChunk,
    profileChunk,
  };
};

/**
 * Fast intent router to prioritize relevant RAG context chunks
 */
export const detectQueryIntent = (queryText = "") => {
  const q = queryText.toLowerCase();

  const goalKeywords = [
    "goal",
    "target",
    "emergency",
    "emergency fund",
    "medical emergency",
    "gold",
    "real estate",
    "stock",
    "shares",
    "education",
    "achieve",
    "afford",
    "buy",
    "purchase",
    "लक्ष्य",
    "ध्येय",
    "सोने",
    "खरेदी",
    "टार्गेट",
    "milestone",
    "future",
    "इमरजेंसी",
    "इमर्जन्सी",
  ];

  const expenseKeywords = [
    "expense",
    "spend",
    "spent",
    "cost",
    "food",
    "grocery",
    "medical",
    "doctor",
    "medicine",
    "bill",
    "rent",
    "others",
    "खर्च",
    "खाना",
    "दवा",
    "जेवण",
    "औषध",
    "बिल",
    "जास्त",
    "कटौती",
    "budget",
    "दवाइयों",
  ];

  const balanceKeywords = [
    "balance",
    "saved",
    "saving",
    "account",
    "money",
    "cash",
    "deposit",
    "बैलेंस",
    "पैसे",
    "बचत",
    "शिल्लक",
    "खाते",
    "जमा",
    "liquidity",
  ];

  const investmentKeywords = [
    "sip",
    "invest",
    "mutual fund",
    "fd",
    "interest",
    "wealth",
    "emergency fund",
    "गुंतवणूक",
    "निवेश",
    "फंड",
    "रिटर्न",
  ];

  if (goalKeywords.some((kw) => q.includes(kw))) return "GOALS";
  if (expenseKeywords.some((kw) => q.includes(kw))) return "EXPENSES";
  if (balanceKeywords.some((kw) => q.includes(kw))) return "BALANCE";
  if (investmentKeywords.some((kw) => q.includes(kw))) return "INVESTMENT";
  return "GENERAL_ADVISORY";
};

/**
 * Selectively assemble token-optimized RAG context based on detected intent
 */
export const retrieveRAGContext = (queryText, financialData, userProfile) => {
  const kb = buildFinancialKnowledgeBase(financialData, userProfile);
  const intent = detectQueryIntent(queryText);

  // Always provide full grounded context with prioritized order
  let assembledContext = "";
  if (intent === "GOALS") {
    assembledContext = `${kb.profileChunk}\n\n${kb.goalsChunk}\n\n${kb.vitalsChunk}\n\n${kb.categoryChunk}\n\n${kb.txChunk}`;
  } else if (intent === "EXPENSES") {
    assembledContext = `${kb.profileChunk}\n\n${kb.categoryChunk}\n\n${kb.vitalsChunk}\n\n${kb.txChunk}\n\n${kb.goalsChunk}`;
  } else if (intent === "BALANCE") {
    assembledContext = `${kb.profileChunk}\n\n${kb.vitalsChunk}\n\n${kb.goalsChunk}\n\n${kb.categoryChunk}\n\n${kb.txChunk}`;
  } else {
    assembledContext = `${kb.profileChunk}\n\n${kb.vitalsChunk}\n\n${kb.goalsChunk}\n\n${kb.categoryChunk}\n\n${kb.txChunk}`;
  }

  return {
    intent,
    contextText: assembledContext,
    groundTruthData: {
      totalBalance: financialData?.totalBalance || 0,
      goalsCount: (financialData?.goals || []).length,
      topExpense: financialData?.topExpenseCategory?.category || "none",
    },
  };
};

/**
 * Generate grounding System Prompt for Sarvam AI LLM
 */
export const generateRAGSystemPrompt = (contextText, languageCode = "en-IN") => {
  return `You are FinVoice, the advanced AI Personal Financial Assistant powered by Sarvam AI.
Preferred Language: ${languageCode}
You have LIVE, REAL-TIME access to this user's verified dashboard and goals data via FinVoice's Retrieval-Augmented Generation (RAG) layer.

=== RETRIEVED USER FINANCIAL GROUND TRUTH ===
${contextText}
=============================================

CRITICAL GROUNDING RULES:
1. ALWAYS quote the user's EXACT figures in Indian Rupees (₹) from the retrieved data above (e.g. mention their actual balance, specific category spending like Food ₹X, Healthcare & Medical ₹Y, or exact goal targets).
2. NEVER make up or hallucinate generic numbers when real data is present in the context.
3. When the user asks about their goals or emergency funds (e.g. "meri medical emergency kitne ki hai ??", "how much is my emergency fund target?"):
   - Look directly at the [MILESTONE SAVINGS & INVESTMENT GOALS] section above.
   - Quote their exact target amount, current funded progress, and remaining gap.
   - If a specific goal (e.g., Emergency Fund, Medical) exists, give that exact number.
   - If they haven't added a medical emergency goal yet, explicitly inform them of their current Healthcare & Medical spending from [EXPENDITURE BREAKDOWN BY CATEGORY] and their Total Account Balance, and advise setting a goal.
4. If the user writes in Hindi, Hinglish, Marathi, or any Indian language, respond naturally and fluently in that SAME language and script, maintaining financial accuracy.
5. Provide structured, actionable, and encouraging advice (bullet points, bold highlights).
6. Keep recommendations realistic for Indian personal finance (SIPs, Emergency Funds, Gold, Debt repayment, Budgeting).`;
};

/**
 * End-to-end RAG conversational query handler
 */
export const askFinVoiceAssistant = async ({
  query,
  history = [],
  financialData,
  userProfile = {},
  languageCode = "en-IN",
  model = "sarvam-105b-conversations",
}) => {
  if (!query || !query.trim()) {
    throw new Error("Query is required for assistant.");
  }

  const { intent, contextText, groundTruthData } = retrieveRAGContext(
    query,
    financialData,
    userProfile
  );

  const systemPrompt = generateRAGSystemPrompt(contextText, languageCode);

  // Format conversation history
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map((m) => ({
      role: m.sender === "user" || m.role === "user" ? "user" : "assistant",
      content: m.text || m.content || "",
    })),
    { role: "user", content: query.trim() },
  ];

  try {
    const reply = await chatCompletion(messages, {
      model,
      temperature: 0.6,
      maxTokens: 1024,
    });

    return {
      reply: reply.trim(),
      intent,
      groundTruthData,
      sourcesUsed: [
        `Live Account Balance: ${formatINR(groundTruthData.totalBalance)}`,
        `Active Goals: ${groundTruthData.goalsCount} tracked`,
        `Category Breakdown: ${groundTruthData.topExpense.toUpperCase()} active`,
      ],
    };
  } catch (error) {
    console.error("RAG Assistant completion failed:", error);
    throw error;
  }
};

/**
 * Generate dynamic, personalized prompt chips based on live user data
 */
export const getDynamicSuggestions = (financialData) => {
  const suggestions = [];
  const { _totalBalance = 0, goals = [], categoryTotals = {} } = financialData || {};

  if (goals.length > 0) {
    const firstGoal = goals[0];
    suggestions.push(`Can I achieve my ${firstGoal.title} goal?`);
    suggestions.push(`How much should I save monthly for ${firstGoal.title}?`);
  } else {
    suggestions.push("Suggest 3 long-term savings goals for me");
  }

  const foodAmount = categoryTotals.food || 0;
  if (foodAmount > 0) {
    suggestions.push(`How can I optimize my ${formatINR(foodAmount)} food expenses?`);
  } else {
    suggestions.push("How should I budget my monthly income?");
  }

  suggestions.push("Give me a snapshot of my financial health");
  suggestions.push("Should I start a SIP with my current balance?");

  return suggestions.slice(0, 4);
};

/**
 * Generate proactive instant observations on user's financial vitals
 */
export const generateInstantInsights = (financialData) => {
  const {
    totalBalance = 0,
    goals = [],
    _categoryTotals = {},
    topExpenseCategory = { category: "others", amount: 0 },
    totalSpendings = 0,
  } = financialData || {};

  const insights = [];

  // Liquidity insight
  if (totalBalance >= 50000) {
    insights.push({
      type: "positive",
      title: "Strong Liquidity Buffer",
      text: `Your current balance of ${formatINR(
        totalBalance
      )} covers healthy emergency buffer reserves. Consider allocating surplus to pending goals.`,
    });
  } else if (totalBalance < 10000) {
    insights.push({
      type: "warning",
      title: "Low Cash Buffer",
      text: `Your balance is currently ${formatINR(
        totalBalance
      )}. Prioritize building a 3-month emergency fund before major discretionary purchases.`,
    });
  }

  // Top category insight
  if (topExpenseCategory.amount > 0) {
    const pct = totalSpendings > 0
      ? Math.round((topExpenseCategory.amount / totalSpendings) * 100)
      : 0;
    insights.push({
      type: "info",
      title: `Highest Spending: ${topExpenseCategory.category.toUpperCase()}`,
      text: `${formatINR(topExpenseCategory.amount)} spent (${pct}% of total outlays). Review recurring items to increase monthly savings velocity.`,
    });
  }

  // Goals insight
  if (goals.length > 0) {
    const nearestGoal = [...goals].sort(
      (a, b) => b.progressPercent - a.progressPercent
    )[0];
    if (nearestGoal.isAchieved) {
      insights.push({
        type: "positive",
        title: `Goal Milestone Achieved! 🎉`,
        text: `Your balance of ${formatINR(totalBalance)} exceeds your target for "${
          nearestGoal.title
        }" (${formatINR(nearestGoal.required)}). Congratulations!`,
      });
    } else {
      insights.push({
        type: "info",
        title: `Nearest Milestone: ${nearestGoal.title}`,
        text: `You've achieved ${nearestGoal.progressPercent}% (${formatINR(
          nearestGoal.remainingAmount
        )} remaining). You are on track!`,
      });
    }
  } else {
    insights.push({
      type: "info",
      title: "No Milestone Goals Set",
      text: "Setting milestone goals (Gold, Real Estate, Stocks, Education) accelerates wealth accumulation. Add your first goal today!",
    });
  }

  return insights;
};
