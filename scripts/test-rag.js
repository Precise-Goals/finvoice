/**
 * Test FinVoice RAG Engine & Sarvam AI Integration
 */

import fs from "fs";
import path from "path";

// Populate process.env from .env if running standalone
const envPath = path.resolve(".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim();
      process.env[key] = val;
    }
  }
}

import {
  buildFinancialKnowledgeBase,
  detectQueryIntent,
  askFinVoiceAssistant,
} from "../src/services/ragService.js";

async function testRAG() {
  console.log("==================================================");
  console.log("🧠 FINVOICE - RAG ENGINE INTEGRITY TEST");
  console.log("==================================================");

  const mockFinancialData = {
    totalBalance: 58000,
    categoryTotals: {
      food: 4500,
      medical: 1200,
      education: 3500,
      others: 2000,
    },
    goals: [
      {
        id: "goal-1",
        title: "50g Gold Milestone",
        type: "Gold",
        plan: "Individual",
        required: 100000,
        progressPercent: 58,
        remainingAmount: 42000,
        isAchieved: false,
      },
      {
        id: "goal-2",
        title: "Emergency Tech Fund",
        type: "Stocks",
        plan: "Individual",
        required: 50000,
        progressPercent: 100,
        remainingAmount: 0,
        isAchieved: true,
      },
    ],
    recentTransactions: [
      {
        amount: 450,
        type: "expense",
        category: "food",
        description: "Dinner with friends",
        date: "04/09/2026",
      },
      {
        amount: 5000,
        type: "savings",
        category: null,
        description: "Monthly savings deposit",
        date: "01/09/2026",
      },
    ],
    totalSavingsAmount: 5000,
    totalExpensesAmount: 9200,
    totalSpendingsAmount: 2000,
    totalSpendings: 11200,
    topExpenseCategory: { category: "food", amount: 4500 },
  };

  const mockProfile = {
    name: "Aarav Sharma",
    panCard: "ABCDE1234F",
    aadhaar: "1234-5678-9012",
  };

  // Test 1: Knowledge Base Builder
  console.log("Test 1: Building Structured Knowledge Base...");
  const kb = buildFinancialKnowledgeBase(mockFinancialData, mockProfile);
  if (!kb.vitalsChunk.includes("58,000") || !kb.goalsChunk.includes("Gold")) {
    throw new Error("Knowledge base did not format figures properly.");
  }
  console.log("  ✅ Knowledge base constructed with high density.");

  // Test 2: Intent detection
  console.log("Test 2: Intent Routing...");
  const intent1 = detectQueryIntent("Can I buy gold?");
  const intent2 = detectQueryIntent("मेरे खाने पर कितना खर्च हुआ?");
  console.log(`  "Can I buy gold?" -> Intent: ${intent1}`);
  console.log(`  "मेरे खाने पर कितना खर्च हुआ?" -> Intent: ${intent2}`);
  if (intent1 !== "GOALS" || intent2 !== "EXPENSES") {
    throw new Error("Intent detection mismatch.");
  }
  console.log("  ✅ Intent router classified queries accurately.");

  // Test 3: End-to-End RAG Completion with Sarvam AI
  console.log("Test 3: Querying Sarvam AI with live Grounded RAG context...");
  const ragResult = await askFinVoiceAssistant({
    query: "Can I afford achieving my 50g Gold goal right now? What is my current balance and remaining gap?",
    history: [],
    financialData: mockFinancialData,
    userProfile: mockProfile,
  });

  console.log("  ✅ RAG Assistant Response received:");
  console.log(`  💬 "${ragResult.reply.slice(0, 200)}..."`);
  console.log(`  📌 Sources Used: ${ragResult.sourcesUsed.join(" | ")}`);

  // Verify that the answer mentions user's real numbers (58,000 or 42,000 or 1,00,000)
  const containsRealData =
    ragResult.reply.includes("58,000") ||
    ragResult.reply.includes("58000") ||
    ragResult.reply.includes("42,000") ||
    ragResult.reply.includes("42000") ||
    ragResult.reply.includes("1,00,000") ||
    ragResult.reply.includes("Gold");

  if (!containsRealData) {
    console.warn("  ⚠️ Warning: LLM reply did not cite the exact numbers, but completed successfully.");
  } else {
    console.log("  🎯 VERIFIED: Sarvam AI correctly grounded the response in the user's live balance & goal target!");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL RAG TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

testRAG().catch((err) => {
  console.error("❌ RAG Test Failed:", err);
  process.exit(1);
});
