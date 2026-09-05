import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  getDatabase,
  ref,
  onValue,
  set,
  push,
  update,
  remove,
} from "firebase/database";
import { app } from "../firebase";
import { useUser } from "../UserContext";

export const FinancialDataContext = createContext(null);

export const FinancialDataProvider = ({ children }) => {
  const { user } = useUser();
  const [totalBalance, setTotalBalance] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState({
    food: 0,
    medical: 0,
    education: 0,
    others: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [userProfile, setUserProfile] = useState({
    name: "FinVoice User",
    email: "",
    aadhaar: "",
    panCard: "",
    mobile: "",
    avatar: 1,
    onboardingCompleted: false,
    initialBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  // Assistant ecosystem global state
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantPreloadQuery, setAssistantPreloadQuery] = useState("");

  // Global Onboarding Flow state
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const db = useMemo(() => getDatabase(app), []);

  // Listen to Firebase Realtime Database for active user
  useEffect(() => {
    if (!user || !user.uid) {
      setLoading(false);
      return;
    }

    const userRef = ref(db, `users/${user.uid}`);
    const unsubscribe = onValue(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();

          // Total Balance
          if (data.totalBalance !== undefined && data.totalBalance !== null) {
            setTotalBalance(Number(data.totalBalance));
          } else {
            setTotalBalance(0);
          }

          // Category Totals
          if (data.categoryTotals) {
            setCategoryTotals({
              food: Number(data.categoryTotals.food || 0),
              medical: Number(data.categoryTotals.medical || 0),
              education: Number(data.categoryTotals.education || 0),
              others: Number(data.categoryTotals.others || 0),
            });
          }

          // Transactions
          if (data.transactions) {
            const txList = Object.entries(data.transactions).map(
              ([id, val]) => {
                let type = val.type || "expense";
                let direction = val.direction;

                // Auto-healing for misclassified income (e.g. "Earned 10 lakh" or "salary")
                const desc = (val.description || val.voiceTranscript || "").toLowerCase();
                const isEarnedPattern = /earn|salary|credited|income|bonus|profit|कमाए|कमाया|मिले|पगार/i.test(desc);
                if (isEarnedPattern && (type === "spending" || type === "expense")) {
                  type = "income";
                  direction = "inflow";
                }

                if (!direction) {
                  direction = (type === "savings" || type === "income" || type === "earnings") ? "inflow" : "outflow";
                }

                return {
                  id,
                  ...val,
                  type,
                  direction,
                };
              }
            );
            // Sort by timestamp descending (newest first)
            txList.sort(
              (a, b) =>
                new Date(b.timestamp || b.date || 0) -
                new Date(a.timestamp || a.date || 0)
            );
            setTransactions(txList);
          } else {
            setTransactions([]);
          }

          // Goals
          if (data.goals) {
            const currentBal = Number(data.totalBalance ?? 0);
            const goalsList = Object.entries(data.goals).map(([id, val]) => {
              const req = Number(val.required || 1);
              const progressPercent = Math.min(
                100,
                Math.round((currentBal / req) * 100)
              );
              const remainingAmount = Math.max(0, req - currentBal);
              return {
                id,
                title: val.title || "Goal",
                type: val.type || "Others",
                plan: val.plan || "Individual",
                required: req,
                progressPercent,
                remainingAmount,
                isAchieved: currentBal >= req,
              };
            });
            setGoals(goalsList);
          } else {
            setGoals([]);
          }

          // Profile
          setUserProfile({
            name: data.name || user.displayName || "FinVoice User",
            email: data.email || user.email || "",
            aadhaar: data.aadhaar || "",
            panCard: data.panCard || "",
            mobile: data.mobile || "",
            avatar: data.avatar || 1,
            onboardingCompleted: Boolean(data.onboardingCompleted),
            initialBalance: Number(data.initialBalance || 0),
          });
        } else {
          // Initialize default profile in DB without wiping
          update(ref(db, `users/${user.uid}`), {
            totalBalance: 0,
            initialBalance: 0,
            onboardingCompleted: false,
            categoryTotals: {
              food: 0,
              medical: 0,
              education: 0,
              others: 0,
            },
          }).catch((err) => console.error("Error setting initial user data:", err));
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to user financial data:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, db]);

  // Derived financial analytics
  const incomeTransactions = useMemo(
    () => transactions.filter((t) => t.type === "income" || t.type === "earnings" || (t.direction === "inflow" && t.type !== "savings")),
    [transactions]
  );
  const savingsTransactions = useMemo(
    () => transactions.filter((t) => t.type === "savings"),
    [transactions]
  );
  const expenseTransactions = useMemo(
    () => transactions.filter((t) => t.type === "expense"),
    [transactions]
  );
  const spendingTransactions = useMemo(
    () => transactions.filter((t) => t.type === "spending"),
    [transactions]
  );

  const totalIncomeAmount = useMemo(
    () => incomeTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0),
    [incomeTransactions]
  );

  const totalSavingsAmount = useMemo(
    () => savingsTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0),
    [savingsTransactions]
  );

  const totalExpensesAmount = useMemo(
    () => expenseTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0),
    [expenseTransactions]
  );

  const totalSpendingsAmount = useMemo(
    () => spendingTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0),
    [spendingTransactions]
  );

  const totalSpendings = totalExpensesAmount + totalSpendingsAmount;

  // Top spending category
  const topExpenseCategory = useMemo(() => {
    let maxCat = "others";
    let maxVal = -1;
    for (const [cat, val] of Object.entries(categoryTotals)) {
      if (val > maxVal) {
        maxVal = val;
        maxCat = cat;
      }
    }
    return { category: maxCat, amount: maxVal };
  }, [categoryTotals]);

  // Process and save a structured transaction
  const processTransaction = useCallback(
    async (analysis, originalText = "", language = "en") => {
      if (!user || !analysis || !analysis.amount) return false;

      const timestamp = new Date().toISOString();
      const amount = Number(analysis.amount);

      // Determine positive inflow vs negative outflow
      const isPositive =
        analysis.type === "income" ||
        analysis.type === "savings" ||
        analysis.type === "earnings" ||
        analysis.direction === "inflow";

      const finalType = analysis.type || (isPositive ? "income" : "expense");
      const finalDirection = isPositive ? "inflow" : "outflow";

      const newTransaction = {
        type: finalType,
        direction: finalDirection,
        category: finalType === "expense" ? (analysis.category || "others") : null,
        amount,
        description: analysis.description || originalText || (isPositive ? "Income Transaction" : "Expense Transaction"),
        voiceTranscript: originalText,
        languageDetected: language,
        timestamp,
        date: new Date().toLocaleDateString("en-IN"),
        confidence: analysis.confidence || 0.98,
      };

      try {
        const txRef = push(ref(db, `users/${user.uid}/transactions`));
        await set(txRef, newTransaction);

        // Compute updated balance & category totals (inflow adds, outflow subtracts)
        const newBal = totalBalance + (isPositive ? amount : -amount);

        const updates = {
          totalBalance: newBal,
          lastUpdated: timestamp,
        };

        if (finalType === "expense" && newTransaction.category) {
          const currentCatVal = categoryTotals[newTransaction.category] || 0;
          updates[`categoryTotals/${newTransaction.category}`] = currentCatVal + amount;
        }

        await update(ref(db, `users/${user.uid}`), updates);
        return true;
      } catch (err) {
        console.error("Failed to process transaction in FinancialDataContext:", err);
        return false;
      }
    },
    [user, db, totalBalance, categoryTotals]
  );

  // Add a new goal
  const addGoal = useCallback(
    async ({ title, type, plan, required }) => {
      if (!user) return false;
      try {
        const goalsRef = ref(db, `users/${user.uid}/goals`);
        await push(goalsRef, {
          title,
          type,
          plan,
          required: parseFloat(required),
          createdAt: new Date().toISOString(),
        });
        return true;
      } catch (err) {
        console.error("Failed to add goal:", err);
        return false;
      }
    },
    [user, db]
  );

  // Remove a goal
  const removeGoal = useCallback(
    async (goalId) => {
      if (!user || !goalId) return false;
      try {
        await remove(ref(db, `users/${user.uid}/goals/${goalId}`));
        return true;
      } catch (err) {
        console.error("Failed to remove goal:", err);
        return false;
      }
    },
    [user, db]
  );

  // Reset financial progress (resets balance to 0, clears transactions, preserves profile)
  const resetFinancialData = useCallback(async () => {
    if (!user) return false;
    try {
      await update(ref(db, `users/${user.uid}`), {
        totalBalance: 0,
        initialBalance: 0,
        categoryTotals: {
          food: 0,
          medical: 0,
          education: 0,
          others: 0,
        },
        transactions: null,
        lastUpdated: new Date().toISOString(),
      });
      setTotalBalance(0);
      setCategoryTotals({
        food: 0,
        medical: 0,
        education: 0,
        others: 0,
      });
      setTransactions([]);
      return true;
    } catch (err) {
      console.error("Failed to reset financial data:", err);
      return false;
    }
  }, [user, db]);

  // Update profile details directly in Realtime Database
  const updateProfileData = useCallback(
    async (details) => {
      if (!user) return false;
      try {
        const updates = {
          ...details,
          updatedAt: new Date().toISOString(),
        };
        await update(ref(db, `users/${user.uid}`), updates);
        return true;
      } catch (err) {
        console.error("Failed to update profile data:", err);
        return false;
      }
    },
    [user, db]
  );

  // Save onboarding setup flow details
  const saveOnboardingDetails = useCallback(
    async ({ name, avatar, initialBalance, goal, mobile, panCard, aadhaar, contact }) => {
      if (!user) return false;
      try {
        const parsedBalance = Number(initialBalance) || 0;
        const updates = {
          name: name || userProfile.name || "FinVoice User",
          avatar: avatar || userProfile.avatar || 1,
          totalBalance: parsedBalance,
          initialBalance: parsedBalance,
          onboardingCompleted: true,
          updatedAt: new Date().toISOString(),
        };

        if (contact) updates.contact = contact;
        if (mobile) updates.mobile = mobile;
        if (panCard) updates.panCard = panCard;
        if (aadhaar) updates.aadhaar = aadhaar;

        await update(ref(db, `users/${user.uid}`), updates);

        // Immediate local state sync
        setTotalBalance(parsedBalance);
        setUserProfile((prev) => ({
          ...prev,
          name: updates.name,
          avatar: updates.avatar,
          mobile: updates.mobile || prev.mobile,
          panCard: updates.panCard || prev.panCard,
          aadhaar: updates.aadhaar || prev.aadhaar,
          onboardingCompleted: true,
          initialBalance: parsedBalance,
        }));

        // If an initial goal was specified, create it
        if (goal && goal.title && goal.required) {
          const goalsRef = ref(db, `users/${user.uid}/goals`);
          await push(goalsRef, {
            title: goal.title,
            type: goal.type || "Others",
            plan: goal.plan || "Individual",
            required: parseFloat(goal.required),
            createdAt: new Date().toISOString(),
          });
        }

        return true;
      } catch (err) {
        console.error("Failed to save onboarding details:", err);
        return false;
      }
    },
    [user, db, userProfile]
  );

  // Open assistant with preloaded query from anywhere in the app
  const openAssistantWithQuery = useCallback((query) => {
    setAssistantPreloadQuery(query);
    setIsAssistantOpen(true);
  }, []);

  const value = {
    loading,
    totalBalance,
    categoryTotals,
    transactions,
    recentTransactions: transactions.slice(0, 15),
    incomeTransactions,
    totalIncomeAmount,
    goals,
    userProfile,
    totalSavingsAmount,
    totalExpensesAmount,
    totalSpendingsAmount,
    totalSpendings,
    topExpenseCategory,
    processTransaction,
    addGoal,
    removeGoal,
    resetFinancialData,
    updateProfileData,
    saveOnboardingDetails,
    // Onboarding controls
    isOnboardingOpen,
    setIsOnboardingOpen,
    // Assistant Ecosystem Controls
    isAssistantOpen,
    setIsAssistantOpen,
    assistantPreloadQuery,
    setAssistantPreloadQuery,
    openAssistantWithQuery,
  };

  return (
    <FinancialDataContext.Provider value={value}>
      {children}
    </FinancialDataContext.Provider>
  );
};

export const useFinancialData = () => {
  const context = useContext(FinancialDataContext);
  if (!context) {
    throw new Error(
      "useFinancialData must be used within a FinancialDataProvider"
    );
  }
  return context;
};
