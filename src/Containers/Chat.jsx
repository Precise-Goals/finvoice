import React, { useEffect, useRef, useState } from "react";
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
import { IoCallSharp } from "react-icons/io5";
import { MdKeyboardVoice, MdStop } from "react-icons/md";
import { app } from "../firebase";
import { useUser } from "../UserContext";
import ReactMarkdown from "react-markdown";
import { chatCompletion, transcribeAudio } from "../services/sarvam";

const SYSTEM_PROMPT = `You are FinVoice, an expert AI financial assistant powered by Sarvam AI. 
⚡ Always provide **clear, concise, and actionable financial advice** (budgeting, expense tracking, savings, investments, debt management).  
❌ If a question is unrelated to finance, politely steer the user back to personal finance.  
Keep tone: friendly, professional, helpful.

📏 Keep your responses structured, helpful, concise, and easy to read. You can understand English, Hindi, and Marathi financial questions.`;

const Chat = () => {
  const { user } = useUser();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const db = getFirestore(app);
  const messagesEndRef = useRef(null);

  // Audio recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleCall = () => {
    window.location.href = "https://assista.pages.dev/";
  };

  // Listen to chat history
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

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Voice recording for chat using Sarvam AI Speech-to-Text
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
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
          setIsTranscribing(true);
          try {
            const result = await transcribeAudio(audioBlob, {
              languageCode: "unknown",
            });
            if (result.transcript) {
              setInput((prev) =>
                prev ? `${prev} ${result.transcript}` : result.transcript
              );
            }
          } catch (err) {
            console.error("Sarvam Voice transcription error:", err);
            alert("Could not transcribe speech: " + err.message);
          } finally {
            setIsTranscribing(false);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone access is required for voice input.");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const toggleVoice = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || !user || loading) return;

    setLoading(true);
    const userInput = input.trim();
    setInput(""); // Clear input immediately

    // Save user msg
    const userMsg = {
      sender: "user",
      text: userInput,
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, "chats", user.uid, "threads"), userMsg);

    // Build conversation history for Sarvam AI Chat Completion (OpenAI compatible format)
    const formattedHistory = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(-10).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      })),
      { role: "user", content: userInput },
    ];

    let botText =
      "Sorry, I couldn't process your request. Please ask about finances.";

    try {
      const response = await chatCompletion(formattedHistory, {
        model: "sarvam-105b",
        temperature: 0.7,
      });

      if (response && response.trim()) {
        botText = response.trim();
      }
    } catch (error) {
      console.error("Error contacting Sarvam AI:", error);
      botText =
        `⚠️ Error contacting Sarvam AI: ${error.message || "Please check your API key."}`;
    }

    // Save bot msg
    await addDoc(collection(db, "chats", user.uid, "threads"), {
      sender: "bot",
      text: botText,
      createdAt: serverTimestamp(),
    });

    setLoading(false);
  };

  return (
    <div
      className="chatcont"
      style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}
    >
      <div
        className="finchat"
        style={{
          fontWeight: 900,
          fontSize: 24,
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>FINVOICE CHAT</span>
        <span
          style={{
            fontSize: "11px",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#fff",
            padding: "4px 10px",
            borderRadius: "12px",
            fontWeight: 600,
            letterSpacing: "0.5px",
          }}
        >
          Powered by Sarvam AI
        </span>
      </div>
      <div
        style={{
          background: "#f7f7f7",
          borderRadius: "3rem",
          padding: 16,
          minHeight: 350,
          maxHeight: "32.5rem",
          overflowY: "auto",
          marginBottom: 16,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{ textAlign: "center", color: "#666", fontStyle: "italic" }}
          >
            Ask me anything about personal finance in English, Hindi, or Marathi!
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              textAlign: msg.sender === "user" ? "right" : "left",
              margin: "6% 0",
            }}
          >
            <span
              style={{
                display: "inline-block",
                background:
                  msg.sender === "user"
                    ? "linear-gradient(45deg, #6e5ad0, rgba(169, 18, 215, 0.77))"
                    : "#e2e3e5",
                color: msg.sender === "user" ? "#fff" : "#000",
                letterSpacing: msg.sender === "user" ? "0.01em" : 0,
                borderRadius: 16,
                padding: "8px 25px",
                maxWidth: "88%",
                lineHeight: "155%",
                wordBreak: "break-word",
              }}
            >
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </span>
          </div>
        ))}
        {loading && (
          <div style={{ textAlign: "left", margin: "8px 0" }}>
            <span
              style={{
                display: "inline-block",
                background: "#e2e3e5",
                color: "#666",
                borderRadius: 16,
                padding: "8px 14px",
                fontStyle: "italic",
              }}
            >
              Sarvam AI is thinking...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={sendMessage}
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          type="button"
          className="ccall"
          onClick={() => handleCall()}
          title="Assista Call"
        >
          <IoCallSharp />
        </button>

        {/* Sarvam Speech Recognition Mic Button */}
        <button
          type="button"
          onClick={toggleVoice}
          title={isRecording ? "Stop Recording" : "Speak with Sarvam AI"}
          style={{
            background: isRecording
              ? "#ef4444"
              : isTranscribing
              ? "#f59e0b"
              : "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: "42px",
            height: "42px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: isRecording ? "0 0 12px rgba(239, 68, 68, 0.6)" : "none",
          }}
        >
          {isRecording ? <MdStop /> : <MdKeyboardVoice />}
        </button>

        <input
          type="text"
          value={input}
          disabled={loading || isTranscribing}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isRecording
              ? "Listening..."
              : isTranscribing
              ? "Transcribing with Sarvam AI..."
              : "Ask about budget, savings..."
          }
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            fontSize: 16,
            outline: "none",
            width: "100%",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim() || isTranscribing}
          style={{
            padding: "0 6%",
            borderRadius: 8,
            border: "none",
            background:
              loading || !input.trim() || isTranscribing ? "#ccc" : "#000",
            color: "#fff",
            fontWeight: 600,
            fontSize: 16,
            height: "42px",
            cursor:
              loading || !input.trim() || isTranscribing
                ? "not-allowed"
                : "pointer",
          }}
        >
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default Chat;
