import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import { RiBarChartBoxAiFill } from "react-icons/ri";
import { IoChatboxEllipses } from "react-icons/io5";
import { LuGoal } from "react-icons/lu";
import { MdKeyboardVoice } from "react-icons/md";
import { IoClose } from "react-icons/io5";

const Navbar = ({ onVoiceText }) => {
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcriptPiece + " ";
      }
      if (finalTranscript) {
        console.log("Transcription:", finalTranscript);
        onVoiceText && onVoiceText(finalTranscript.trim()); // send to parent
      }
      if (finalTranscript.match(/[\u0900-\u097F]/)) rec.lang = "hi-IN";
    };

    rec.onerror = (event) =>
      console.error("Speech recognition error:", event.error);
    rec.onend = () => setListening(false);

    setRecognition(rec);
  }, [onVoiceText]);

  const toggleListening = () => {
    if (!recognition) return;
    if (!listening) {
      recognition.start();
      setListening(true);
    } else {
      recognition.stop();
      setListening(false);
    }
  };

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
    <nav className="navbar">
      <ul className="navbar-list">
        {Path.map((e, ind) => (
          <li
            key={ind}
            className={
              "navbar-item" + (e.route === "/agent" ? " navbar-agent" : "")
            }
          >
            <Link to={e.route}>{e.component}</Link>
          </li>
        ))}
        <li className="navbar-agent-link">
          <button
            onClick={toggleListening}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "1.8rem",
              padding: "27% 0.3em",
              color: listening ? "red" : "white",
            }}
            title={listening ? "Stop Listening" : "Start Listening"}
          >
            {listening ? <IoClose /> : <MdKeyboardVoice />}
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
