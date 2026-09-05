import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  limitToLast,
  serverTimestamp,
} from "firebase/firestore";
import {
  MdKeyboardVoice,
  MdSend,
  MdAutoAwesome,
  MdFlag,
  MdAccountBalanceWallet,
} from "react-icons/md";
import { app } from "../firebase";
import { useUser } from "../UserContext";
import { useFinancialData } from "../context/FinancialDataContext";
import ReactMarkdown from "react-markdown";
import { transcribeAudio } from "../services/sarvam";
import { askFinVoiceAssistant, formatINR } from "../services/ragService";

const Chat = () => {
  const { user } = useUser();
  const financialData = useFinancialData();
  const { totalBalance = 0, goals = [], userProfile = {} } = financialData;

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Push-To-Talk (PTT) Voice States
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [pttHint, setPttHint] = useState("");

  const db = getFirestore(app);
  const messagesEndRef = useRef(null);

  // PTT audio recording references
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const isHoldingRef = useRef(false);
  const pressStartTimeRef = useRef(0);
  const durationTimerRef = useRef(null);
  const hintTimeoutRef = useRef(null);

  // Listen to Firestore chat history
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "chats", user.uid, "threads"),
      orderBy("createdAt", "asc"),
      limitToLast(50)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => doc.data()));
    });
    return () => unsub();
  }, [user, db]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Clean up timers and audio on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Show a temporary user-friendly PTT hint
  const triggerHint = (msg) => {
    setPttHint(msg);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => {
      setPttHint("");
    }, 3500);
  };

  // Send message using live RAG engine
  const executeSendMessage = useCallback(
    async (text) => {
      const queryToSend = (text || "").trim();
      if (!queryToSend || !user || loading) return;

      setLoading(true);
      setInput("");

      // 1. Save user message to Firestore
      const userMsg = {
        sender: "user",
        text: queryToSend,
        createdAt: serverTimestamp(),
      };
      try {
        await addDoc(collection(db, "chats", user.uid, "threads"), userMsg);
      } catch (err) {
        console.error("Failed to save user chat to Firestore:", err);
      }

      let botText =
        "Sorry, I couldn't process your request. Please ask about finances.";
      let sourcesUsed = [];
      let detectedIntent = "GENERAL_ADVISORY";

      try {
        // 2. Call RAG Assistant with live Dashboard, Transactions & Goals
        const ragResult = await askFinVoiceAssistant({
          query: queryToSend,
          history: messages.slice(-8),
          financialData,
          userProfile,
          languageCode: "unknown",
        });

        if (ragResult?.reply) {
          botText = ragResult.reply.trim();
          sourcesUsed = ragResult.sourcesUsed || [];
          detectedIntent = ragResult.intent || "GENERAL_ADVISORY";
        }
      } catch (error) {
        console.error("RAG Chat error:", error);
        botText = `⚠️ FinVoice AI service temporary error: ${
          error.message || "Please try again shortly."
        }`;
      }

      // 3. Save grounded bot message to Firestore
      try {
        await addDoc(collection(db, "chats", user.uid, "threads"), {
          sender: "bot",
          text: botText,
          sourcesUsed,
          intent: detectedIntent,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to save bot response to Firestore:", err);
      }

      setLoading(false);
    },
    [user, loading, db, messages, financialData, userProfile]
  );

  const handleFormSubmit = (e) => {
    e?.preventDefault();
    executeSendMessage(input);
  };

  // -------------------------------------------------------------
  // Push-To-Talk (PTT) Engine: Hold to Speak, Release to Send
  // -------------------------------------------------------------

  const startPttRecording = async () => {
    if (loading || isTranscribing) return;

    try {
      isHoldingRef.current = true;
      pressStartTimeRef.current = Date.now();
      audioChunksRef.current = [];
      setRecordDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // If user already released before getUserMedia resolved
      if (!isHoldingRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const durationMs = Date.now() - pressStartTimeRef.current;

        // If held for less than 350ms, treat as accidental click/tap
        if (durationMs < 350) {
          triggerHint("Hold the mic button to speak, release to send!");
          setIsRecording(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        if (audioBlob.size > 500) {
          setIsTranscribing(true);
          try {
            const res = await transcribeAudio(audioBlob, {
              languageCode: "unknown",
              model: "saaras:v3",
            });

            if (res.transcript && res.transcript.trim()) {
              const transcribedText = res.transcript.trim();
              setInput(transcribedText);
              // Directly submit transcribed voice query to RAG assistant
              await executeSendMessage(transcribedText);
            } else {
              triggerHint("Couldn't hear clearly. Please hold and speak again.");
            }
          } catch (sttErr) {
            console.error("PTT STT Error:", sttErr);
            triggerHint("Transcription failed. Please check microphone.");
          } finally {
            setIsTranscribing(false);
          }
        } else {
          triggerHint("Audio too short. Hold and speak clearly.");
        }

        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Duration counter
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      durationTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    } catch (err) {
      console.error("Microphone access error:", err);
      isHoldingRef.current = false;
      setIsRecording(false);
      triggerHint("Microphone permission needed for Push-To-Talk.");
    }
  };

  const stopPttRecording = () => {
    isHoldingRef.current = false;
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("PTT stop error:", e);
      }
    } else {
      setIsRecording(false);
    }
  };

  // Pointer event handlers for Push-To-Talk
  const handlePointerDown = (e) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      console.debug("Pointer capture fallback:", err);
    }
    startPttRecording();
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
    stopPttRecording();
  };

  const handlePointerCancel = () => {
    stopPttRecording();
  };

  // Quick suggestion chips based on real user data
  const suggestionChips = [
    {
      label: "meri medical emergency kitne ki hai ??",
      icon: <MdFlag />,
    },
    {
      label: "Mera total balance aur financial health kya hai?",
      icon: <MdAccountBalanceWallet />,
    },
    {
      label: "Mere active goals ka kya status hai?",
      icon: <MdAutoAwesome />,
    },
    {
      label: "Mera sabse bada kharcha kis category me hai?",
      icon: <MdFlag />,
    },
  ];

  return (
    <div
      className="chatcont"
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "16px 16px 24px 16px",
      }}
    >
      {/* Title & Live RAG Grounding Indicator */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          marginBottom: 14,
        }}
      >
        <div
          className="finchat"
          style={{
            fontWeight: 900,
            fontSize: 24,
            letterSpacing: "-0.02em",
            color: "#1e1b4b",
          }}
        >
          FINVOICE AI CHAT
        </div>

        {/* Live RAG Status Badge */}
        <div className="rag-header-badge" title="RAG connected to live Firebase database">
          <span className="rag-pulse-dot" />
          <span>
            Live RAG Connected • <strong>{formatINR(totalBalance)}</strong> Balance •{" "}
            <strong>{goals.length}</strong> Goals Tracked
          </span>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          width: "100%",
          padding: "4px 2px 10px 2px",
          scrollbarWidth: "none",
        }}
      >
        {/* {suggestionChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            className="rag-suggestion-chip"
            onClick={() => executeSendMessage(chip.label)}
            disabled={loading || isRecording}
          >
            {chip.icon}
            <span>{chip.label}</span>
          </button>
        ))} */}
      </div>

      {/* Chat Messages Stream */}
      <div
        style={{
          width: "100%",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "1.75rem",
          padding: 20,
          minHeight: 360,
          maxHeight: "34rem",
          overflowY: "auto",
          marginBottom: 12,
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.02)",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#64748b",
              padding: "40px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#e0e7ff",
                color: "#4f46e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              <MdAutoAwesome />
            </div>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 16 }}>
              FinVoice RAG Assistant is Ready
            </div>
            <div style={{ fontSize: 13.5, maxWidth: 420, lineHeight: 1.5 }}>
              Ask anything about your live balance, medical emergency funds,
              spending categories, or milestone targets in English or Indic languages!
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              textAlign: msg.sender === "user" ? "right" : "left",
              margin: "14px 0",
            }}
          >
            <div
              style={{
                display: "inline-block",
                background:
                  msg.sender === "user"
                    ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                    : "#ffffff",
                color: msg.sender === "user" ? "#ffffff" : "#1e293b",
                border:
                  msg.sender === "user" ? "none" : "1px solid #e2e8f0",
                boxShadow:
                  msg.sender === "user"
                    ? "0 4px 12px rgba(99, 102, 241, 0.25)"
                    : "0 2px 8px rgba(0, 0, 0, 0.04)",
                borderRadius:
                  msg.sender === "user"
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                padding: "10px 18px",
                maxWidth: "88%",
                lineHeight: 1.6,
                wordBreak: "break-word",
                textAlign: "left",
              }}
            >
              <ReactMarkdown>{msg.text}</ReactMarkdown>

              {/* RAG Verification stamp on assistant responses */}
              {msg.sender === "bot" && (
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 6,
                    borderTop: "1px solid #f1f5f9",
                    fontSize: "11px",
                    color: "#6366f1",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontWeight: 600,
                  }}
                >
                  <MdAutoAwesome style={{ fontSize: 13 }} />
                  <span>Verified with live Dashboard & Goals RAG</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ textAlign: "left", margin: "10px 0" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 18,
                padding: "10px 16px",
                color: "#6366f1",
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              <span className="rag-pulse-dot" />
              FinVoice RAG is analyzing your financial records...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Push-To-Talk Status Bar */}
      <div
        className={`ptt-status-bar ${
          isRecording ? "recording" : isTranscribing ? "transcribing" : "idle"
        }`}
      >
        {isRecording ? (
          <>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ef4444",
                display: "inline-block",
              }}
            />
            <span>
              🔴 Recording ({recordDuration}s) • <strong>Release to send</strong>
            </span>
          </>
        ) : isTranscribing ? (
          <>
            <MdAutoAwesome />
            <span>⚡ Transcribing speech with Sarvam AI...</span>
          </>
        ) : pttHint ? (
          <span>{pttHint}</span>
        ) : (
          <span>🎙️ Push to Talk: Hold mic to speak, release to send</span>
        )}
      </div>

      {/* Input & Voice Controls */}
      <form
        onSubmit={handleFormSubmit}
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          width: "100%",
        }}
      >
        {/* Push-To-Talk (PTT) Mic Button */}
        <button
          type="button"
          aria-label="Push to Talk"
          title="Push to Talk: Hold to speak, release to send"
          className={`ptt-mic-btn ${
            isRecording ? "recording" : isTranscribing ? "transcribing" : ""
          }`}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !isRecording) {
              e.preventDefault();
              startPttRecording();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              stopPttRecording();
            }
          }}
          disabled={loading || isTranscribing}
        >
          <MdKeyboardVoice />
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={input}
          disabled={loading || isTranscribing || isRecording}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isRecording
              ? "Listening... Release to send"
              : isTranscribing
              ? "Transcribing with Sarvam AI..."
              : "Ask about medical emergency, balance, goals..."
          }
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            fontSize: 15,
            outline: "none",
            backgroundColor: isRecording ? "#fff5f5" : "#ffffff",
            transition: "all 0.2s ease",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={loading || !input.trim() || isTranscribing || isRecording}
          style={{
            padding: "0 20px",
            borderRadius: "12px",
            border: "none",
            background:
              loading || !input.trim() || isTranscribing || isRecording
                ? "#e2e8f0"
                : "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
            color:
              loading || !input.trim() || isTranscribing || isRecording
                ? "#94a3b8"
                : "#ffffff",
            fontWeight: 700,
            fontSize: 14.5,
            height: "48px",
            flexShrink: 0,
            cursor:
              loading || !input.trim() || isTranscribing || isRecording
                ? "not-allowed"
                : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow:
              !loading && input.trim()
                ? "0 4px 12px rgba(30, 27, 75, 0.25)"
                : "none",
            transition: "all 0.2s ease",
          }}
        >
          <MdSend />
        </button>
      </form>
    </div>
  );
};

export default Chat;
