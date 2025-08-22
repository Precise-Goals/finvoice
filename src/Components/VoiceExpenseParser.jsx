import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  getFirestore,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { app } from "../firebase";

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
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${
          import.meta.env.VITE_GEMINI_API_KEY
        }`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an expense parser. Extract category (food, medical, education, others) and amount from this text: "${command}". 
Return JSON like: {"category":"food","amount":1200}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      const parsed = JSON.parse(
        data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
      );

      if (!parsed.category || !parsed.amount) return;

      const category = parsed.category.toLowerCase();

      // Ensure amount is numeric, remove commas/currency symbols
      let rawAmount = String(parsed.amount).trim();
      rawAmount = rawAmount.replace(/[^\d.]/g, "");
      const amount = parseFloat(rawAmount);

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
      const userRef = doc(db, "expenses", "user123"); // replace with actual user ID
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
      console.error("AI parsing failed:", err);
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
      <h2>Expense Summary</h2>
      <p>Food: ₹{expenses.food}</p>
      <p>Medical: ₹{expenses.medical}</p>
      <p>Education: ₹{expenses.education}</p>
      <p>Others: ₹{expenses.others}</p>
    </div>
  );
};

export default VoiceExpenseParser;
