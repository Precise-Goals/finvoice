/**
 * Sarvam AI Service for FinVoice
 * Provides Speech-to-Text Recognition and Conversational LLM capabilities
 */

const SARVAM_BASE_URL = "https://api.sarvam.ai";

/**
 * Retrieve the active Sarvam AI API Key from environment variables
 */
export const getSarvamApiKey = () => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const key =
      import.meta.env.VITE_SARVAM_API_KEY || import.meta.env.SARVAM_API_KEY;
    if (key) return key;
  }
  const nodeEnv = globalThis.process?.env;
  if (nodeEnv) {
    const key = nodeEnv.VITE_SARVAM_API_KEY || nodeEnv.SARVAM_API_KEY;
    if (key) return key;
  }
  return "";
};

/**
 * Transcribe an audio Blob using Sarvam AI Saaras model recognition
 * @param {Blob} audioBlob - Audio recording blob (webm, wav, mp3, etc.)
 * @param {Object} options - { languageCode: string, model: string, mode: string }
 * @returns {Promise<{ transcript: string, language_code: string, requestId: string }>}
 */
export const transcribeAudio = async (audioBlob, options = {}) => {
  const apiKey = getSarvamApiKey();
  if (!apiKey) {
    throw new Error(
      "Sarvam API Key is missing. Please set VITE_SARVAM_API_KEY in your .env file."
    );
  }

  const {
    languageCode = "unknown",
    model = "saaras:v3",
    mode = "transcribe",
  } = options;

  const formData = new FormData();
  const filename =
    audioBlob.name ||
    (audioBlob.type?.includes("wav") ? "speech.wav" : "speech.webm");

  formData.append("file", audioBlob, filename);
  formData.append("model", model);
  formData.append("mode", mode);

  if (languageCode && languageCode !== "unknown") {
    formData.append("language_code", languageCode);
  }

  const response = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message =
      errorJson?.error?.message ||
      errorJson?.detail ||
      `Speech-to-text request failed with status ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  return {
    transcript: (data.transcript || "").trim(),
    language_code: data.language_code || languageCode,
    requestId: data.request_id || "",
    language_probability: data.language_probability,
  };
};

/**
 * Call Sarvam AI Chat Completion API
 * @param {Array<{ role: string, content: string }>} messages
 * @param {Object} options - { model: string, temperature: number, maxTokens: number }
 * @returns {Promise<string>} Model response text
 */
export const chatCompletion = async (messages, options = {}) => {
  const apiKey = getSarvamApiKey();
  if (!apiKey) {
    throw new Error(
      "Sarvam API Key is missing. Please set VITE_SARVAM_API_KEY in your .env file."
    );
  }

  const {
    model = "sarvam-105b-conversations",
    temperature = 0.7,
    maxTokens = 2048,
  } = options;

  const response = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message =
      errorJson?.error?.message ||
      errorJson?.detail ||
      `Chat completion request failed with status ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
};

import { resolveIntent } from "./intentResolver.js";

/**
 * Parse a transaction command or voice transcript into structured financial data
 * Supports English, Hindi, and Marathi commands.
 * Handles income, savings, categorized expenses, and general spending.
 * @param {string} text - User command or voice transcript
 * @returns {Promise<{ type: string, direction: string, category: string|null, amount: number, description: string, confidence: number }>}
 */
