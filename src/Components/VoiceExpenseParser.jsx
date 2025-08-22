// src/components/VoiceExpenseParser.jsx
import React, { useEffect } from "react";
import { getDatabase, ref, push } from "firebase/database";
import { useUser } from "../UserContext";

const foodKeywords = [
  "food",
  "restaurant",
  "meal",
  "snack",
  "coffee",
  "pizza",
  "burger",
  "chai",
  "tea",
  "breakfast",
  "lunch",
  "dinner",
  "biryani",
  "thali",
  "samosa",
  "paratha",
  "paneer",
  "dal",
  "roti",
  "naan",
  "chapati",
  "pasta",
  "noodles",
  "momos",
  "juice",
  "shake",
  "icecream",
  "dessert",
  "fastfood",
  "cafeteria",
  "canteen",
  "khaana",
  "khana",
  "tiffin",
  "sandwich",
  "hotdog",
  "fries",
  "pizza slice",
  "chocolate",
  "cookies",
  "cake",
  "dosa",
  "idli",
  "vada",
  "pakora",
  "omelette",
  "salad",
  "milkshake",
  "latte",
  "cappuccino",
  "tea shop",
  "coffee shop",
  "food court",
  "tandoori",
  "masala",
  "butter naan",
  "khichdi",
  "pav bhaji",
  "chole bhature",
  "golgappa",
  "pani puri",
  "chaat",
  "maggie",
  "kebab",
  "shawarma",
  "pancake",
  "waffle",
  "soup",
  "pudding",
  "sushi",
  "ramen",
  "dim sum",
  "fried rice",
  "manchurian",
];

const educationKeywords = [
  "tuition",
  "books",
  "course",
  "education",
  "school",
  "college",
  "university",
  "class",
  "lecture",
  "assignment",
  "exam",
  "test",
  "homework",
  "study",
  "notes",
  "curriculum",
  "syllabus",
  "coaching",
  "tutorial",
  "training",
  "lab",
  "library",
  "project",
  "research",
  "paper",
  "degree",
  "diploma",
  "certificate",
  "scholarship",
  "internship",
  "mentor",
  "professor",
  "teacher",
  "faculty",
  "admission",
];

const medicalKeywords = [
  "medical",
  "doctor",
  "hospital",
  "clinic",
  "medicine",
  "health",
  "pharma",
  "pharmacy",
  "lab",
  "diagnosis",
  "treatment",
  "surgery",
  "operation",
  "injection",
  "vaccine",
  "immunization",
  "consultation",
  "checkup",
  "x-ray",
  "mri",
  "scan",
  "ultrasound",
  "blood test",
  "prescription",
  "pill",
  "tablet",
  "capsule",
  "ointment",
  "cream",
  "syrup",
  "drops",
  "antibiotic",
  "painkiller",
  "vitamin",
  "supplement",
  "physiotherapy",
  "rehabilitation",
  "therapy",
  "nursing",
  "emergency",
  "icu",
  "ambulance",
];

const VoiceExpenseParser = ({ voiceText, setExpenses }) => {
  const { user } = useUser();
  const db = getDatabase();

  useEffect(() => {
    if (!voiceText || !user?.uid) return;

    const categorizeExpense = (text) => {
      const lower = text.toLowerCase();
      if (foodKeywords.some((kw) => lower.includes(kw))) return "Food";
      if (educationKeywords.some((kw) => lower.includes(kw)))
        return "Education";
      if (medicalKeywords.some((kw) => lower.includes(kw))) return "Medical";
      return "Other";
    };

    const parseExpenses = (text) => {
      const amounts = text.match(/\d+(\.\d+)?/g)?.map(Number) || [];
      const sentences = text.split(/and|,|;/);

      const parsed = amounts.map((amt, i) => ({
        amount: amt,
        category: categorizeExpense(sentences[i] || text),
        description: sentences[i]?.trim() || text,
        timestamp: Date.now(),
      }));

      setExpenses(parsed);

      // append to Firebase
      const userTransRef = ref(db, `users/${user.uid}/transac`);
      parsed.forEach((item) => {
        push(userTransRef, item).catch((err) =>
          console.error("Error saving transaction:", err)
        );
      });
    };

    parseExpenses(voiceText);
  }, [voiceText, setExpenses, user, db]);

  return null;
};

export default VoiceExpenseParser;
