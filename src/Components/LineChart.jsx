import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useFinancialData } from "../context/FinancialDataContext";
import { formatINR } from "../services/ragService";

// Custom Tooltip showing accurate balance and transaction point
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload;
    return (
      <div
        style={{
          backgroundColor: "rgba(17, 24, 39, 0.95)",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: "12px",
          fontSize: "12px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(8px)",
          minWidth: "120px",
        }}
      >
        <div style={{ color: "#9ca3af", fontSize: "11px", marginBottom: "4px" }}>
          {label}
        </div>
        <div style={{ fontWeight: "700", color: "#a5b4fc", fontSize: "15px" }}>
          {formatINR(payload[0].value)}
        </div>
        {dataItem.label && dataItem.label !== "Initial" && dataItem.label !== "Baseline" && (
          <div
            style={{
              color: "#d1d5db",
              fontSize: "11px",
              marginTop: "4px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "180px",
            }}
          >
            {dataItem.label}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function LineChart() {
  const { totalBalance, transactions } = useFinancialData();

  // Compute live balance trajectory in sync with real balance & transactions
  const chartData = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const curMonth = monthNames[now.getMonth()];

    // When balance is reset to 0 and there are no transactions
    if (totalBalance === 0 && (!transactions || transactions.length === 0)) {
      const daysCount = Math.max(5, Math.min(currentDay, 7));
      return Array.from({ length: daysCount }, (_, i) => ({
        day: `${curMonth} ${i + 1}`,
        balance: 0,
        label: "Reset to ₹0",
      }));
    }

    // When user has a starting balance but no transactions yet
    if (!transactions || transactions.length === 0) {
      const daysCount = Math.max(5, Math.min(currentDay, 8));
      return Array.from({ length: daysCount }, (_, i) => ({
        day: `${curMonth} ${i + 1}`,
        balance: totalBalance,
        label: "Starting Balance",
      }));
    }

    // When transactions exist: sort chronologically ascending
    const sortedTx = [...transactions].sort(
      (a, b) =>
        new Date(a.timestamp || a.date || 0) -
        new Date(b.timestamp || b.date || 0)
    );

    // Calculate net effect of all transactions (inflow adds, outflow subtracts)
    const netTxImpact = sortedTx.reduce((sum, tx) => {
      const amt = Number(tx.amount || 0);
      const isPositive =
        tx.type === "savings" ||
        tx.type === "income" ||
        tx.type === "earnings" ||
        tx.direction === "inflow";
      return isPositive ? sum + amt : sum - amt;
    }, 0);

    let runningBalance = Math.max(0, totalBalance - netTxImpact);
    const dataPoints = [];

    // Add baseline point
    const firstDate = new Date(
      sortedTx[0].timestamp || sortedTx[0].date || now
    );
    dataPoints.push({
      day: `${monthNames[firstDate.getMonth()]} ${firstDate.getDate()}`,
      balance: Math.round(runningBalance),
      label: "Baseline",
    });

    // Traverse transactions and track balance progression
    sortedTx.forEach((tx, idx) => {
      const amt = Number(tx.amount || 0);
      const isPositive =
        tx.type === "savings" ||
        tx.type === "income" ||
        tx.type === "earnings" ||
        tx.direction === "inflow";

      if (isPositive) {
        runningBalance += amt;
      } else {
        runningBalance = Math.max(0, runningBalance - amt);
      }

      const txDate = new Date(tx.timestamp || tx.date || now);
      dataPoints.push({
        day: `${monthNames[txDate.getMonth()]} ${txDate.getDate()}${
          sortedTx.length > 3 ? ` #${idx + 1}` : ""
        }`,
        balance: Math.round(runningBalance),
        label: `${isPositive ? "+" : "-"}${formatINR(amt)} (${tx.description || tx.category || tx.type})`,
      });
    });

    // Ensure the latest point matches the current live totalBalance
    const lastPoint = dataPoints[dataPoints.length - 1];
    if (lastPoint && lastPoint.balance !== totalBalance) {
      dataPoints.push({
        day: "Now",
        balance: totalBalance,
        label: "Current Live Balance",
      });
    }

    return dataPoints;
  }, [totalBalance, transactions]);

  // Determine min & max for balanced chart rendering
  const minVal = useMemo(() => {
    if (chartData.length === 0) return 0;
    const min = Math.min(...chartData.map((d) => d.balance));
    return min === 0 ? 0 : Math.max(0, min - 500);
  }, [chartData]);

  const maxVal = useMemo(() => {
    if (chartData.length === 0) return 1000;
    const max = Math.max(...chartData.map((d) => d.balance));
    return max === 0 ? 1000 : Math.round(max * 1.15);
  }, [chartData]);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {/* Real-time Status Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 12px 6px",
          fontSize: "12px",
          color: "#6b7280",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: totalBalance > 0 ? "#10b981" : "#9ca3af",
              display: "inline-block",
              boxShadow: totalBalance > 0 ? "0 0 8px rgba(16, 185, 129, 0.6)" : "none",
            }}
          />
          <span style={{ fontWeight: 600, color: "#374151" }}>
            Live Balance: {formatINR(totalBalance)}
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "#9ca3af" }}>
          {transactions.length} record{transactions.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="chr" style={{ position: "relative", height: "220px", width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6c47ff" stopOpacity={0.8} />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#47d1ff" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
            />
            <YAxis
              domain={[minVal, maxVal]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              tickFormatter={(val) =>
                val >= 100000
                  ? `₹${(val / 100000).toFixed(1)}L`
                  : val >= 1000
                  ? `₹${(val / 1000).toFixed(0)}k`
                  : `₹${val}`
              }
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#6c47ff", strokeWidth: 1, strokeDasharray: "4 4" }} />

            <Area
              type="monotone"
              dataKey="balance"
              stroke="#6c47ff"
              strokeWidth={3}
              fill="url(#areaGradient)"
              dot={chartData.length <= 8 ? { r: 3, fill: "#6c47ff" } : false}
              activeDot={{ r: 6, fill: "#6c47ff", stroke: "#fff", strokeWidth: 2 }}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
