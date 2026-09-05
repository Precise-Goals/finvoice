import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import { RiBarChartBoxAiFill } from "react-icons/ri";
import { IoChatboxEllipses } from "react-icons/io5";
import { LuGoal } from "react-icons/lu";
import { MdKeyboardVoice } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { transcribeAudio, parseExpenseWithSarvam } from "../services/sarvam";
import { useFinancialData } from "../context/FinancialDataContext";

const Navbar = ({ onVoiceText }) => {
  const { processTransaction } = useFinancialData();
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [micStatus, setMicStatus] = useState("idle"); // 'idle' | 'listening' | 'speaking' | 'pausing' | 'processing'
  const location = useLocation();

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const hasSpokenRef = useRef(false);
  const isStoppingRef = useRef(false);
  const isHoldingRef = useRef(false);
  const pressStartTimeRef = useRef(0);
  const durationTimerRef = useRef(null);
  const [recordDuration, setRecordDuration] = useState(0);

  // Stop microphone recording cleanly
  const stopRecording = useCallback(() => {
    isHoldingRef.current = false;
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("MediaRecorder stop warning:", e);
      }
    }
    setListening(false);

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setVoiceLevel(0);
  }, []);

  // Start microphone recording with Push-To-Talk
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
      // Audio visualizer setup & Smart Voice Activity Detection (VAD)
      try {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
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
          const SPEECH_THRESHOLD = 8; // Normalized audio level indicating active speech
          const PAUSE_DURATION_MS = 2200; // 2.2s silence after speech triggers smart auto-stop
          const INITIAL_TIMEOUT_MS = 4500; // 4.5s silence if user never started speaking

          const checkAudioAndPause = () => {
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

            animationFrameRef.current = requestAnimationFrame(checkAudioAndPause);
          };

          animationFrameRef.current = requestAnimationFrame(checkAudioAndPause);
        }
      } catch (audioErr) {
        console.warn("AudioContext visualizer not available:", audioErr);
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        const durationMs = Date.now() - pressStartTimeRef.current;

        // Accidental tap protection
        if (durationMs < 350) {
          setTranscript("Hold mic to speak, release to send!");
          setListening(false);
          setMicStatus("idle");
          return;
        }

        // Only send to STT if user held for valid duration
        if (audioBlob.size > 500) {
          setProcessing(true);
          setMicStatus("processing");
          try {
            // Sarvam Saaras model automatically detects 22+ Indic languages and English
            const res = await transcribeAudio(audioBlob, {
              languageCode: "unknown",
              model: "saaras:v3",
            });

            if (res.transcript && res.transcript.trim()) {
              setTranscript(res.transcript);
              setDetectedLang(res.language_code || "Auto");
              if (onVoiceText) {
                onVoiceText(res.transcript);
              }

              // Autonomous transaction logging & RAG assistant routing
              try {
                const parsed = await parseExpenseWithSarvam(res.transcript);
                if (parsed && parsed.amount > 0) {
                  await processTransaction(
                    parsed,
                    res.transcript,
                    res.language_code || "en"
                  );
                  const actionLabel = parsed.type === "income" ? "Credited" : parsed.type === "savings" ? "Saved" : "Logged";
                  setTranscript(
                    `✅ ${actionLabel} ₹${parsed.amount.toLocaleString("en-IN")} ${
                      parsed.type === "income" ? "as Income" : `under ${parsed.category || parsed.type}`
                    }`
                  );
                } else {
                  // Non-transaction speech
                  setTranscript(res.transcript);
                }
              } catch (parseErr) {
                console.warn("Autonomous voice parsing fallback:", parseErr);
              }
            } else {
              setTranscript("No clear speech detected. Please hold and speak clearly.");
            }
          } catch (err) {
            console.error("Sarvam STT Error:", err);
            setTranscript(`Recognition error: ${err.message}`);
          } finally {
            setProcessing(false);
            setMicStatus("idle");
          }
        } else {
          setTranscript("Audio too short. Please hold mic and speak.");
          setMicStatus("idle");
        }
      };

      mediaRecorder.start();
      setListening(true);
      setTranscript("Listening... Keep holding and speak in any language");

      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      durationTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert(
        "Microphone access error. Please check microphone permissions in your browser."
      );
      isHoldingRef.current = false;
      setListening(false);
      setMicStatus("idle");
    }
  }, [onVoiceText, processTransaction]);

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

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Auto-dismiss transcript toast after 7 seconds of inactivity
  useEffect(() => {
    if (transcript && !listening && !processing) {
      const timer = setTimeout(() => {
        setTranscript("");
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [transcript, listening, processing]);

  const Path = [
    { route: "/", component: <FaHome />, title: "Home" },
    {
      route: "/dashboard",
      component: <RiBarChartBoxAiFill />,
      title: "Dashboard",
    },
    {
      route: "/agent",
      component: <MdKeyboardVoice style={{ color: "white" }} />,
      title: "Voice Agent",
    },
    { route: "/goals", component: <LuGoal />, title: "Goals" },
    { route: "/chat", component: <IoChatboxEllipses />, title: "FinVoice Chat" },
  ];

  return (
    <>
      <nav className="navbar">
        <ul className="navbar-list">
          {Path.map((e, ind) => (
            <li
              key={ind}
              className={
                "navbar-item" +
                (e.route === "/agent" ? " navbar-agent" : "") +
                (location.pathname === e.route ? " active" : "")
              }
            >
              <Link to={e.route} title={e.title}>
                {e.component}
              </Link>
            </li>
          ))}

          {/* Push-To-Talk Center Mic Button */}
          <li className="navbar-agent-link">
            <button
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onKeyDown={(e) => {
                if ((e.key === " " || e.key === "Enter") && !listening) {
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
                background: listening
                  ? micStatus === "speaking"
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
                  : processing
                  ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                  : "linear-gradient(135deg, #4f46e5 0%, #1e1b4b 100%)",
                border: "none",
                cursor: "pointer",
                fontSize: "1.8rem",
                padding: "3%",
                color: "white",
                borderRadius: "50%",
                width: "3em",
                height: "3em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                userSelect: "none",
                touchAction: "none",
                WebkitUserSelect: "none",
                transition: "all 0.2s ease",
                boxShadow: listening
                  ? `0 0 ${15 + voiceLevel * 0.3}px ${
                      micStatus === "speaking"
                        ? "rgba(16, 185, 129, 0.8)"
                        : "rgba(239, 68, 68, 0.8)"
                    }`
                  : "0 4px 12px rgba(79, 70, 229, 0.4)",
              }}
              title={
                listening
                  ? `Push to Talk: Recording (${recordDuration}s)... Release to process`
                  : processing
                  ? "Sarvam AI is processing speech..."
                  : "Push to Talk: Hold to speak, release to send"
              }
            >
              {listening ? <IoClose /> : <MdKeyboardVoice />}

              {/* Dynamic Soundwave Halo using voiceLevel */}
              {listening && (
                <div
                  style={{
                    position: "absolute",
                    inset: `-${4 + voiceLevel * 0.1}px`,
                    borderRadius: "50%",
                    border: `2px solid ${
                      micStatus === "speaking"
                        ? "rgba(16, 185, 129, 0.9)"
                        : "rgba(255, 255, 255, 0.8)"
                    }`,
                    opacity: 0.5 + voiceLevel * 0.005,
                    transform: `scale(${1 + voiceLevel * 0.003})`,
                    transition: "all 0.1s ease",
                  }}
                />
              )}
            </button>
          </li>
        </ul>
      </nav>

      {/* Floating Transcript Toast */}
      {transcript && (
        <div
          className="voice-transcript"
          style={{
            position: "fixed",
            bottom: "24px",
            left: "20px",
            right: "20px",
            backgroundColor: "rgba(17, 24, 39, 0.95)",
            color: "white",
            padding: "16px 20px",
            borderRadius: "16px",
            zIndex: 1000,
            maxWidth: "600px",
            margin: "0 auto",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: listening
                    ? micStatus === "speaking"
                      ? "#10b981"
                      : micStatus === "pausing"
                      ? "#f59e0b"
                      : "#ef4444"
                    : processing
                    ? "#f59e0b"
                    : "#10b981",
                  animation: listening ? "pulse 1.5s infinite" : "none",
                }}
              />
              <span style={{ fontSize: "12px", color: "#d1d5db" }}>
                {listening
                  ? micStatus === "speaking"
                    ? "Smart Mic: Hearing voice... (auto-stops on pause)"
                    : micStatus === "pausing"
                    ? "Smart Mic: Pause detected, finalizing..."
                    : "Smart Mic: Listening... Speak in any language"
                  : processing
                  ? "Transcribing with Sarvam Saaras..."
                  : `Transcribed (${detectedLang || "Auto"})`}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "10px",
                  background: "rgba(99, 102, 241, 0.2)",
                  color: "#a5b4fc",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontWeight: 600,
                }}
              >
                Sarvam AI Saaras
              </span>
              <button
                onClick={() => setTranscript("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9ca3af",
                  cursor: "pointer",
                  fontSize: "16px",
                  padding: "2px",
                }}
              >
                <IoClose />
              </button>
            </div>
          </div>
          <div style={{ fontSize: "15px", lineHeight: "1.4", fontWeight: 500 }}>
            {transcript}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.15);
          }
        }

        .navbar-item.active a {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
        }
      `}</style>
    </>
  );
};

export default Navbar;
