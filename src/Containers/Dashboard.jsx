import React, { useState } from "react";
import Navbar from "../Components/Navbar";
import VoiceExpenseParser from "../Components/VoiceExpenseParser";
import LineChart from "../Components/LineChart";
import PieChar from "../Components/PieChar";

const Dashboard = () => {
  const [voiceText, setVoiceText] = useState("");
  const [expenses, setExpenses] = useState([]); // array of { category, amount }

  return (
    <div className="conte">
      <Navbar onVoiceText={setVoiceText} />
      <VoiceExpenseParser voiceText={voiceText} setExpenses={setExpenses} />

      <div className="DashStart">
        <div className="dashc">
          <p>Total Balance • All time</p>
          <h1>

            ₹ 4560.00
            {/* {expenses.reduce((t, e) => t + e.amount, 0).toLocaleString()} */}
          </h1>
        </div>
        <div className="spending">
          <p>Spendings</p>
          <h1>
            ₹ {expenses.reduce((t, e) => t + e.amount, 0).toLocaleString()}
          </h1>
        </div>
      </div>

      <div className="lineChar">
        <div className="ldiv"></div>
        <h5>August Savings</h5>
        <LineChart />
      </div>

      <div className="Piechar">
        <PieChar expenses={expenses} />
      </div>
    </div>
  );
};

export default Dashboard;
