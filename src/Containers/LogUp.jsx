import React, { useState } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { getDatabase, ref, update } from "firebase/database";
import { app } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useFinancialData } from "../context/FinancialDataContext";

const LogUp = () => {
  const { setIsOnboardingOpen } = useFinancialData();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [canSwitchToSignUp, setCanSwitchToSignUp] = useState(false);
  const navigate = useNavigate();

  const auth = getAuth(app);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateSignUpForm = () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return false;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    return true;
  };

  const getFriendlyErrorMessage = (err) => {
    const code = err?.code || "";
    if (
      code === "auth/invalid-credential" ||
      code === "auth/user-not-found" ||
      code === "auth/wrong-password" ||
      code === "auth/invalid-login-credentials"
    ) {
      return {
        message:
          "Invalid email or password. If you haven't created an account yet, please switch to Sign Up.",
        suggestSignUp: true,
      };
    }
    if (code === "auth/email-already-in-use") {
      return {
        message: "An account with this email already exists. Please switch to Login above.",
        suggestLogin: true,
      };
    }
    if (code === "auth/invalid-email") {
      return { message: "Please enter a valid email address." };
    }
    if (code === "auth/weak-password") {
      return { message: "Password must be at least 6 characters long." };
    }
    if (code === "auth/too-many-requests") {
      return {
        message: "Too many failed attempts. Please wait a minute and try again.",
      };
    }
    return {
      message:
        err.message
          ?.replace(/^Firebase:\s*/i, "")
          ?.replace(/\s*\(auth\/[^)]+\)\.?/i, "") ||
        "Authentication failed. Please check your credentials.",
    };
  };

  // Instant 1-Click Demo Login
  const handleDemoLogin = async () => {
    setError("");
    setSuccess("");
    setCanSwitchToSignUp(false);
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, "demo@finvoice.com", "Password123!");
      setSuccess("Logged in successfully with Demo Account!");
      navigate("/");
    } catch (err) {
      console.error("Demo login error:", err);
      const friendly = getFriendlyErrorMessage(err);
      setError(friendly.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCanSwitchToSignUp(false);
    setSubmitting(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(
          auth,
          formData.email.trim(),
          formData.password
        );
        setSuccess("Logged in successfully!");
        navigate("/");
      } else {
        // Validate sign-up form
        if (!validateSignUpForm()) {
          setSubmitting(false);
          return;
        }

        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email.trim(),
          formData.password
        );

        const user = userCredential.user;

        // Update user profile with display name
        await updateProfile(user, {
          displayName: formData.name,
          photoURL: `/${formData.selectedAvatar || 1}.png`,
        });

        // Save initial user data to Realtime Database
        const rtdb = getDatabase(app);
        await update(ref(rtdb, `users/${user.uid}`), {
          name: formData.name,
          email: formData.email.trim(),
          avatar: formData.selectedAvatar || 1,
          totalBalance: 0,
          initialBalance: 0,
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
        });

        setSuccess("Account created successfully! Launching your setup...");
        setIsOnboardingOpen(true);
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Auth error:", err);
      const friendly = getFriendlyErrorMessage(err);
      setError(friendly.message);
      if (friendly.suggestSignUp) {
        setCanSwitchToSignUp(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setError("");
    setSuccess("");
    setCanSwitchToSignUp(false);
  };

  return (
    <div className="logup-container">
      {/* Tab Switcher */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          width: "100%",
          maxWidth: "340px",
          marginBottom: "1.2rem",
          background: "rgba(0,0,0,0.06)",
          padding: "4px",
          borderRadius: "30px",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setIsLogin(true);
            setError("");
            setCanSwitchToSignUp(false);
          }}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "25px",
            border: "none",
            background: isLogin ? "#000" : "transparent",
            color: isLogin ? "#fff" : "#444",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => {
            setIsLogin(false);
            setError("");
            setCanSwitchToSignUp(false);
          }}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "25px",
            border: "none",
            background: !isLogin ? "#000" : "transparent",
            color: !isLogin ? "#fff" : "#444",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          Sign Up
        </button>
      </div>

      <h2 className="logup-title">{isLogin ? "LOGIN" : "SIGN UP"}</h2>

      {/* 1-Click Demo Login Banner */}
      {isLogin && (
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={submitting}
          style={{
            width: "100%",
            maxWidth: "340px",
            padding: "11px 16px",
            borderRadius: "25px",
            border: "1px dashed #6366f1",
            background: "rgba(99, 102, 241, 0.08)",
            color: "#4f46e5",
            fontWeight: 700,
            fontSize: "13px",
            cursor: submitting ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "1rem",
            transition: "all 0.2s ease",
          }}
        >
          ⚡ 1-Click Demo Login (demo@finvoice.com)
        </button>
      )}

      <form className="logup-form" onSubmit={handleSubmit}>
        {/* Login Fields */}
        {isLogin ? (
          <>
            <input
              className="logup-input"
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              required
              disabled={submitting}
              onChange={handleInputChange}
            />
            <input
              className="logup-input"
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              required
              disabled={submitting}
              onChange={handleInputChange}
            />
          </>
        ) : (
          /* Sign Up Fields */
          <>
            <input
              className="logup-input"
              type="text"
              name="name"
              placeholder="Full Name (e.g. Rahul Sharma)"
              value={formData.name}
              required
              disabled={submitting}
              onChange={handleInputChange}
            />

            <input
              className="logup-input"
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              required
              disabled={submitting}
              onChange={handleInputChange}
            />

            <input
              className="logup-input"
              type="password"
              name="password"
              placeholder="Password (min 6 characters)"
              value={formData.password}
              required
              disabled={submitting}
              onChange={handleInputChange}
            />

            <input
              className="logup-input"
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              required
              disabled={submitting}
              onChange={handleInputChange}
            />

            <div
              style={{
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px dashed #818cf8",
                borderRadius: "14px",
                padding: "10px 14px",
                fontSize: "12px",
                color: "#4338ca",
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              🚀 <strong>Next Step:</strong> You'll customize your avatar, starting balance, and goals in our smooth onboarding flow!
            </div>
          </>
        )}

        <button className="logup-btn" type="submit" disabled={submitting}>
          {submitting ? "Processing..." : isLogin ? "Login" : "Sign Up"}
        </button>
      </form>

      {/* Helpful Context Switcher when Login fails because user isn't signed up */}
      {canSwitchToSignUp && (
        <div style={{ textAlign: "center", marginTop: "10px" }}>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError("");
              setCanSwitchToSignUp(false);
            }}
            style={{
              padding: "8px 18px",
              borderRadius: "20px",
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
            }}
          >
            👉 Create an Account with "{formData.email || "this email"}"
          </button>
        </div>
      )}

      <div className="logup-toggle">
        <button
          className="logup-link"
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            resetForm();
          }}
        >
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <br />
          <span>{isLogin ? " Sign Up" : " Login"}</span>
        </button>
      </div>

      {error && (
        <div
          className="logup-error"
          style={{
            background: "#fee2e2",
            color: "#b91c1c",
            padding: "10px 16px",
            borderRadius: "12px",
            fontSize: "14px",
            textAlign: "center",
            maxWidth: "340px",
            border: "1px solid #fca5a5",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="logup-success"
          style={{
            background: "#dcfce7",
            color: "#15803d",
            padding: "10px 16px",
            borderRadius: "12px",
            fontSize: "14px",
            textAlign: "center",
            maxWidth: "340px",
            border: "1px solid #86efac",
          }}
        >
          {success}
        </div>
      )}
    </div>
  );
};

export default LogUp;
