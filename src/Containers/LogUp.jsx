import React, { useState } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { app } from "../firebase";
import { useNavigate } from "react-router-dom";

const LogUp = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const auth = getAuth(app);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess("Logged in successfully!");
        navigate("/"); // Redirect to home
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccess("Account created successfully!");
        navigate("/"); // Redirect to home
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="logup-container">
      <h2 className="logup-title">{isLogin ? "LOGIN" : "SIGN UP"}</h2>
      <form className="logup-form" onSubmit={handleSubmit}>
        <input
          className="logup-input"
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="logup-input"
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={(e) => setPassword(e.target.value)}
        />
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
            setError("");
            setSuccess("");
          }}
        >
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <br /><span>{isLogin ? " Sign Up" : " Login"}</span>
        </button>
      </div>
      {error && <div className="logup-error">{error}</div>}
      {success && <div className="logup-success">{success}</div>}
    </div>
  );
};

export default LogUp;
