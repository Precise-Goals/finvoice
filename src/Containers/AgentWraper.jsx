import React, { useState, useRef, useEffect, useCallback } from "react";
import { MdKeyboardVoice, MdStop, MdCheckCircle, MdReceiptLong, MdPsychology, MdAutoAwesome } from "react-icons/md";
import { transcribeAudio, parseExpenseWithSarvam, checkSarvamHealth } from "../services/sarvam";
import { useFinancialData } from "../context/FinancialDataContext";
import { askFinVoiceAssistant, formatINR } from "../services/ragService";
import ReactMarkdown from "react-markdown";

const AgentWraper = () => {
  const financialData = useFinancialData();
  const { totalBalance, userProfile, processTransaction } = financialData;

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [parsedExpense, setParsedExpense] = useState(null);
  const [detectedLang, setDetectedLang] = useState("");
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [apiStatus, setApiStatus] = useState("checking");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [micStatus, setMicStatus] = useState("idle"); // 'idle' | 'listening' | 'speaking' | 'pausing' | 'processing'

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const hasSpokenRef = useRef(false);
  const isStoppingRef = useRef(false);

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

        // Process transaction into state and Firebase
        await processTransaction(
          expenseData,
          spokenText,
          detectedLang || "en"
        );
        setSavedSuccess(true);

        const isPositive =
          expenseData.type === "income" ||
          expenseData.type === "savings" ||
          expenseData.direction === "inflow";
        const actionWord =
          expenseData.type === "income"
            ? "Credited"
            : expenseData.type === "savings"
            ? "Saved"
            : "Logged";
        const newEstimatedBalance =
          totalBalance + (isPositive ? expenseData.amount : -expenseData.amount);

        setResponse(
          `${actionWord} **₹${expenseData.amount.toLocaleString("en-IN")}** ${
            expenseData.type === "income"
              ? "as **Income**"
              : `under **${expenseData.category || expenseData.type}**`
          } successfully! Total balance is now **${formatINR(newEstimatedBalance)}**.`
        );
      } else {
        // 2. Otherwise treat as a financial inquiry and ask Sarvam AI with live RAG context
        const ragResult = await askFinVoiceAssistant({
          query: spokenText,
          history: [],
          financialData,
          userProfile,
          languageCode: "unknown",
        });
        setResponse(ragResult.reply);
      }
    } catch (err) {
      console.error("AI Analysis error:", err);
      setResponse(`Error analyzing request: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  }, [financialData, userProfile, totalBalance, detectedLang, processTransaction]);  // Push-To-Talk (PTT) references & duration counter
  const isHoldingRef = useRef(false);
  const pressStartTimeRef = useRef(0);
  const durationTimerRef = useRef(null);
  const [recordDuration, setRecordDuration] = useState(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const stopRecording = useCallback(() => {
    isHoldingRef.current = false;
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("MediaRecorder stop error:", e);
      }
    }
    setRecording(false);

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setVoiceLevel(0);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      isStoppingRef.current = false;
      isHoldingRef.current = true;
      pressStartTimeRef.current = Date.now();
      setRecordDuration(0);
      audioChunksRef.current = [];
      hasSpokenRef.current = false;
      setMicStatus("listening");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // If user released pointer before getUserMedia resolved
      if (!isHoldingRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 128;
          analyser.smoothingTimeConstant = 0.3;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const SPEECH_THRESHOLD = 8;

          const updateAudioLevel = () => {
            if (!analyserRef.current || isStoppingRef.current) return;

            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const currentLevel = Math.min(100, Math.round((average / 128) * 100));
            setVoiceLevel(currentLevel);

            if (currentLevel >= SPEECH_THRESHOLD) {
              hasSpokenRef.current = true;
              setMicStatus("speaking");
            }

            animFrameRef.current = requestAnimationFrame(updateAudioLevel);
          };
          animFrameRef.current = requestAnimationFrame(updateAudioLevel);
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
        const durationMs = Date.now() - pressStartTimeRef.current;

        // Accidental tap protection
        if (durationMs < 350) {
          setTranscript("Hold the big mic to speak, release when finished!");
          setRecording(false);
          setMicStatus("idle");
          return;
        }

        if (audioBlob.size > 500) {
          setTranscribing(true);
          setMicStatus("processing");
          try {
            const sttResult = await transcribeAudio(audioBlob, {
              languageCode: "unknown",
              model: "saaras:v3",
            });

            if (sttResult.transcript && sttResult.transcript.trim()) {
              setTranscript(sttResult.transcript);
              setDetectedLang(sttResult.language_code || "Auto");
              await handleProcessText(sttResult.transcript);
            } else {
              setTranscript("No clear speech detected. Please hold and speak clearly.");
            }
          } catch (sttErr) {
            console.error("Sarvam STT failed:", sttErr);
            setTranscript(`Recognition error: ${sttErr.message}`);
          } finally {
            setTranscribing(false);
            setMicStatus("idle");
          }
        } else {
          setTranscript("Audio too short. Please hold the mic and speak clearly.");
          setMicStatus("idle");
        }
      };

      mediaRecorder.start();
      setRecording(true);
      setTranscript("Listening... Keep holding and speak in any Indian language");

      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      durationTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    } catch (err) {
      console.error("Mic access error:", err);
      alert("Microphone permission is required to use Sarvam Voice Recognition.");
      isHoldingRef.current = false;
      setRecording(false);
      setMicStatus("idle");
    }
  }, [handleProcessText]);

  // Pointer event handlers for Push-To-Talk
  const handlePointerDown = (e) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      console.debug("Pointer capture fallback:", err);
    }
    startRecording();
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      console.debug("Pointer release fallback:", err);
    }
    stopRecording();
  };

  const handlePointerCancel = () => {
    stopRecording();
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
            FinVoice Smart Voice Agent
          </h2>
          <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: "13px" }}>
            Real-time multi-Indic speech recognition with Push-To-Talk
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: apiStatus === "connected" ? "#10b981" : "#ef4444",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "12px",
              color: apiStatus === "connected" ? "#10b981" : "#ef4444",
              fontWeight: 600,
            }}
          >
            {apiStatus === "connected" ? "Sarvam Saaras Connected" : "API Offline"}
          </span>
        </div>
      </div>

      {/* Central Smart Microphone Pulse Hub */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2.5rem 1rem",
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
                background:
                  micStatus === "speaking"
                    ? "radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, rgba(16, 185, 129, 0) 70%)"
                    : "radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0) 70%)",
                animation: "pulse 1.2s infinite",
              }}
            />
          )}

          <button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && !recording) {
                e.preventDefault();
                startRecording();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                stopRecording();
              }
            }}
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: recording
                ? micStatus === "speaking"
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)"
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
              userSelect: "none",
              touchAction: "none",
              WebkitUserSelect: "none",
              boxShadow: recording
                ? micStatus === "speaking"
                  ? "0 0 35px rgba(16, 185, 129, 0.8)"
                  : "0 0 35px rgba(239, 68, 68, 0.7)"
                : "0 10px 30px rgba(79, 70, 229, 0.5)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            title={
              recording
                ? "Push to Talk: Recording... Release when finished speaking"
                : "Push to Talk: Press & hold to speak, release to process"
            }
          >
            {recording ? <MdStop /> : <MdKeyboardVoice />}
          </button>
        </div>

        <p
          style={{
            marginTop: "20px",
            fontSize: "14px",
            color:
              recording
                ? micStatus === "speaking"
                  ? "#10b981"
                  : "#ef4444"
                : transcribing || analyzing
                ? "#f59e0b"
                : "#9ca3af",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {recording
            ? `🔴 Recording (${recordDuration}s) • Keep holding and speak, release to process`
            : transcribing
            ? "⏳ Transcribing audio with Sarvam Saaras..."
            : analyzing
            ? "⚡ Sarvam AI RAG is analyzing your financials..."
            : "🎙️ Push to Talk: Press & hold the big mic to speak, release to process"}
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
              <MdCheckCircle /> Saved & Synced with Dashboard
            </div>
          )}
        </div>
      )}

      {/* Sarvam AI Response / RAG Grounded Advice */}
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
            <span
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                color: "#10b981",
              }}
            >
              <MdAutoAwesome /> Verified Ground Truth
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
