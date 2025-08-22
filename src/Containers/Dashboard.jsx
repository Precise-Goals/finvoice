import React, { useState, useEffect } from "react";
import { getDatabase, ref, set } from "firebase/database";
import { getAuth } from "firebase/auth";
import Navbar from "../Components/Navbar";
import VoiceExpenseParser from "../Components/VoiceExpenseParser";
import LineChart from "../Components/LineChart";
import PieChar from "../Components/PieChar";
import { app } from "../firebase";

const Dashboard = () => {
  const [voiceText, setVoiceText] = useState("");
  const [expenses, setExpenses] = useState([]); // array of { category, amount }
  const [totalBalance, setTotalBalance] = useState(0);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const balance = 58000; 
    setTotalBalance(balance);

    // Save current saving to Firebase
    if (user) {
      const db = getDatabase(app);
      set(ref(db, `users/${user.uid}/totalBalance`), balance);
    }
  }, [user, expenses]);

  const totalSpendings = expenses.reduce((t, e) => t + e.amount, 0);

  return (
    <div className="conte">
      <Navbar onVoiceText={setVoiceText} />
      <VoiceExpenseParser voiceText={voiceText} setExpenses={setExpenses} />
      <div className="DashStart">
        <div className="dashc">
          <p>Total Balance • All time</p>
          <h1>₹ {totalBalance.toLocaleString()}</h1>
        </div>
        <div className="spending">
          <p>Spendings</p>
          <h1>₹ {totalSpendings.toLocaleString()}</h1>
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
