import React, { useState, useEffect } from "react";
import { useFinancialData } from "../context/FinancialDataContext";
import { formatINR } from "../services/ragService";
import { IoClose, IoCheckmarkCircle } from "react-icons/io5";
import { FaUserAlt, FaWallet, FaBullseye, FaIdCard, FaArrowRight, FaArrowLeft, FaCheck } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function OnboardingModal({ isOpen, onClose }) {
  const { userProfile, saveOnboardingDetails } = useFinancialData();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(1);
  const [initialBalance, setInitialBalance] = useState("50000");
  const [goalTitle, setGoalTitle] = useState("Emergency Fund");
  const [goalAmount, setGoalAmount] = useState("100000");
  const [goalType, setGoalType] = useState("Others");
  const [mobile, setMobile] = useState("");
  const [panCard, setPanCard] = useState("");
  const [aadhaar, setAadhaar] = useState("");

  // Sync with userProfile on mount/open
  useEffect(() => {
    if (userProfile) {
      if (userProfile.name && userProfile.name !== "FinVoice User") {
        setName(userProfile.name);
      }
      if (userProfile.avatar) setAvatar(userProfile.avatar);
      if (userProfile.mobile) setMobile(userProfile.mobile);
      if (userProfile.panCard) setPanCard(userProfile.panCard);
      if (userProfile.aadhaar) setAadhaar(userProfile.aadhaar);
      if (userProfile.initialBalance !== undefined && userProfile.initialBalance > 0) {
        setInitialBalance(String(userProfile.initialBalance));
      }
    }
  }, [userProfile, isOpen]);

  if (!isOpen) return null;

  // Regex patterns
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const aadhaarRegex = /^\d{4}-\d{4}-\d{4}$/;
  const mobileRegex = /^[0-9]{10}$/;

  const handleMobileChange = (val) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 10);
    setMobile(cleaned);
  };

  const handlePanChange = (val) => {
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    setPanCard(cleaned);
  };

  const handleAadhaarChange = (val) => {
    let digits = val.replace(/\D/g, "").slice(0, 12);
    let formatted = digits;
    if (digits.length > 8) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
    } else if (digits.length > 4) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 8)}`;
    }
    setAadhaar(formatted);
  };

  const handleFinish = async () => {
    setSubmitting(true);
    setError("");

    try {
      const goalObj =
        goalTitle.trim() && Number(goalAmount) > 0
          ? {
              title: goalTitle.trim(),
              required: Number(goalAmount),
              type: goalType,
              plan: "Individual",
            }
          : null;

      const success = await saveOnboardingDetails({
        name: name.trim() || "FinVoice User",
        avatar,
        initialBalance: Number(initialBalance) || 0,
        goal: goalObj,
        mobile: mobile.trim(),
        panCard: panCard.trim(),
        aadhaar: aadhaar.trim(),
      });

      if (success) {
        setStep(5); // Celebration step
      } else {
        setError("Failed to save onboarding details. Please try again.");
      }
    } catch (err) {
      console.error("Onboarding submission error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteAndNavigate = () => {
    if (onClose) onClose();
    navigate("/dashboard");
  };

  const balancePresets = [0, 25000, 50000, 100000, 250000];
  const goalSuggestions = [
    { title: "Emergency Fund", type: "Others", amount: 100000 },
    { title: "Gold Investment", type: "Gold", amount: 50000 },
    { title: "Dream Vacation", type: "Leisure", amount: 75000 },
    { title: "Tech Gadget", type: "Others", amount: 40000 },
    { title: "House Downpayment", type: "Real Estate", amount: 500000 },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 15, 30, 0.75)",
        backdropFilter: "blur(12px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "28px",
          width: "100%",
          maxWidth: "540px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.8)",
          position: "relative",
          animation: "modalFadeIn 0.3s ease-out",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
            padding: "24px 28px 20px",
            color: "white",
            position: "relative",
          }}
        >
          {onClose && (
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(255, 255, 255, 0.15)",
                border: "none",
                color: "white",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              title="Close"
            >
              <IoClose size={18} />
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "3px 10px",
                borderRadius: "20px",
                letterSpacing: "0.5px",
              }}
            >
              FinVoice Onboarding
            </span>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              Step {step} of 4
            </span>
          </div>

          <h2 style={{ margin: "0 0 4px 0", fontSize: "22px", fontWeight: 700, color: "#fff" }}>
            {step === 1 && "Personalize Your Persona"}
            {step === 2 && "Starting Financial Baseline"}
            {step === 3 && "Your First Financial Goal"}
            {step === 4 && "KYC & Security Details"}
            {step === 5 && "You're Ready to Roll!"}
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#cbd5e1" }}>
            {step === 1 && "Choose your avatar and display name for AI insights."}
            {step === 2 && "Set your initial balance so tracking begins accurately."}
            {step === 3 && "Tell FinVoice what milestone you are working towards."}
            {step === 4 && "Optional verification details. You can finish or skip."}
            {step === 5 && "Your financial cockpit has been configured successfully!"}
          </p>

          {/* Stepper Progress Bar */}
          {step <= 4 && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "16px",
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: "4px",
                    borderRadius: "4px",
                    backgroundColor:
                      i <= step
                        ? "#818cf8"
                        : "rgba(255, 255, 255, 0.2)",
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: "26px 28px" }}>
          {error && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                padding: "10px 14px",
                borderRadius: "12px",
                fontSize: "13px",
                marginBottom: "16px",
                border: "1px solid #fca5a5",
              }}
            >
              {error}
            </div>
          )}

          {/* STEP 1: Name and Avatar */}
          {step === 1 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div
                  style={{
                    position: "relative",
                    display: "inline-block",
                  }}
                >
                  <img
                    src={`/${avatar}.png`}
                    alt="Selected Avatar"
                    style={{
                      width: "88px",
                      height: "88px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "4px solid #6366f1",
                      boxShadow: "0 8px 20px rgba(99, 102, 241, 0.35)",
                      backgroundColor: "#f1f5f9",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      bottom: "0",
                      right: "0",
                      background: "#6366f1",
                      color: "#fff",
                      borderRadius: "50%",
                      width: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    #{avatar}
                  </span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginTop: "8px" }}>
                  Pick Your Avatar
                </div>
              </div>

              {/* Avatar Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: "10px",
                  marginBottom: "24px",
                }}
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setAvatar(num)}
                    style={{
                      background: avatar === num ? "#e0e7ff" : "#f8fafc",
                      border: avatar === num ? "2px solid #6366f1" : "2px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "6px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      transform: avatar === num ? "scale(1.08)" : "scale(1)",
                      outline: "none",
                    }}
                  >
                    <img
                      src={`/${num}.png`}
                      alt={`Avatar ${num}`}
                      style={{
                        width: "100%",
                        aspectRatio: "1/1",
                        borderRadius: "10px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </button>
                ))}
              </div>

              {/* Name Input */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  What should FinVoice call you?
                </label>
                <input
                  type="text"
                  placeholder="Your Full Name (e.g. Rahul Sharma)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "14px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Starting Balance */}
          {step === 2 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  Configuring Starting Balance
                </div>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 800,
                    color: "#0f172a",
                    fontFamily: "sans-serif",
                  }}
                >
                  {formatINR(Number(initialBalance) || 0)}
                </div>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0" }}>
                  Your live charts and savings progress will baseline from this figure.
                </p>
              </div>

              {/* Quick Presets */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "8px" }}>
                  Quick Preset Balances:
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {balancePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setInitialBalance(String(preset))}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "20px",
                        border:
                          Number(initialBalance) === preset
                            ? "2px solid #6366f1"
                            : "1.5px solid #e2e8f0",
                        background:
                          Number(initialBalance) === preset
                            ? "#e0e7ff"
                            : "#f8fafc",
                        color:
                          Number(initialBalance) === preset
                            ? "#4338ca"
                            : "#334155",
                        fontWeight: 600,
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {preset === 0 ? "₹0 (Start Fresh)" : formatINR(preset)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "6px" }}>
                  Or enter exact custom balance (₹):
                </label>
                <input
                  type="number"
                  placeholder="Enter amount (e.g. 75000)"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "14px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: First Financial Goal */}
          {step === 3 && (
            <div>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
                Select a recommended goal or enter your own custom financial target.
              </p>

              {/* Quick Goal Chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                {goalSuggestions.map((g) => (
                  <button
                    key={g.title}
                    type="button"
                    onClick={() => {
                      setGoalTitle(g.title);
                      setGoalType(g.type);
                      setGoalAmount(String(g.amount));
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "16px",
                      border:
                        goalTitle === g.title
                          ? "2px solid #6366f1"
                          : "1px solid #e2e8f0",
                      background: goalTitle === g.title ? "#e0e7ff" : "#f8fafc",
                      color: goalTitle === g.title ? "#4338ca" : "#475569",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {g.title} ({formatINR(g.amount)})
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                  Goal Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Fund"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Target Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="100000"
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Category
                  </label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      background: "#fff",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="Others">Others</option>
                    <option value="Gold">Gold</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Stocks">Stocks</option>
                    <option value="Leisure">Leisure</option>
                    <option value="Education">Education</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: KYC & Identity Details (Optional) */}
          {step === 4 && (
            <div>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
                These details allow FinVoice to personalize formal statements and tax summaries. All fields are optional.
              </p>

              {/* Mobile Number */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                    Mobile Number
                  </label>
                  {mobile && (
                    <span style={{ fontSize: "11px", color: mobileRegex.test(mobile) ? "#10b981" : "#ef4444" }}>
                      {mobileRegex.test(mobile) ? "✓ Valid 10 digits" : "10 digits required"}
                    </span>
                  )}
                </div>
                <input
                  type="tel"
                  placeholder="9876543210"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* PAN Card */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                    PAN Card Number
                  </label>
                  {panCard && (
                    <span style={{ fontSize: "11px", color: panRegex.test(panCard) ? "#10b981" : "#ef4444" }}>
                      {panRegex.test(panCard) ? "✓ Valid PAN Format" : "Format: ABCDE1234F"}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  value={panCard}
                  onChange={(e) => handlePanChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    textTransform: "uppercase",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Aadhaar Card */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                    Aadhaar Number
                  </label>
                  {aadhaar && (
                    <span style={{ fontSize: "11px", color: aadhaarRegex.test(aadhaar) ? "#10b981" : "#ef4444" }}>
                      {aadhaarRegex.test(aadhaar) ? "✓ Valid Format" : "XXXX-XXXX-XXXX"}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  maxLength={14}
                  value={aadhaar}
                  onChange={(e) => handleAadhaarChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 5: Success & Launch */}
          {step === 5 && (
            <div style={{ textAlign: "center", padding: "10px 0 16px" }}>
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "36px",
                  margin: "0 auto 16px",
                  boxShadow: "0 10px 25px rgba(16, 185, 129, 0.4)",
                }}
              >
                ✓
              </div>

              <h3 style={{ margin: "0 0 8px", fontSize: "20px", color: "#111827", fontWeight: 700 }}>
                Welcome aboard, {name || "Investor"}! 🎉
              </h3>
              <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
                Your initial balance of <strong>{formatINR(Number(initialBalance) || 0)}</strong> is set,
                and FinVoice is calibrated to track your financial journey with autonomous voice intelligence.
              </p>

              {/* Summary Pill Card */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "16px",
                  padding: "14px 18px",
                  border: "1px solid #e2e8f0",
                  textAlign: "left",
                  marginBottom: "24px",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <img
                  src={`/${avatar}.png`}
                  alt="Avatar"
                  style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover" }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: "#1e293b" }}>{name || "FinVoice User"}</div>
                  <div style={{ color: "#64748b", fontSize: "12px" }}>
                    Starting Balance: <span style={{ color: "#10b981", fontWeight: 600 }}>{formatINR(Number(initialBalance) || 0)}</span>
                  </div>
                  {goalTitle && (
                    <div style={{ color: "#64748b", fontSize: "12px" }}>
                      Target: {goalTitle} ({formatINR(Number(goalAmount) || 0)})
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCompleteAndNavigate}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
                  color: "#fff",
                  borderRadius: "16px",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.3)",
                  transition: "transform 0.2s",
                }}
              >
                Go to Dashboard 🚀
              </button>
            </div>
          )}

          {/* Navigation Controls (Steps 1 to 4) */}
          {step <= 4 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "20px",
                borderTop: "1px solid #f1f5f9",
                paddingTop: "18px",
              }}
            >
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 12px",
                  }}
                >
                  <FaArrowLeft size={11} /> Back
                </button>
              ) : (
                <div />
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                {step === 4 && (
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={submitting}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#64748b",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "8px 14px",
                    }}
                  >
                    Skip KYC
                  </button>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 1 && !name.trim()) {
                        setName("FinVoice User");
                      }
                      setStep(step + 1);
                    }}
                    style={{
                      background: "#000",
                      color: "#fff",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "14px",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                    }}
                  >
                    Continue <FaArrowRight size={11} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={submitting}
                    style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "#fff",
                      border: "none",
                      padding: "10px 22px",
                      borderRadius: "14px",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: submitting ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                    }}
                  >
                    {submitting ? "Saving..." : "Finish Setup ✓"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
