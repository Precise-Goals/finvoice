import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  getFirestore,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { app } from "../firebase";
import { parseExpenseWithSarvam } from "../services/sarvam";

const db = getFirestore(app);

const VoiceExpenseParser = ({ transcript }) => {
  const [expenses, setExpenses] = useState({
    food: 0,
    medical: 0,
    education: 0,
    others: 0,
  });

  // keep track of last processed transcript
  const lastTranscriptRef = useRef("");

  const handleVoiceCommand = useCallback(async (command) => {
    if (!command) return;

    try {
      // Use Sarvam AI to parse expense category and amount
      const parsed = await parseExpenseWithSarvam(command);

      if (!parsed || !parsed.category || !parsed.amount) return;

      const category = parsed.category.toLowerCase();
      const amount = parsed.amount;

      if (isNaN(amount) || amount <= 0) {
        console.warn("Invalid amount received:", parsed.amount);
        return;
      }
      if (amount > 1_000_000) {
        console.warn("Rejected suspiciously large amount:", amount);
        return;
      }

      // Update local state
      setExpenses((prev) => ({
        ...prev,
        [category]: (prev[category] || 0) + amount,
      }));

      // Update Firestore
      const userRef = doc(db, "expenses", "user123");
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        await updateDoc(userRef, {
          [category]: (snap.data()[category] || 0) + amount,
        });
      } else {
        await setDoc(userRef, {
          food: 0,
          medical: 0,
          education: 0,
          others: 0,
          [category]: amount,
        });
      }
    } catch (err) {
      console.error("Sarvam AI parsing failed:", err);
    }
  }, []);

  useEffect(() => {
    if (transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript; // save latest processed
      handleVoiceCommand(transcript);
    }
  }, [transcript, handleVoiceCommand]);

  return (
    <div>
      <h2>Expense Summary (Powered by Sarvam AI)</h2>
      <p>Food: ₹{expenses.food}</p>
      <p>Medical: ₹{expenses.medical}</p>
      <p>Education: ₹{expenses.education}</p>
      <p>Others: ₹{expenses.others}</p>
    </div>
  );
};

export default VoiceExpenseParser;
