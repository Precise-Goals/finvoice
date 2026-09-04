import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import { RiBarChartBoxAiFill } from "react-icons/ri";
import { IoChatboxEllipses } from "react-icons/io5";
import { LuGoal } from "react-icons/lu";
import { MdKeyboardVoice, MdLanguage } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { transcribeAudio } from "../services/sarvam";

const LANGUAGES = [
  { code: "unknown", name: "Auto-Detect", flag: "🌐", native: "Auto" },
  { code: "hi-IN", name: "Hindi", flag: "🇮🇳", native: "हिंदी" },
  { code: "mr-IN", name: "Marathi", flag: "🇮🇳", native: "मराठी" },
  { code: "en-IN", name: "English (India)", flag: "🇮🇳", native: "English" },
];

const Navbar = ({ onVoiceText }) => {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("unknown");
  const [transcript, setTranscript] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const location = useLocation();

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Stop microphone recording and transcribe with Sarvam AI
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setListening(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setVoiceLevel(0);
  }, []);

  // Start microphone recording and stream to Sarvam Saaras STT
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Audio visualizer setup
      try {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevel = () => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              setVoiceLevel(Math.min(100, Math.round((average / 128) * 100)));
              animationFrameRef.current = requestAnimationFrame(updateLevel);
            }
          };
          updateLevel();
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

        if (audioBlob.size > 0) {
          setProcessing(true);
          try {
            const res = await transcribeAudio(audioBlob, {
              languageCode: currentLanguage,
              model: "saaras:v3",
            });

            if (res.transcript) {
              setTranscript(res.transcript);
              setDetectedLang(res.language_code || currentLanguage);
              if (onVoiceText) {
                onVoiceText(res.transcript);
              }
            } else {
              setTranscript("No speech detected. Please try again.");
            }
          } catch (err) {
            console.error("Sarvam STT Error:", err);
            setTranscript(`Recognition error: ${err.message}`);
          } finally {
            setProcessing(false);
          }
        }
      };

      mediaRecorder.start();
      setListening(true);
      setTranscript("Listening... Speak clearly in English, Hindi, or Marathi");
    } catch (err) {
      console.error("Microphone access error:", err);
      alert(
        "Microphone access error. Please check microphone permissions in your browser."
      );
      setListening(false);
    }
  }, [currentLanguage, onVoiceText]);

  const toggleListening = useCallback(() => {
    if (listening) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [listening, startRecording, stopRecording]);

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
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

  const getCurrentLanguageInfo = useCallback(() => {
    return (
      LANGUAGES.find((lang) => lang.code === currentLanguage) || LANGUAGES[0]
    );
  }, [currentLanguage]);

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

          {/* Language Selector Button */}
          <li className="navbar-item" style={{ position: "relative" }}>
            <button
              onClick={() => setShowLanguageMenu((prev) => !prev)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "1.3rem",
                color: "inherit",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "8px",
              }}
              title={`Voice Language: ${getCurrentLanguageInfo().name}`}
            >
              <MdLanguage />
              <span style={{ fontSize: "11px", fontWeight: 700 }}>
                {getCurrentLanguageInfo().flag}
              </span>
            </button>

            {/* Language Menu Dropdown */}
            {showLanguageMenu && (
              <div
                className="language-menu"
                style={{
                  position: "absolute",
                  bottom: "100%",
                  right: 0,
                  marginBottom: "10px",
                  background: "#1f2937",
                  color: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  padding: "8px",
                  zIndex: 1001,
                  minWidth: "160px",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "4px 8px",
                    color: "#9ca3af",
                  }}
                >
                  Sarvam STT Language
                </div>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setCurrentLanguage(lang.code);
                      setShowLanguageMenu(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      padding: "8px 10px",
                      background:
                        currentLanguage === lang.code
                          ? "rgba(99, 102, 241, 0.3)"
                          : "transparent",
                      border: "none",
                      color: currentLanguage === lang.code ? "#818cf8" : "#fff",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      textAlign: "left",
                    }}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </li>

          {/* Voice Recognition Button */}
          <li className="navbar-agent-link">
            <button
              onClick={toggleListening}
              style={{
                background: listening
                  ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
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
                transition: "all 0.3s ease",
                boxShadow: listening
                  ? `0 0 ${15 + voiceLevel * 0.3}px rgba(239, 68, 68, 0.8)`
                  : "0 4px 12px rgba(79, 70, 229, 0.4)",
              }}
              title={
                listening
                  ? "Stop Listening (Send to Sarvam AI)"
                  : processing
                  ? "Sarvam AI is processing speech..."
                  : `Speak to FinVoice (${getCurrentLanguageInfo().native})`
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
                    border: "2px solid rgba(255, 255, 255, 0.8)",
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
                    ? "#ef4444"
                    : processing
                    ? "#f59e0b"
                    : "#10b981",
                  animation: listening ? "pulse 1.5s infinite" : "none",
                }}
              />
              <span style={{ fontSize: "12px", color: "#d1d5db" }}>
                {listening
                  ? "Recording with Sarvam AI..."
                  : processing
                  ? "Transcribing with Saaras..."
                  : `Transcribed (${detectedLang || getCurrentLanguageInfo().native})`}
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

      {/* Click outside to close language menu */}
      {showLanguageMenu && (
        <div
          onClick={() => setShowLanguageMenu(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
          }}
        />
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
