import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

export default function PieChar({ expenses }) {
  const data = ["Food", "Education", "Medical", "Other"].map((cat) => ({
    name: cat,
    value: expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0),
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const dataWithPercent = data.map((d) => ({
    ...d,
    percentage: total ? Math.round((d.value / total) * 100) : 0,
  }));

  return (
    <div style={{ width: "100%", maxWidth: "1024px", margin: "0 auto" }}>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={dataWithPercent}
            cx="50%"
            cy="50%"
            dataKey="value"
            outerRadius={60}
            innerRadius={30}
            paddingAngle={5}
            label={(entry) => `${entry.percentage}%`}
          >
            {dataWithPercent.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`₹${value.toLocaleString()}`, "Amount"]}
            contentStyle={{
              backgroundColor: "white",
              border: "2px solid #8b5cf6",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "500",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          paddingTop: "16px",
          textAlign: "center",
          color: "#8b5cf6",
          fontWeight: 700,
        }}
      >
        Total: ₹{total.toLocaleString()}
      </div>
    </div>
  );
}
