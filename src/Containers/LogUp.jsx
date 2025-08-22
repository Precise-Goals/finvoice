import React, { useState } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { app } from "../firebase";
import { useNavigate } from "react-router-dom";

const LogUp = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    password: "",
    confirmPassword: "",
    selectedAvatar: 1,
    panCard: "",
    mobile: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const auth = getAuth(app);
  const db = getFirestore(app);

  // PAN Card regex pattern: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
  const panCardRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

  // Mobile number regex (10 digits)
  const mobileRegex = /^[0-9]{10}$/;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarSelect = (avatarNumber) => {
    setFormData((prev) => ({
      ...prev,
      selectedAvatar: avatarNumber,
    }));
  };

  const validateSignUpForm = () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return false;
    }

    if (!formData.contact.trim()) {
      setError("Contact is required");
      return false;
    }

    if (!mobileRegex.test(formData.mobile)) {
      setError("Mobile number must be 10 digits");
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

    if (!panCardRegex.test(formData.panCard)) {
      setError(
        "PAN Card format should be: ABCDE1234F (5 letters, 4 digits, 1 letter)"
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        setSuccess("Logged in successfully!");
        navigate("/");
      } else {
        // Validate sign-up form
        if (!validateSignUpForm()) {
          return;
        }

        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        const user = userCredential.user;

        // Update user profile with display name and avatar
        await updateProfile(user, {
          displayName: formData.name,
          photoURL: `/public/${formData.selectedAvatar}.png`,
        });

        // Save additional user data to Firestore
        await setDoc(doc(db, "users", user.uid), {
          name: formData.name,
          contact: formData.contact,
          email: formData.email,
          mobile: formData.mobile,
          panCard: formData.panCard,
          avatar: formData.selectedAvatar,
          createdAt: new Date().toISOString(),
        });

        setSuccess("Account created successfully!");
        navigate("/");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      contact: "",
      email: "",
      password: "",
      confirmPassword: "",
      selectedAvatar: 1,
      panCard: "",
      mobile: "",
    });
    setError("");
    setSuccess("");
  };

  return (
    <div className="logup-container">
      <h2 className="logup-title">{isLogin ? "LOGIN" : "SIGN UP"}</h2>
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
              onChange={handleInputChange}
            />
            <input
              className="logup-input"
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              required
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
              placeholder="Full Name"
              value={formData.name}
              required
              onChange={handleInputChange}
            />

            <input
              className="logup-input"
              type="text"
              name="contact"
              placeholder="Contact Address"
              value={formData.contact}
              required
              onChange={handleInputChange}
            />

            <input
              className="logup-input"
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              required
              onChange={handleInputChange}
            />

            <input
              className="logup-input"
              type="tel"
              name="mobile"
              placeholder="Mobile Number (10 digits)"
              value={formData.mobile}
              required
              maxLength="10"
              onChange={handleInputChange}
            />

            <input
              className="logup-input"
              type="text"
              name="panCard"
              placeholder="PAN Card (e.g., ABCDE1234F)"
              value={formData.panCard}
              required
              maxLength="10"
              style={{ textTransform: "uppercase" }}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                setFormData((prev) => ({ ...prev, panCard: value }));
              }}
            />

            <input
              className="logup-input"
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              required
              onChange={handleInputChange}
            />

            <input
              className="logup-input"
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              required
              onChange={handleInputChange}
            />

            {/* Avatar Selection */}
            <div className="avatar-selection">
              <label className="avatar-label">Choose Avatar:</label>
              <div className="avatar-grid">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <div
                    key={num}
                    className={`avatar-option ${
                      formData.selectedAvatar === num ? "selected" : ""
                    }`}
                    onClick={() => handleAvatarSelect(num)}
                  >
                    <img
                      src={`/public/${num}.png`}
                      alt={`Avatar ${num}`}
                      className="avatar-image"
                    />
                    <span className="avatar-number">{num}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <button className="logup-btn" type="submit">
          {isLogin ? "Login" : "Sign Up"}
        </button>
      </form>

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

      {error && <div className="logup-error">{error}</div>}
      {success && <div className="logup-success">{success}</div>}
    </div>
  );
};

export default LogUp;
