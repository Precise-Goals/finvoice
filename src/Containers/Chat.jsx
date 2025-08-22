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
import { app } from "../firebase";
import { useUser } from "../UserContext";
import ReactMarkdown from "react-markdown";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SYSTEM_PROMPT = `You are FinVoice, an expert AI financial assistant. 
⚡ Always provide **clear, concise, and actionable financial advice** (budgeting, expense tracking, savings, investments, debt management).  
❌ If a question is unrelated to finance, politely steer the user back to personal finance.  
Keep tone: friendly, professional, helpful.

📏 IMPORTANT: Your responses must be between **300-500 characters** (minimum 300, maximum 500). Keep them structured, easy to read, and avoid going beyond the limit.`;

const Chat = () => {
  const { user } = useUser();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const db = getFirestore(app);
  const messagesEndRef = useRef(null);

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

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

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

    // Build conversation history for Gemini (correct format)
    const conversationHistory = messages.map((m) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    // Add current user message
    conversationHistory.push({
      role: "user",
      parts: [{ text: `${SYSTEM_PROMPT}\n\nUser: ${userInput}` }],
    });

    let botText =
      "Sorry, I couldn't process your request. Please ask about finances.";

    try {
      const requestBody = {
        contents: conversationHistory,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      };

      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
          GEMINI_API_KEY,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Gemini API Error:", errorData);
        throw new Error(`API Error: ${res.status}`);
      }

      const data = await res.json();
      botText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't process your request.";
    } catch (error) {
      console.error("Error contacting Gemini API:", error);
      botText =
        "⚠️ Error contacting AI. Please check your API key and try again.";
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
        style={{ fontWeight: 900, fontSize: 24, marginBottom: 12 }}
      >
        FINVOICE CHAT
      </div>
      <div
        style={{
          background: "#f7f7f7",
          borderRadius: 12,
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
            Ask me anything about personal finance!
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
                    ? "linear-gradient(45deg, #6e5ad0,rgba(169, 18, 215, 0.77))"
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
              thinking...
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
          gap: 8,
        }}
      >
        <button className="ccall">
          <IoCallSharp />
        </button>
        <input
          type="text"
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about budget"
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
          disabled={loading || !input.trim()}
          style={{
            padding: "0 6%",
            borderRadius: 8,
            border: "none",
            background: loading || !input.trim() ? "#ccc" : "#000",
            color: "#fff",
            fontWeight: 600,
            fontSize: 16,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default Chat;
