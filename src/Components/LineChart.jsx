import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
} from "recharts";

// Generate 30 days of less consistent, more fluctuating growth data
const daysInMonth = 30;
let savings = 5000;
const sampleData = Array.from({ length: daysInMonth }, (_, i) => {
  // Allow bigger jumps (100–1000) and occasional dip (-200 to 0)
  const change = Math.random() < 0.25
    ? -Math.floor(Math.random() * 200)   // occasional dip
    : Math.floor(100 + Math.random() * 900); // bigger growth range
  savings += change;
  if (savings < 0) savings = 0; // prevent negative
  return { day: (i + 1).toString(), savings };
});


export default function LineChart() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center p-5 bg-gray-50">
      <div className="w-full max-w-6xl">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="chr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={sampleData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6c47ff" stopOpacity={0.8} />
                    <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#47d1ff" stopOpacity={0.1} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e7eb"
                  strokeOpacity={0}
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                />
                <YAxis axisLine={false} tickLine={false} tick={false} />
                <Tooltip cursor={false} />

                <Area
                  type="linear" // ✅ straight edges, no curve smoothing
                  dataKey="savings"
                  stroke="#6c47ff"
                  strokeWidth={3}
                  fill="url(#areaGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
