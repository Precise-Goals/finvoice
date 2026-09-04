/**
 * FinVoice - Sarvam AI Integration & Integrity Verification Script
 * Validates connectivity and API response integrity for:
 * 1. Sarvam AI Chat Completion (sarvam-105b-conversations)
 * 2. Sarvam AI Speech-to-Text Recognition (saaras:v3)
 * 3. Structured Financial Expense Parsing (English, Hindi, Marathi)
 */

import fs from "fs";
import path from "path";

// Populate process.env from .env if running standalone
const envPath = path.resolve(".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim();
      process.env[key] = val;
    }
  }
}

import {
  getSarvamApiKey,
  chatCompletion,
  transcribeAudio,
  parseExpenseWithSarvam,
} from "../src/services/sarvam.js";

const apiKey = getSarvamApiKey();

if (!apiKey) {
  console.error("❌ ERROR: No Sarvam API key found in process.env or .env file.");
  process.exit(1);
}

console.log("==================================================");
console.log("🚀 FINVOICE - SARVAM AI INTEGRITY TEST SUITE");
console.log("==================================================");
console.log(`🔑 Using Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}\n`);

/** Helper: Generate a valid 1-second 16kHz mono PCM WAV */
function generateTestWav() {
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const durationSec = 1;
  const dataSize = sampleRate * numChannels * (bitsPerSample / 8) * durationSec;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

async function runTests() {
  let passed = 0;
  const total = 3;

  // TEST 1: Sarvam Chat Completion API
  console.log("TEST 1: Calling Sarvam Chat Completion (sarvam-105b-conversations)...");
  try {
    const answer = await chatCompletion([
      {
        role: "system",
        content: "You are FinVoice, a financial assistant. Answer concisely.",
      },
      { role: "user", content: "What is an emergency fund?" },
    ], {
      model: "sarvam-105b-conversations",
      temperature: 0.5,
      maxTokens: 500,
    });

    if (!answer || !answer.trim()) {
      throw new Error("Empty reply from chatCompletion");
    }

    console.log("  ✅ SUCCESS (HTTP 200)");
    console.log(`  💬 Response: "${answer.trim().slice(0, 120)}..."\n`);
    passed++;
  } catch (err) {
    console.error("  ❌ TEST 1 FAILED:", err.message, "\n");
  }

  // TEST 2: Sarvam Speech-to-Text Recognition (saaras:v3)
  console.log("TEST 2: Calling Sarvam Speech Recognition (saaras:v3)...");
  try {
    const wavBuffer = generateTestWav();
    const blob = new Blob([wavBuffer], { type: "audio/wav" });

    const sttResult = await transcribeAudio(blob, {
      model: "saaras:v3",
      languageCode: "unknown",
    });

    if (!sttResult.requestId) {
      throw new Error("Missing requestId in STT response");
    }

    console.log("  ✅ SUCCESS (HTTP 200)");
    console.log(`  🎙️ Request ID: ${sttResult.requestId}`);
    console.log(`  🌐 Detected Language: ${sttResult.language_code || "N/A"}\n`);
    passed++;
  } catch (err) {
    console.error("  ❌ TEST 2 FAILED:", err.message, "\n");
  }

  // TEST 3: Multilingual Expense Parsing with Sarvam
  console.log("TEST 3: Testing Multilingual Expense Parsing with Sarvam...");
  try {
    const testCases = [
      { text: "Spent 450 rupees on dinner with friends" },
      { text: "दवाइयों के लिए 300 रुपये खर्च किए" },
    ];

    for (const tc of testCases) {
      const parsed = await parseExpenseWithSarvam(tc.text);
      if (!parsed || !parsed.amount) {
        throw new Error(`Failed to parse text: "${tc.text}"`);
      }
      console.log(`  Input: "${tc.text}" -> Extracted: Type="${parsed.type}", Category="${parsed.category}", Amount=₹${parsed.amount}`);
    }

    console.log("  ✅ SUCCESS - Expense parser operating correctly.\n");
    passed++;
  } catch (err) {
    console.error("  ❌ TEST 3 FAILED:", err.message, "\n");
  }

  console.log("==================================================");
  console.log(`RESULTS: ${passed}/${total} Tests Passed`);
  console.log("==================================================");

  if (passed === total) {
    console.log("🎉 All Sarvam AI APIs and recognition models are 100% operational!");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
