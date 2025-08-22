import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Sample spending data
const spendingData = [
  { name: "Food", value: 12500, percentage: 35 },
  { name: "Travel", value: 8900, percentage: 25 },
  { name: "Medical", value: 7100, percentage: 20 },
  { name: "Other Bills", value: 7140, percentage: 20 },
];

// Fresh vibrant purple color scheme
const COLORS = [
  "#8b5cf6", // violet-500
  "#a78bfa", // violet-400
  "#c4b5fd", // violet-300
  "#ddd6fe", // violet-200
];

// Custom label function to show percentages
const renderLabel = (entry) => {
  return `${entry.percentage}%`;
};

export default function PieCha0rt() {
  return (
    <div>
      <div
        style={{
          width: "100%",
          maxWidth: "1024px",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            padding: "32px",
          }}
        >
          {/* Chart and Legend Container */}
          <div className="lolaksnla">
            {/* Pie Chart */}
            <div className="safjosohtn">
              <div className="pieh">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spendingData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderLabel}
                      outerRadius={40}
                      innerRadius={20}
                      paddingAngle={5}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {spendingData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        `₹${value.toLocaleString()}`,
                        "Amount",
                      ]}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "2px solid #8b5cf6",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px -5px rgba(179, 147, 253, 0.31)",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="da">2/30</p>
            </div>

            {/* Categories in right column */}
            <div className="sasofja">
              {spendingData.map((entry, index) => (
                <div
                  key={entry.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      width: "27px",
                      height: "27px",
                      borderRadius: "50%",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      backgroundColor: COLORS[index],
                    }}
                    className="knsoaigj"
                  ></div>
                  <div style={{ color: "#374151" }}>
                    <div
                      style={{
                        fontWeight: "900",
                        fontSize: "9.75px",
                      }}
                    >
                      {entry.name}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#8b5cf6",
                      }}
                    >
                      ₹{entry.value.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div
                style={{
                  paddingTop: "24px",
                  borderTop: "2px solid #ddd6fe",
                  marginTop: "8px",
                }}
              >
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "#8b5cf6",
                  }}
                >
                  Total: ₹
                  {spendingData
                    .reduce((total, item) => total + item.value, 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
