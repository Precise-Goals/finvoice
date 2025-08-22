import React, { useState, useEffect } from "react";
import { getDatabase, ref, push, onValue, remove } from "firebase/database";
import { getAuth } from "firebase/auth";
import { app } from "../firebase";

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
  const [goals, setGoals] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [title, setTitle] = useState("");
  const [type, setType] = useState(investmentTypes[0]);
  const [plan, setPlan] = useState(planTypes[0]);
  const [required, setRequired] = useState("");
  const [showForm, setShowForm] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const db = getDatabase(app);

    // Fetch total balance from DB
    const balanceRef = ref(db, `users/${user.uid}/totalBalance`);
    onValue(balanceRef, (snapshot) => {
      const balance = snapshot.val() || 0;
      setTotalBalance(balance);
    });

    // Fetch goals and auto-remove achieved goals
    const goalsRef = ref(db, `users/${user.uid}/goals`);
    onValue(goalsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const parsedGoals = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));

      // Auto-remove goals that are achieved
      parsedGoals.forEach((goal) => {
        if (totalBalance >= goal.required) {
          remove(ref(db, `users/${user.uid}/goals/${goal.id}`));
        }
      });

      // Update state after removing achieved goals
      setGoals(parsedGoals.filter((goal) => totalBalance < goal.required));
    });
  }, [user, totalBalance]);

  const addGoal = () => {
    if (!title || !required)
      return alert("Please fill title and required amount");
    const db = getDatabase(app);
    const goalsRef = ref(db, `users/${user.uid}/goals`);
    push(goalsRef, {
      title,
      type,
      plan,
      required: parseFloat(required),
    });
    setTitle("");
    setRequired("");
    setType(investmentTypes[0]);
    setPlan(planTypes[0]);
    setShowForm(false);
  };

  const removeGoal = (id) => {
    const db = getDatabase(app);
    remove(ref(db, `users/${user.uid}/goals/${id}`));
  };

  const count = goals.length;

  return (
    <div className="Gotent">
      <div className="goero">
        <h1>
          You have {count} <span>Long term goals</span>
        </h1>
        <p>
          Long-term goals focus on empowering users to achieve financial
          independence through automated and personalized planning
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
              placeholder="Goal Title"
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
              placeholder="Required Amount"
              value={required}
              onChange={(e) => setRequired(e.target.value)}
            />
            <button onClick={addGoal}>Add Goal</button>
          </div>
        </div>
      )}

      <div className="cards">
        {goals.map((goal) => {
          const progress = Math.min((totalBalance / goal.required) * 100, 100);
          return (
            <div key={goal.id} className="goal-card">
              <button
                className="remove-goal"
                onClick={() => removeGoal(goal.id)}
              >
                x
              </button>
              <h3>{goal.title}</h3>
              <div className="inv">
                <p>{goal.type}</p>
                •
                <p>{goal.plan}</p>
              </div>
              <div className="progress-bar">
                <div
                  className="progress"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p>
                ₹ {totalBalance} / ₹ {goal.required}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Goals;
