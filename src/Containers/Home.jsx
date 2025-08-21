import React from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="Home">
      <div className="conten">
        <h1>FinVoice: AI-Powered Finance</h1>
        <p>FinVoice is an AI-powered finance assistant that offers voice-first expense logging, AI-driven summaries, cash flow forecasting, and goal planning</p>
        <button onClick={() => navigate("/logup")}>Get Started</button>
      </div>
      <img src="man.webp" className="man" alt="MAN" />
    </div>
  );
};

export default Home;
