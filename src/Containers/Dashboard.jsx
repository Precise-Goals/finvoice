import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  getDatabase,
  ref,
  set,
  get,
  child,
  push,
  update,
} from "firebase/database";
import { getAuth } from "firebase/auth";
import Navbar from "../Components/Navbar";
import LineChart from "../Components/LineChart";
import PieChar from "../Components/PieChar";
import { app } from "../firebase";

const Dashboard = () => {
  const [voiceText, setVoiceText] = useState("");
  const [expenses, setExpenses] = useState([]); // array of { category, amount, timestamp, description }
  const [savings, setSavings] = useState([]);
  const [spendings, setSpendings] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);

  // Category breakdown for expenses
  const [categoryTotals, setCategoryTotals] = useState({
    food: 0,
    medical: 0,
    education: 0,
    others: 0,
  });

  const auth = getAuth();
  const user = auth.currentUser;
  const handleReset = async () => {
    if (!user) return;
    const db = getDatabase(app);

    try {
      // Reset in Firebase
      await set(ref(db, `users/${user.uid}`), {
        totalBalance: 0,
        categoryTotals: {
          food: 0,
          medical: 0,
          education: 0,
          others: 0,
        },
        transactions: {},
        lastUpdated: new Date().toISOString(),
      });

      // Reset locally
      setTotalBalance(0);
      setCategoryTotals({ food: 0, medical: 0, education: 0, others: 0 });
      setSavings([]);
      setSpendings([]);
      setExpenses([]);
      setRecentTransactions([]);
    } catch (err) {
      console.error("Reset failed:", err);
    }
  };
  // Process and save transaction
  const processTransaction = useCallback(
    async (analysis, originalText, language) => {
      const timestamp = new Date();
      const newTransaction = {
        id: Date.now() + Math.random(),
        type: analysis.type,
        category: analysis.category,
        amount: analysis.amount,
        description: analysis.description,
        voiceTranscript: originalText,
        languageDetected: language,
        timestamp: timestamp.toISOString(),
        confidence: analysis.confidence,
      };

      // Update local state based on transaction type
      if (analysis.type === "savings") {
        setSavings((prev) => [newTransaction, ...prev]);
        // Add to total balance for savings
        setTotalBalance((prev) => prev + analysis.amount);
      } else if (analysis.type === "spending") {
        setSpendings((prev) => [newTransaction, ...prev]);
        // Deduct from total balance for spending
        setTotalBalance((prev) => prev - analysis.amount);
      } else if (analysis.type === "expense") {
        setExpenses((prev) => [newTransaction, ...prev]);

        // Update category totals
        setCategoryTotals((prev) => ({
          ...prev,
          [analysis.category]: prev[analysis.category] + analysis.amount,
        }));

        // Deduct from total balance for expenses
        setTotalBalance((prev) => prev - analysis.amount);
      }

      // Add to recent transactions
      setRecentTransactions((prev) => [newTransaction, ...prev.slice(0, 9)]);

      // Save to Firebase
      if (user) {
        const db = getDatabase(app);
        // const userRef = ref(db, `users/${user.uid}`);

        try {
          // Save transaction
          await push(ref(db, `users/${user.uid}/transactions`), newTransaction);

          // Update totals
          const updates = {};
          updates[`totalBalance`] =
            totalBalance +
            (analysis.type === "savings" ? analysis.amount : -analysis.amount);

          if (analysis.type === "expense") {
            updates[`categoryTotals/${analysis.category}`] =
              categoryTotals[analysis.category] + analysis.amount;
          }

          await update(ref(db, `users/${user.uid}`), {
            totalBalance:
              totalBalance +
              (analysis.type === "savings"
                ? analysis.amount
                : -analysis.amount),

            ...(analysis.type === "expense" && {
              [`categoryTotals/${analysis.category}`]:
                (categoryTotals[analysis.category] || 0) + analysis.amount,
            }),

            lastUpdated: timestamp.toISOString(),
          });

          console.log("Transaction saved successfully");
        } catch (error) {
          console.error("Error saving to Firebase:", error);
        }
      }
    },
    [user, categoryTotals, totalBalance]
  );
  // Mock AI Analysis (replace with actual AI API like OpenAI/Gemini)
  const mockAIAnalysis = useCallback(async (text, language) => {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

    const lowerText = text.toLowerCase();

    // Multi-language keywords
    const keywords = {
      en: {
        savings: [
          "saved",
          "deposit",
          "bank",
          "save",
          "balance",
          "savings",
          "add money",
          "put money",
        ],
        spending: ["spent", "bought", "purchased", "paid", "spend", "shopping"],
        food: [
          "food",
          "restaurant",
          "lunch",
          "dinner",
          "breakfast",
          "meal",
          "eating",
          "cafe",
          "snack",
        ],
        medical: [
          "doctor",
          "medicine",
          "hospital",
          "medical",
          "health",
          "clinic",
          "pharmacy",
        ],
        education: [
          "book",
          "course",
          "school",
          "education",
          "study",
          "tuition",
          "fees",
          "college",
        ],
        others: [
          "other",
          "misc",
          "general",
          "utility",
          "bill",
          "rent",
          "transport",
        ],
      },
      hi: {
        savings: ["बचत", "जमा", "सेव", "बैंक", "पैसे रखे", "पैसे बचाए"],
        spending: ["खर्च", "खरीदा", "पैसे दिए", "लिया", "शॉपिंग"],
        food: ["खाना", "भोजन", "रेस्टोरेंट", "लंच", "डिनर", "नाश्ता", "खाने"],
        medical: ["डॉक्टर", "दवा", "अस्पताल", "इलाज", "क्लिनिक", "दवाई"],
        education: ["किताब", "पढ़ाई", "स्कूल", "शिक्षा", "फीस", "कॉलेज"],
        others: ["अन्य", "और", "बिल", "किराया", "यातायात"],
      },
      mr: {
        savings: ["बचत", "जमा", "सेव्ह", "बँक", "पैसे ठेवले"],
        spending: ["खर्च", "विकत घेतले", "पैसे दिले", "शॉपिंग"],
        food: ["जेवण", "खाणे", "रेस्टॉरंट", "लंच", "डिनर"],
        medical: ["डॉक्टर", "औषध", "हॉस्पिटल", "इलाज"],
        education: ["पुस्तक", "अभ्यास", "शाळा", "शिक्षण"],
        others: ["इतर", "अन्य", "बिल"],
      },
    };

    // Extract amount using multiple patterns
    const amountPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:rupees?|रुपये|रुपया|₹)/i,
      /₹\s*(\d+(?:\.\d+)?)/,
      /(\d+(?:\.\d+)?)\s*(?:rs|रु)/i,
      /(\d+(?:\.\d+)?)/,
    ];

    let amount = 0;
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        amount = parseFloat(match[1]);
        break;
      }
    }

    if (amount === 0) return null;

    const langKeywords = keywords[language] || keywords.en;

    // Determine type and category
    let type = "spending";
    let category = "others";

    // Check for savings first
    if (langKeywords.savings.some((word) => lowerText.includes(word))) {
      type = "savings";
      category = null;
    }
    // Check for expense categories
    else if (langKeywords.food.some((word) => lowerText.includes(word))) {
      type = "expense";
      category = "food";
    } else if (langKeywords.medical.some((word) => lowerText.includes(word))) {
      type = "expense";
      category = "medical";
    } else if (
      langKeywords.education.some((word) => lowerText.includes(word))
    ) {
      type = "expense";
      category = "education";
    } else if (langKeywords.spending.some((word) => lowerText.includes(word))) {
      type = "spending";
      category = null;
    } else {
      type = "expense";
      category = "others";
    }

    return {
      type,
      category,
      amount,
      description: text.trim(),
      confidence: 0.85,
    };
  }, []);
  // AI Analysis Function for Voice Text
  const analyzeVoiceText = useCallback(
    async (text) => {
      if (!text || text.trim() === "") return null;

      setProcessingVoice(true);
      console.log("Analyzing voice text:", text);

      try {
        // Detect language
        const hindiPattern = /[\u0900-\u097F]/;
        const marathiPattern = /[\u0900-\u097F]/; // Both use Devanagari script

        let detectedLang = "en";
        if (hindiPattern.test(text)) detectedLang = "hi";
        if (marathiPattern.test(text)) detectedLang = "mr";

        // AI Analysis
        const result = await mockAIAnalysis(text, detectedLang);

        if (result && result.amount > 0) {
          await processTransaction(result, text, detectedLang);
        }
      } catch (error) {
        console.error("Error analyzing voice text:", error);
      } finally {
        setProcessingVoice(false);
      }
    },
    [mockAIAnalysis, processTransaction]
  );

  // Load data from Firebase on component mount
  useEffect(() => {
    if (user) {
      const db = getDatabase(app);
      const dbRef = ref(db);

      // Fetch all user data
      get(child(dbRef, `users/${user.uid}`)).then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();

          // Total Balance → local state
          setTotalBalance(userData.totalBalance ?? 58000);

          // Category Totals → local state
          if (userData.categoryTotals) {
            setCategoryTotals(userData.categoryTotals);
          }

          // Savings history (optional sync)
          if (userData.transactions) {
            const transactionsList = Object.values(userData.transactions);
            setSavings(transactionsList.filter((t) => t.type === "savings"));
            setSpendings(transactionsList.filter((t) => t.type === "spending"));
            setExpenses(transactionsList.filter((t) => t.type === "expense"));
          }
        } else {
          // Initialize
          setTotalBalance(58000);
          set(ref(db, `users/${user.uid}/totalBalance`), 58000);
        }
      });
    }
  }, [user]);
  const lastVoiceRef = useRef("");
  useEffect(() => {
    if (
      voiceText &&
      voiceText.trim() !== "" &&
      voiceText !== lastVoiceRef.current
    ) {
      lastVoiceRef.current = voiceText;
      analyzeVoiceText(voiceText);
    }
  }, [voiceText, analyzeVoiceText]);

  const totalSavingsAmount = savings.reduce((t, s) => t + s.amount, 0);
  const totalSpendingsAmount = spendings.reduce((t, s) => t + s.amount, 0);
  const totalExpensesAmount = expenses.reduce((t, e) => t + e.amount, 0);
  const totalSpendings = totalSpendingsAmount + totalExpensesAmount;

  return (
    <div className="conte">
      <Navbar onVoiceText={setVoiceText} />

      {/* Voice Processing Indicator */}
      {processingVoice && (
        <div
          className="voice-processing"
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: "12px 20px",
            borderRadius: "25px",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.4)",
          }}
        >
          <div
            style={{
              width: "16px",
              height: "16px",
              border: "2px solid transparent",
              borderTop: "2px solid white",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          ></div>
          Processing voice input...
        </div>
      )}

      {/* Current Voice Text Display */}
      {voiceText && (
        <div
          className="voice-text-display"
          style={{
            background: "#f0f9ff",
            border: "2px solid #0ea5e9",
            borderRadius: "12px",
            padding: "16px",
            margin: "20px",
            fontSize: "14px",
            color: "#0c4a6e",
          }}
        >
          <strong>Voice Input:</strong> {voiceText}
        </div>
      )}

      <div className="DashStart">
        <div className="dashc">
          <p>Total Balance</p>
          <h1>₹ {totalBalance.toLocaleString()}</h1>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            Savings: ₹{totalSavingsAmount.toLocaleString()} | Spent: ₹
            {totalSpendings.toLocaleString()}
          </div>
        </div>
        <div className="spending">
          <p>Total Spendings</p>
          <h1>₹ {totalSpendings.toLocaleString()}</h1>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            Regular: ₹{totalSpendingsAmount.toLocaleString()}
          </div>
        </div>
      </div>
      <div className="lineChar">
        <div className="ldiv"></div>
        <h5>August Savings</h5>
        <LineChart />
      </div>
      {/* Category Breakdown */}
      <div className="Piechar">
        <PieChar
          expenses={expenses.map((e) => ({
            name: e.category,
            value: e.amount,
            category: e.category,
          }))}
          categoryTotals={categoryTotals}
        />
      </div>
      <div
        className="category-breakdown"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "16px",
          margin: "20px",
          padding: "20px",
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
        }}
      >
        <h3
          style={{
            gridColumn: "1 / -1",
            margin: "0 0 16px 0",
            color: "#374151",
          }}
        >
          Expense Categories
        </h3>
        {Object.entries(categoryTotals).map(([category, amount]) => (
          <div
            key={category}
            style={{
              textAlign: "center",
              padding: "12px",
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                textTransform: "capitalize",
              }}
            >
              {category}
            </div>
            <div
              style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937" }}
            >
              ₹{amount.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ margin: "20px", textAlign: "center" }}>
        <button
          onClick={handleReset}
          style={{
            background: "black",
            color: "white",
            padding: "12px 24px",
            borderRadius: "12px",
            fontWeight: "600",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
          }}
        >
          Reset Progress
        </button>
      </div>

      {/* Recent Transactions */}
      <div
        className="recent-transactions"
        style={{
          margin: "20px",
          padding: "20px",
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
        }}
      >
        <h3 style={{ margin: "0 0 16px 0", color: "#374151" }}>
          Recent Transactions
        </h3>
        {recentTransactions.length === 0 ? (
          <p style={{ color: "#6b7280", textAlign: "center", padding: "20px" }}>
            No transactions yet. Try saying something like:
            <br />
            "I spent 500 rupees on food" or "मैंने खाने पर 500 रुपये खर्च किए"
          </p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  borderLeft: `4px solid ${
                    transaction.type === "savings"
                      ? "#10b981"
                      : transaction.type === "spending"
                      ? "#3b82f6"
                      : "#ef4444"
                  }`,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: "500",
                      color: "#1f2937",
                      fontSize: "14px",
                    }}
                  >
                    {transaction.description}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    {transaction.type}
                    {transaction.category && ` • ${transaction.category}`}
                    {transaction.languageDetected &&
                      ` • ${transaction.languageDetected.toUpperCase()}`}
                    {transaction.confidence &&
                      ` • ${Math.round(
                        transaction.confidence * 100
                      )}% confident`}
                  </div>
                </div>
                <div
                  style={{
                    fontWeight: "600",
                    color:
                      transaction.type === "savings" ? "#10b981" : "#ef4444",
                    fontSize: "16px",
                  }}
                >
                  {transaction.type === "savings" ? "+" : "-"}₹
                  {transaction.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add CSS for spin animation */}
      <style>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
