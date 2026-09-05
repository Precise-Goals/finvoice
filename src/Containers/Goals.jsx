import React, { useState } from "react";
import { useFinancialData } from "../context/FinancialDataContext";
import { formatINR } from "../services/ragService";

const investmentTypes = [
  "Real Estate",
  "Gold",
  "Stocks",
  "Leisure",
  "Education",
  "Others",
];
const planTypes = ["Individual", "Joint"];

const Goals = () => {
  const { totalBalance, goals, addGoal, removeGoal } = useFinancialData();

  const [title, setTitle] = useState("");
  const [type, setType] = useState(investmentTypes[0]);
  const [plan, setPlan] = useState(planTypes[0]);
  const [required, setRequired] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleAddGoal = async () => {
    if (!title || !required) {
      return alert("Please fill in the title and required amount.");
    }
    const success = await addGoal({
      title,
      type,
      plan,
      required: parseFloat(required),
    });
    if (success) {
      setTitle("");
      setRequired("");
      setType(investmentTypes[0]);
      setPlan(planTypes[0]);
      setShowForm(false);
    } else {
      alert("Failed to save goal. Please check your connection.");
    }
  };

  const count = goals.length;

  return (
    <div className="Gotent" style={{ paddingBottom: "100px" }}>
      <div className="goero">
        <h1>
          You have {count} <span>Long term goals</span>
        </h1>
        <p>
          Long-term goals focus on empowering users to achieve financial
          independence through automated and personalized planning.
        </p>

        <button className="open-form-btn" onClick={() => setShowForm(true)}>
          + Add Goal
        </button>
      </div>

      {showForm && (
        <div className="popup-form">
          <div className="popup-content">
            <button className="close-btn" onClick={() => setShowForm(false)}>
              x
            </button>
            <h3>Add New Goal</h3>
            <input
              type="text"
              placeholder="Goal Title (e.g. 50g Gold, House Downpayment)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {investmentTypes.map((inv) => (
                <option key={inv} value={inv}>
                  {inv}
                </option>
              ))}
            </select>
            <select value={plan} onChange={(e) => setPlan(e.target.value)}>
              {planTypes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Target Required Amount (₹)"
              value={required}
              onChange={(e) => setRequired(e.target.value)}
            />
            <button onClick={handleAddGoal}>Save Goal</button>
          </div>
        </div>
      )}

      <div className="cards">
        {goals.map((goal) => {
          const progress = Math.min(
            100,
            Math.round((totalBalance / goal.required) * 100)
          );

          return (
            <div key={goal.id} className="goal-card">
              <button
                className="remove-goal"
                onClick={() => removeGoal(goal.id)}
                title="Remove Goal"
              >
                x
              </button>

              <h3>{goal.title}</h3>

              <div className="inv">
                <p>{goal.type}</p>
                •
                <p>{goal.plan}</p>
              </div>

              <div className="progress-bar" style={{ width: "100%", margin: "8px 0" }}>
                <div
                  className="progress"
                  style={{
                    width: `${progress}%`,
                    background:
                      progress >= 100
                        ? "#10b981"
                        : "linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)",
                  }}
                ></div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                  fontSize: "13px",
                  fontWeight: 600,
                  margin: "6px 0 12px",
                }}
              >
                <span>
                  Current: {formatINR(totalBalance)} / Target: {formatINR(goal.required)}
                </span>
                <span style={{ color: progress >= 100 ? "#10b981" : "#4f46e5" }}>
                  {progress}% Funded
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Goals;
