import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import { RiBarChartBoxAiFill } from "react-icons/ri";
import { IoChatboxEllipses } from "react-icons/io5";
import { LuGoal } from "react-icons/lu";
import { MdKeyboardVoice, MdLanguage } from "react-icons/md";
import { IoClose } from "react-icons/io5";

const Navbar = ({ onVoiceText }) => {
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState("en-US");
  const [transcript, setTranscript] = useState("");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const location = useLocation();

  // Use refs to avoid stale closures
  const listeningRef = useRef(listening);
  const currentLanguageRef = useRef(currentLanguage);
  const voiceLevelIntervalRef = useRef(null);

  // Update refs when state changes
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    currentLanguageRef.current = currentLanguage;
  }, [currentLanguage]);

  // Language options
  const languages = [
    { code: "en-US", name: "English", flag: "🇺🇸", native: "English" },
    { code: "hi-IN", name: "Hindi", flag: "🇮🇳", native: "हिंदी" },
    { code: "mr-IN", name: "Marathi", flag: "🇮🇳", native: "मराठी" },
  ];

  // Auto-detect language based on text content
  const autoDetectLanguage = useCallback((text, recognition) => {
    const hindiPattern = /[\u0900-\u097F]/;

    if (hindiPattern.test(text)) {
      const marathiWords = ["आहे", "आला", "गेला", "येत", "जात", "करत", "होत"];
      const hindiWords = ["है", "आया", "गया", "आता", "जाता", "करता", "होता"];

      const hasMarathi = marathiWords.some((word) => text.includes(word));
      const hasHindi = hindiWords.some((word) => text.includes(word));

      if (hasMarathi && currentLanguageRef.current !== "mr-IN") {
        setCurrentLanguage("mr-IN");
        if (recognition) {
          recognition.lang = "mr-IN";
        }
      } else if (hasHindi && currentLanguageRef.current !== "hi-IN") {
        setCurrentLanguage("hi-IN");
        if (recognition) {
          recognition.lang = "hi-IN";
        }
      }
    } else if (currentLanguageRef.current !== "en-US") {
      setCurrentLanguage("en-US");
      if (recognition) {
        recognition.lang = "en-US";
      }
    }
  }, []); // No dependencies needed since we use refs

  // Initialize Speech Recognition only once
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported in this browser");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = currentLanguage;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      console.log(
        "Speech recognition started for language:",
        currentLanguageRef.current
      );
      setListening(true);
      setTranscript("");
    };

    rec.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + " ";
          console.log(
            `Final transcript (${currentLanguageRef.current}):`,
            transcriptPiece,
            `Confidence: ${confidence || "N/A"}`
          );
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      // Update local transcript for display
      setTranscript(finalTranscript + interimTranscript);

      // Send final transcript to parent component
      if (finalTranscript.trim()) {
        onVoiceText && onVoiceText(finalTranscript.trim());
        // Auto-detect and switch language if needed
        autoDetectLanguage(finalTranscript, rec);
      }
    };

    rec.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);

      // Handle specific errors with user-friendly messages
      switch (event.error) {
        case "not-allowed":
          alert(
            "Microphone access denied. Please allow microphone access in your browser settings."
          );
          break;
        case "no-speech":
          console.log(
            "No speech detected. Recognition will restart automatically."
          );
          // Auto-restart for no-speech errors with delay
          setTimeout(() => {
            if (!listeningRef.current) {
              try {
                rec.start();
              } catch (error) {
                console.error("Error restarting recognition:", error);
              }
            }
          }, 1500);
          break;
        case "audio-capture":
          alert(
            "No microphone found. Please connect a microphone and try again."
          );
          break;
        case "network":
          alert(
            "Network error occurred. Please check your internet connection."
          );
          break;
        default:
          console.log("Recognition error:", event.error);
      }
    };

    rec.onend = () => {
      console.log("Speech recognition ended");
      setListening(false);
      setVoiceLevel(0);
      // Clear voice level interval
      if (voiceLevelIntervalRef.current) {
        clearInterval(voiceLevelIntervalRef.current);
        voiceLevelIntervalRef.current = null;
      }
    };

    // Voice level simulation
    rec.onaudiostart = () => {
      // Clear any existing interval
      if (voiceLevelIntervalRef.current) {
        clearInterval(voiceLevelIntervalRef.current);
      }

      voiceLevelIntervalRef.current = setInterval(() => {
        setVoiceLevel(Math.random() * 100);
      }, 100);
    };

    setRecognition(rec);

    // Cleanup function
    return () => {
      if (rec) {
        try {
          rec.stop();
        } catch (error) {
          console.log("Error stopping recognition on cleanup:", error);
        }
      }
      if (voiceLevelIntervalRef.current) {
        clearInterval(voiceLevelIntervalRef.current);
      }
    };
  }, []); // Empty dependency array - only run once

  // Update recognition language when currentLanguage changes
  useEffect(() => {
    if (recognition && recognition.lang !== currentLanguage) {
      recognition.lang = currentLanguage;
    }
  }, [currentLanguage, recognition]);

  // Define toggleListening with useCallback
  const toggleListening = useCallback(() => {
    if (!recognition) {
      console.error("Speech recognition not available");
      return;
    }

    if (!listening) {
      try {
        recognition.lang = currentLanguageRef.current;
        recognition.start();
        console.log(
          "Starting recognition with language:",
          currentLanguageRef.current
        );
      } catch (error) {
        console.error("Error starting recognition:", error);
      }
    } else {
      try {
        recognition.stop();
        setListening(false);
        setTranscript("");
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    }
  }, [recognition, listening]); // Only depend on recognition and listening

  const getCurrentLanguageInfo = useCallback(() => {
    return (
      languages.find((lang) => lang.code === currentLanguage) || languages[0]
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
      title: "Agent",
    },
    { route: "/goals", component: <LuGoal />, title: "Goals" },
    { route: "/chat", component: <IoChatboxEllipses />, title: "Chat" },
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

          {/* Language Selector */}

          {/* Voice Recognition Button */}
          <li className="navbar-agent-link">
            <button
              onClick={toggleListening}
              style={{
                background: listening
                  ? "linear-gradient(135deg,rgb(31, 10, 10),rgb(82, 15, 15))"
                  : "linear-gradient(135deg,rgb(0, 0, 0),rgb(17, 38, 94))",
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
                  ? "0 0 20px rgba(239, 68, 68, 0.4)"
                  : "0 4px 12px rgba(59, 130, 246, 0.3)",
              }}
              title={
                listening
                  ? "Stop Listening"
                  : `Start Listening (${getCurrentLanguageInfo().native})`
              }
            >
              {listening ? <IoClose /> : <MdKeyboardVoice />}

              {/* Voice Level Indicator */}
              {listening && (
                <div
                  style={{
                    position: "absolute",
                    inset: "-4px",
                    borderRadius: "50%",
                    border: "2px solid rgba(255, 255, 255, 0.6)",
                    animation: "pulse 1.5s infinite",
                  }}
                />
              )}
            </button>
          </li>
        </ul>
      </nav>

      {/* Voice Transcript Display */}
      {transcript && (
        <div
          className="voice-transcript"
          style={{
            position: "fixed",
            bottom: "20px",
            left: "20px",
            right: "20px",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            color: "white",
            padding: "16px 20px",
            borderRadius: "16px",
            zIndex: 1000,
            maxWidth: "600px",
            margin: "0 auto",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: listening ? "#10b981" : "#6b7280",
                animation: listening ? "pulse 1.5s infinite" : "none",
              }}
            />
            <span style={{ fontSize: "12px", color: "#d1d5db" }}>
              {listening ? "Listening" : "Processing"} •{" "}
              {getCurrentLanguageInfo().native}
            </span>
          </div>
          <div style={{ fontSize: "16px", lineHeight: "1.4" }}>
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

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }

        .navbar-item.active a {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
        }

        .language-menu button:hover {
          background-color: #f3f4f6 !important;
        }
      `}</style>
    </>
  );
};

export default Navbar;
