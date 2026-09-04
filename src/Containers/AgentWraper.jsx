import React, { useState, useRef, useEffect, useCallback } from "react";
import { MdKeyboardVoice, MdStop, MdCheckCircle, MdReceiptLong, MdPsychology } from "react-icons/md";
import { getDatabase, ref, push, update } from "firebase/database";
import { app } from "../firebase";
import { useUser } from "../UserContext";
import { transcribeAudio, chatCompletion, parseExpenseWithSarvam, checkSarvamHealth } from "../services/sarvam";
import ReactMarkdown from "react-markdown";

const LANGUAGES = [
  { code: "unknown", name: "Auto-Detect", flag: "🌐" },
  { code: "en-IN", name: "English (India)", flag: "🇮🇳" },
  { code: "hi-IN", name: "Hindi (हिंदी)", flag: "🇮🇳" },
  { code: "mr-IN", name: "Marathi (मराठी)", flag: "🇮🇳" },
];

const AgentWraper = () => {
  const { user } = useUser();
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [parsedExpense, setParsedExpense] = useState(null);
  const [selectedLang, setSelectedLang] = useState("unknown");
  const [detectedLang, setDetectedLang] = useState("");
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [apiStatus, setApiStatus] = useState("checking");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Check Sarvam AI Health on Mount
  useEffect(() => {
    checkSarvamHealth().then((res) => {
      setApiStatus(res.success ? "connected" : "error");
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleProcessText = useCallback(async (spokenText) => {
    if (!spokenText || !spokenText.trim()) return;

    setAnalyzing(true);
    setSavedSuccess(false);
    setResponse("");
    setParsedExpense(null);

    try {
      // 1. Check if the input is an expense or savings transaction
      const expenseData = await parseExpenseWithSarvam(spokenText);

      if (expenseData && expenseData.amount > 0) {
        setParsedExpense(expenseData);

        // Save to Firebase Realtime DB if user is authenticated
        if (user) {
          const db = getDatabase(app);
          const timestamp = new Date().toISOString();
          const newTxRef = push(ref(db, `users/${user.uid}/transactions`));

          await update(newTxRef, {
            amount: expenseData.amount,
            category: expenseData.category || "others",
            type: expenseData.type || "expense",
            description: expenseData.description || spokenText,
            timestamp,
            date: new Date().toLocaleDateString("en-IN"),
            source: "Sarvam AI Voice Agent",
          });
          setSavedSuccess(true);
        }

        setResponse(
          `Logged **₹${expenseData.amount.toLocaleString("en-IN")}** under **${
            expenseData.category || expenseData.type
          }** successfully!`
        );
      } else {
        // 2. Otherwise treat as a financial inquiry and ask Sarvam AI
        const aiAnswer = await chatCompletion([
          {
            role: "system",
            content:
              "You are FinVoice's Voice Financial Advisor powered by Sarvam AI. Provide brief, actionable, and encouraging personal finance advice in 2-3 sentences. Support English, Hindi, and Marathi.",
          },
          { role: "user", content: spokenText },
        ]);
        setResponse(aiAnswer);
      }
    } catch (err) {
      console.error("AI Analysis error:", err);
      setResponse(`Error analyzing request: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  }, [user]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioLevel = () => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              const sum = dataArray.reduce((acc, v) => acc + v, 0);
              setVoiceLevel(Math.min(100, Math.round((sum / dataArray.length / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(updateAudioLevel);
            }
          };
          updateAudioLevel();
        }
      } catch (e) {
        console.warn("AudioContext visualizer skipped:", e);
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        if (audioBlob.size > 0) {
          setTranscribing(true);
          try {
            const sttResult = await transcribeAudio(audioBlob, {
              languageCode: selectedLang,
              model: "saaras:v3",
            });

            if (sttResult.transcript) {
              setTranscript(sttResult.transcript);
              setDetectedLang(sttResult.language_code || selectedLang);
              await handleProcessText(sttResult.transcript);
            } else {
              setTranscript("No clear speech detected. Please try again.");
            }
          } catch (sttErr) {
            console.error("Sarvam STT failed:", sttErr);
            setTranscript(`Recognition error: ${sttErr.message}`);
          } finally {
            setTranscribing(false);
          }
        }
      };

      mediaRecorder.start();
      setRecording(true);
      setTranscript("Listening... Speak an expense (e.g., 'Spent 500 on dinner') or financial question");
    } catch (err) {
      console.error("Mic access error:", err);
      alert("Microphone permission is required to use Sarvam Voice Recognition.");
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    setVoiceLevel(0);
  };

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "2rem auto",
        padding: "24px",
        borderRadius: "24px",
        background: "linear-gradient(180deg, #181c2e 0%, #0f121d 100%)",
        color: "#fff",
        boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          paddingBottom: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>
            FinVoice Sarvam AI Agent
          </h2>
          <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: "13px" }}>
            Real-time Indian language speech recognition (Saaras) & Financial Reasoning
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor:
                apiStatus === "connected"
                  ? "#10b981"
                  : apiStatus === "error"
                  ? "#ef4444"
                  : "#f59e0b",
            }}
          />
          <span style={{ fontSize: "12px", color: "#d1d5db" }}>
            {apiStatus === "connected"
              ? "Sarvam AI Active"
              : apiStatus === "error"
              ? "Check API Key"
              : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Language Selector Bar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "24px",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "13px", color: "#9ca3af", marginRight: "4px" }}>
          Recognition Language:
        </span>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setSelectedLang(lang.code)}
            style={{
              background:
                selectedLang === lang.code
                  ? "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)"
                  : "rgba(255,255,255,0.05)",
              color: selectedLang === lang.code ? "#fff" : "#cbd5e1",
              border:
                selectedLang === lang.code
                  ? "1px solid #818cf8"
                  : "1px solid rgba(255,255,255,0.1)",
              borderRadius: "20px",
              padding: "6px 14px",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: selectedLang === lang.code ? 600 : 400,
              transition: "all 0.2s ease",
            }}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>

      {/* Central Microphone Pulse Hub */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 1rem",
        }}
      >
        <div style={{ position: "relative" }}>
          {/* Animated Glow Wave */}
          {recording && (
            <div
              style={{
                position: "absolute",
                inset: `-${15 + voiceLevel * 0.4}px`,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0) 70%)",
                animation: "pulse 1.2s infinite",
              }}
            />
          )}

          <button
            onClick={recording ? stopRecording : startRecording}
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: recording
                ? "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)"
                : transcribing || analyzing
                ? "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)"
                : "linear-gradient(135deg, #4f46e5 0%, #312e81 100%)",
              border: "none",
              color: "#fff",
              fontSize: "3rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: recording
                ? "0 0 35px rgba(239, 68, 68, 0.7)"
                : "0 10px 30px rgba(79, 70, 229, 0.5)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            title={recording ? "Click to Stop and Transcribe" : "Click to Speak"}
          >
            {recording ? <MdStop /> : <MdKeyboardVoice />}
          </button>
        </div>

        <p
          style={{
            marginTop: "20px",
            fontSize: "14px",
            color: recording ? "#ef4444" : "#9ca3af",
            fontWeight: 600,
          }}
        >
          {recording
            ? `Listening... (Level: ${voiceLevel}%) - Click to Finish`
            : transcribing
            ? "Transcribing audio with Sarvam Saaras..."
            : analyzing
            ? "Sarvam AI is analyzing..."
            : "Tap the microphone to speak an expense or ask a financial question"}
        </p>
      </div>

      {/* Transcript Card */}
      {transcript && (
        <div
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            borderRadius: "16px",
            padding: "16px 20px",
            marginBottom: "16px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#818cf8",
                textTransform: "uppercase",
              }}
            >
              Sarvam AI Speech-to-Text Transcript
            </span>
            {detectedLang && (
              <span
                style={{
                  fontSize: "11px",
                  background: "rgba(99, 102, 241, 0.2)",
                  color: "#a5b4fc",
                  padding: "2px 8px",
                  borderRadius: "10px",
                }}
              >
                Lang: {detectedLang}
              </span>
            )}
          </div>
          <div style={{ fontSize: "16px", lineHeight: "1.5" }}>"{transcript}"</div>
        </div>
      )}

      {/* Parsed Expense Badge if applicable */}
      {parsedExpense && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "16px",
            padding: "16px 20px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <MdReceiptLong style={{ fontSize: "2rem", color: "#10b981" }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: "16px" }}>
                ₹{parsedExpense.amount.toLocaleString("en-IN")}{" "}
                <span style={{ fontSize: "12px", color: "#9ca3af", textTransform: "capitalize" }}>
                  ({parsedExpense.type} • {parsedExpense.category || "General"})
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#d1d5db" }}>
                {parsedExpense.description}
              </div>
            </div>
          </div>
          {savedSuccess && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10b981", fontSize: "13px" }}>
              <MdCheckCircle /> Saved to Database
            </div>
          )}
        </div>
      )}

      {/* Sarvam AI Response / Advice */}
      {response && (
        <div
          style={{
            background: "rgba(99, 102, 241, 0.08)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            borderRadius: "16px",
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <MdPsychology style={{ color: "#818cf8", fontSize: "1.2rem" }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#818cf8", textTransform: "uppercase" }}>
              Sarvam AI Financial Intelligence
            </span>
          </div>
          <div style={{ fontSize: "15px", lineHeight: "1.6", color: "#f3f4f6" }}>
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentWraper;
