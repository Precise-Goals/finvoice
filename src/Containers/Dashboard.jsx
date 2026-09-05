import React, { useState } from "react";
import LineChart from "../Components/LineChart";
import PieChar from "../Components/PieChar";
import OnboardingModal from "../Components/OnboardingModal";
import { useFinancialData } from "../context/FinancialDataContext";
import { formatINR } from "../services/ragService";

const Dashboard = () => {
  const financialData = useFinancialData();
  const {
    totalBalance,
    categoryTotals,
    recentTransactions,
    totalSavingsAmount,
    totalExpensesAmount,
    totalSpendingsAmount,
    totalSpendings,
    resetFinancialData,
    userProfile,
    isOnboardingOpen,
    setIsOnboardingOpen,
  } = financialData;

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetFeedback, setResetFeedback] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const currentMonth = new Date().toLocaleString("default", { month: "long" });

  const handleConfirmReset = async () => {
    setIsResetting(true);
    const ok = await resetFinancialData();
    setIsResetting(false);
    setShowResetModal(false);
    if (ok) {
      setResetFeedback("Progress & balance reset to ₹0! Live chart updated.");
      setTimeout(() => setResetFeedback(""), 4000);
    }
  };

  // Expenses formatted for PieChart
  const pieExpenses = Object.entries(categoryTotals).map(([cat, val]) => ({
    name: cat,
    category: cat,
    value: val,
  }));

  return (
    <div className="conte" style={{ paddingBottom: "100px" }}>
      {/* Onboarding Banner if not completed */}
      {!userProfile?.onboardingCompleted && (
        <div
          style={{
            background: "linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)",
            borderRadius: "16px",
            padding: "14px 18px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            border: "1px solid #c7d2fe",
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.1)",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: "#3730a3", fontSize: "14px" }}>
              ✨ Complete Your Profile & Starting Balance
            </div>
            <div style={{ color: "#4f46e5", fontSize: "12px", marginTop: "2px" }}>
              Configure your baseline funds, avatar, and first savings goal.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOnboardingOpen(true)}
            style={{
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: "12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(79, 70, 229, 0.3)",
            }}
          >
            Start Setup →
          </button>
        </div>
      )}

      {/* Reset Feedback Notification */}
      {resetFeedback && (
        <div
          style={{
            backgroundColor: "#dcfce7",
            color: "#15803d",
            padding: "10px 16px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 600,
            marginBottom: "16px",
            border: "1px solid #86efac",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(22, 163, 74, 0.15)",
          }}
        >
          ✓ {resetFeedback}
        </div>
      )}

      {/* Main Balances */}
      <div className="DashStart">
        <div className="dashc">
          <p>Total Balance</p>
          <h1>{formatINR(totalBalance)}</h1>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            Savings: {formatINR(totalSavingsAmount)} | Spent: {formatINR(totalSpendings)}
          </div>
        </div>
        <div className="spending">
          <p>Total Spendings</p>
          <h1>{formatINR(totalSpendings)}</h1>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            Categorized: {formatINR(totalExpensesAmount)} | General: {formatINR(totalSpendingsAmount)}
          </div>
        </div>
      </div>

      {/* Cash Flow Visuals (tracks live balance) */}
      <div className="lineChar" style={{ position: "relative" }}>
        <div className="ldiv"></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px 4px" }}>
          <h5>{currentMonth} Balance Trend</h5>
        </div>
        <LineChart />
      </div>

      {/* Category Breakdown Pie Chart */}
      <div className="Piechar">
        <PieChar expenses={pieExpenses} categoryTotals={categoryTotals} />
      </div>

      {/* Category Breakdown Cards */}
      <div
        className="category-breakdown"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "16px",
          margin: "20px 0",
          padding: "20px",
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
        }}
      >
        <h3 style={{ gridColumn: "1 / -1", margin: "0 0 16px 0", color: "#374151" }}>
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
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
              {formatINR(amount)}
            </div>
          </div>
        ))}
      </div>

      {/* Reset Progress Button */}
      <div style={{ margin: "24px 20px", textAlign: "center" }}>
        <button
          type="button"
          onClick={() => setShowResetModal(true)}
          style={{
            background: "#000000",
            color: "white",
            padding: "13px 28px",
            borderRadius: "14px",
            fontWeight: "700",
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
        >
          <span>↺</span> Reset Progress & Balance
        </button>
        <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "6px" }}>
          Resets balance to ₹0 and clears transactions (Profile preserved)
        </div>
      </div>

      {/* Confirmation Modal for Reset Progress */}
      {showResetModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                margin: "0 auto 14px",
              }}
            >
              ⚠️
            </div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#111827", fontWeight: 700 }}>
              Reset Balance & Progress?
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
              This will reset your <strong>Total Balance to ₹0</strong> and clear all transaction logs.
              The balance chart will immediately reset to ₹0.
              <br />
              <span style={{ color: "#16a34a", fontWeight: 600, display: "inline-block", marginTop: "6px" }}>
                ✓ Your profile details (Name, PAN, Aadhaar) will be preserved.
              </span>
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: "1.5px solid #d1d5db",
                  background: "#fff",
                  color: "#374151",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: isResetting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
                }}
              >
                {isResetting ? "Resetting..." : "Yes, Reset to ₹0"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smooth Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* Recent Transactions */}
      <div
        className="recent-transactions"
        style={{
          margin: "20px 0",
          padding: "20px",
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
        }}
      >
        <h3 style={{ margin: "0 0 16px 0", color: "#374151" }}>Recent Transactions</h3>
        {recentTransactions.length === 0 ? (
          <p style={{ color: "#6b7280", textAlign: "center", padding: "20px" }}>
            No transactions yet. Try speaking:
            <br />
            "Spent 450 rupees on dinner" or "दवाइयों के लिए 300 रुपये खर्च किए"
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {recentTransactions.map((transaction) => {
              const isPositive =
                transaction.type === "savings" ||
                transaction.type === "income" ||
                transaction.type === "earnings" ||
                transaction.direction === "inflow";

              return (
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
                      isPositive
                        ? "#10b981"
                        : transaction.type === "spending"
                        ? "#3b82f6"
                        : "#ef4444"
                    }`,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "500", color: "#1f2937", fontSize: "14px" }}>
                      {transaction.description}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      <span
                        style={{
                          fontWeight: 600,
                          color: isPositive ? "#059669" : "#6b7280",
                          textTransform: "capitalize",
                        }}
                      >
                        {transaction.type}
                      </span>
                      {transaction.category && ` • ${transaction.category}`}
                      {transaction.languageDetected &&
                        ` • ${transaction.languageDetected.toUpperCase()}`}
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: "700",
                      color: isPositive ? "#10b981" : "#ef4444",
                      fontSize: "16px",
                    }}
                  >
                    {isPositive ? "+" : "-"}
                    {formatINR(transaction.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CSS Spin Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
