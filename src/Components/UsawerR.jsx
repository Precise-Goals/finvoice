import React from "react";
import { FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export const UsawerR = () => {
  const navigate = useNavigate();
  return (
    <div className="iscosa" onClick={() => navigate("/profile")}>
      <FaUserCircle className="iscon" />
    </div>
  );
};