export const parseExpenseWithSarvam = async (text) => {
  if (!text || !text.trim()) {
    return null;
  }

  // Pre-resolution heuristic check
  const localResolution = resolveIntent(text);

  const systemPrompt = `You are FinVoice, an expert financial transaction parser for Indian and global users.
Extract transaction details from the given text (English, Hindi, or Marathi).
Respond with ONLY a raw, valid JSON object and nothing else. Do NOT include markdown formatting or backticks.

JSON Schema:
{
  "type": "income" | "savings" | "expense" | "spending",
  "direction": "inflow" | "outflow",
  "category": "food" | "medical" | "education" | "shopping" | "travel" | "utilities" | "others" | null,
  "amount": number,
  "description": string
}

Rules:
1. "type" and "direction":
   - "income" / "inflow": Money received, earned, credited, salary, bonus, freelance, profit, cash inflow (e.g. earned, salary, received, credited, bonus, कमाए, कमाया, मिले, पगार, जमा हुए). Category must be null.
   - "savings" / "inflow": Money saved, deposited into bank, invested, SIP (e.g. saved, deposit, mutual fund, बचत, सेव्ह, निवेश). Category must be null.
   - "expense" / "outflow": Money spent on specific categories (food, medical, education, travel, shopping, utilities).
   - "spending" / "outflow": General money spent or purchase without specific category. Category must be null.
2. "category":
   - "food" for groceries, lunch, dinner, cafe, खाना, भोजन, जेवण.
   - "medical" for doctor, medicine, pharmacy, दवा, अस्पताल, औषध.
   - "education" for books, tuition, fees, school, college, पढ़ाई, पुस्तक.
   - "travel" for cab, petrol, fuel, auto, bus, train, ticket, पेट्रोल, प्रवास.
   - "shopping" for clothes, shoes, gadgets, amazon, flipkart, कपड़े, खरेदी.
   - "utilities" for electricity, bills, recharge, rent, wifi, बिजली.
   - null for income, savings, or generic spending.
3. "amount": Extracted numeric amount as a positive integer in Indian Rupees (INR).
   - Handle Indian numbering: "1 lakh" = 100000, "10 lakh" = 1000000, "1 crore" = 10000000, "50k" = 50000.
4. Examples:
   - "Earned 10 lakh" -> {"type": "income", "direction": "inflow", "category": null, "amount": 1000000, "description": "Earned 10 lakh"}
   - "Got 50000 salary" -> {"type": "income", "direction": "inflow", "category": null, "amount": 50000, "description": "Salary credited"}
   - "Saved 5000" -> {"type": "savings", "direction": "inflow", "category": null, "amount": 5000, "description": "Saved 5000"}
   - "Spent 450 on dinner" -> {"type": "expense", "direction": "outflow", "category": "food", "amount": 450, "description": "Dinner"}`;

  try {
    const rawReply = await chatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ], {
      model: "sarvam-105b-conversations",
      temperature: 0.1,
    });

    // Clean JSON response (strip markdown fences if present)
    const cleanedJson = rawReply
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanedJson);

    if (parsed && typeof parsed.amount === "number" && parsed.amount > 0) {
      let finalType = parsed.type || "expense";
      let finalDirection = parsed.direction || (finalType === "income" || finalType === "savings" ? "inflow" : "outflow");

      // Apply heuristic safeguard: If user explicitly mentioned earning/income/salary, enforce income
      if (localResolution.intent === "income") {
        finalType = "income";
        finalDirection = "inflow";
      } else if (localResolution.intent === "savings") {
        finalType = "savings";
        finalDirection = "inflow";
      }

      // Check numeric amount sanity against regex extractor (e.g. 10 lakh)
      let finalAmount = Math.abs(parsed.amount);
      if (localResolution.amount && localResolution.amount > finalAmount) {
        finalAmount = localResolution.amount;
      }

      return {
        type: finalType,
        direction: finalDirection,
        category: finalType === "income" || finalType === "savings" ? null : (parsed.category || "others"),
        amount: finalAmount,
        description: parsed.description || text.trim(),
        confidence: 0.98,
      };
    }
  } catch (error) {
    console.warn("Sarvam AI expense parsing fallback triggered:", error);
  }

  // Fallback to deterministic Intent Resolver
  if (localResolution && localResolution.isTransaction && localResolution.amount > 0) {
    return {
      type: localResolution.type,
      direction: localResolution.direction,
      category: localResolution.category,
      amount: localResolution.amount,
      description: localResolution.description || text.trim(),
      confidence: localResolution.confidence,
    };
  }

  return null;
};

/**
 * Health check to verify Sarvam API connectivity and key validity
 */
export const checkSarvamHealth = async () => {
  try {
    const reply = await chatCompletion(
      [{ role: "user", content: "ping" }],
      { maxTokens: 10 }
    );
    return { success: true, message: reply };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
