import React, { useState, useEffect, useCallback } from "react";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { getDatabase, ref, get, update } from "firebase/database";
import { PiSignOutBold } from "react-icons/pi";

import { app } from "../firebase";
import "./style.css";
import { useNavigate } from "react-router-dom";

export const Profile = () => {
  const [user, setUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [aadhaarError, setAadhaarError] = useState("");
  const [panError, setPanError] = useState("");

  const [editData, setEditData] = useState({
    name: "",
    aadhaar: "",
    mobile: "",
    panCard: "",
    avatar: 1,
    email: "", // auto-fetched, non-editable
  });

  const navigate = useNavigate();
  const auth = getAuth(app);
  const db = getDatabase(app);

  const panCardRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const aadhaarRegex = /^\d{4}-\d{4}-\d{4}$/;

  const fetchUserDetails = useCallback(
    async (uid, currentUser) => {
      try {
        const userRef = ref(db, `users/${uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUserDetails(userData);
          setEditData({
            name: userData.name || "",
            aadhaar: userData.aadhaar || "",
            mobile: userData.mobile || "",
            panCard: userData.panCard || "",
            avatar: userData.avatar || 1,
            email: userData.email || currentUser?.email || "",
          });
        }
      } catch (err) {
        console.error("Error fetching user details:", err);
        setError("Failed to load user details");
      }
    },
    [db]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchUserDetails(currentUser.uid, currentUser);
      } else {
        navigate("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth, navigate, fetchUserDetails]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      setError("Failed to logout. Please try again.");
      console.error("Logout error:", err);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditData({
        name: userDetails?.name || "",
        aadhaar: userDetails?.aadhaar || "",
        mobile: userDetails?.mobile || "",
        panCard: userDetails?.panCard || "",
        avatar: userDetails?.avatar || 1,
        email: userDetails?.email || user?.email || "",
      });
      setAadhaarError("");
      setPanError("");
    }
    setIsEditing(!isEditing);
    setError("");
    setSuccess("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "aadhaar") {
      let digits = value.replace(/\D/g, "").slice(0, 12);
      let formatted = digits;
      if (digits.length > 8) {
        formatted = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(
          8,
          12
        )}`;
      } else if (digits.length > 4) {
        formatted = `${digits.slice(0, 4)}-${digits.slice(4, 8)}`;
      }
      setEditData((prev) => ({ ...prev, aadhaar: formatted }));
    } else if (name === "panCard") {
      let val = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      let lettersPart1 = val.slice(0, 5).replace(/[^A-Z]/g, "");
      let numbersPart = val.slice(5, 9).replace(/[^0-9]/g, "");
      let lettersPart2 = val.slice(9, 10).replace(/[^A-Z]/g, "");
      let formattedPAN = lettersPart1 + numbersPart + lettersPart2;
      setEditData((prev) => ({ ...prev, panCard: formattedPAN.slice(0, 10) }));
    } else {
      setEditData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAadhaarBlur = () => {
    setAadhaarError(
      editData.aadhaar && !aadhaarRegex.test(editData.aadhaar)
        ? "Aadhaar must be 12 digits, formatted as XXXX-XXXX-XXXX"
        : ""
    );
  };

  const handlePanCardBlur = () => {
    setPanError(
      editData.panCard &&
        (!panCardRegex.test(editData.panCard) || editData.panCard.length !== 10)
        ? "PAN Card must be 10 characters: ABCDE1234F"
        : ""
    );
  };

  const saveProfile = async () => {
    if (!editData.name.trim()) {
      setError("Name is required");
      return;
    }
    if (editData.aadhaar && !aadhaarRegex.test(editData.aadhaar)) {
      setError("Please enter a valid Aadhaar number in XXXX-XXXX-XXXX format");
      return;
    }
    if (
      editData.panCard &&
      (!panCardRegex.test(editData.panCard) || editData.panCard.length !== 10)
    ) {
      setError("Please enter a valid 10-character PAN Card");
      return;
    }

    try {
      setError("");
      const updatedData = {
        ...editData,
        updatedAt: new Date().toISOString(),
      };

      await update(ref(db, `users/${user.uid}`), updatedData);
      await updateProfile(user, {
        displayName: editData.name,
        photoURL: `/public/${editData.avatar}.png`,
      });

      setUserDetails((prev) => ({ ...prev, ...updatedData }));
      setIsEditing(false);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile. Please try again.");
    }
  };

  if (loading)
    return (
      <div className="profile-container">
        <div className="loading">Loading...</div>
      </div>
    );
  if (!user) return null;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Profile</h2>
        <div className="header-actions">
          {!isEditing ? (
            <button className="edit-btn" onClick={handleEditToggle}>
              Edit Profile
            </button>
          ) : (
            <div className="edit-actions">
              <button className="save-btn" onClick={saveProfile}>
                Save
              </button>
              <button className="cancel-btn" onClick={handleEditToggle}>
                Cancel
              </button>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <PiSignOutBold />
          </button>
        </div>
      </div>

      {error && <div className="profile-error">{error}</div>}
      {success && <div className="profile-success">{success}</div>}

      <div className="profile-content">
        <div className="profile-avatar">
          <img
            src={`/public/${
              isEditing ? editData.avatar : userDetails?.avatar || 1
            }.png`}
            alt="User Avatar"
            className="avatar-display"
            onClick={() => isEditing && setShowAvatarPicker(true)}
          />
          {isEditing && (
            <button
              className="avatar-change-btn"
              onClick={() => setShowAvatarPicker(true)}
            >
              Choose Avatar
            </button>
          )}
        </div>

        <div className="profile-info">
          <div className="info-item">
            <label>Name:</label>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={editData.name}
                onChange={handleInputChange}
                className="edit-input"
                placeholder="Enter your name"
              />
            ) : (
              <span>
                {userDetails?.name || user.displayName || "Not provided"}
              </span>
            )}
          </div>

          <div className="info-item">
            <label>Email:</label>
            <span>{userDetails?.email || user?.email}</span>{" "}
            {/* Non-editable */}
          </div>

          <div className="info-item">
            <label>Aadhaar Card:</label>
            {isEditing ? (
              <div className="aadhaar-input-container">
                <input
                  type="text"
                  name="aadhaar"
                  value={editData.aadhaar}
                  onChange={handleInputChange}
                  onBlur={handleAadhaarBlur}
                  className={`edit-input ${aadhaarError ? "error-input" : ""}`}
                  placeholder="XXXX-XXXX-XXXX"
                  maxLength={14}
                />
                {aadhaarError && (
                  <div className="field-error">{aadhaarError}</div>
                )}
              </div>
            ) : (
              <span>{userDetails?.aadhaar || "Not provided"}</span>
            )}
          </div>

          <div className="info-item">
            <label>Mobile:</label>
            {isEditing ? (
              <input
                type="tel"
                name="mobile"
                value={editData.mobile}
                onChange={handleInputChange}
                className="edit-input"
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
              />
            ) : (
              <span>{userDetails?.mobile || "Not provided"}</span>
            )}
          </div>

          <div className="info-item">
            <label>PAN Card:</label>
            {isEditing ? (
              <div className="pan-input-container">
                <input
                  type="text"
                  name="panCard"
                  value={editData.panCard.toUpperCase()}
                  onChange={handleInputChange}
                  onBlur={handlePanCardBlur}
                  className={`edit-input ${panError ? "error-input" : ""}`}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
                {panError && <div className="field-error">{panError}</div>}
              </div>
            ) : (
              <span>{userDetails?.panCard || "Not provided"}</span>
            )}
          </div>
        </div>
      </div>

      {showAvatarPicker && (
        <div className="modal-overlay">
          <div className="avatar-picker-modal">
            <h3>Choose Your Avatar</h3>
            <div className="avatar-grid">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <div
                  key={num}
                  className={`avatar-option ${
                    editData.avatar === num ? "selected" : ""
                  }`}
                  onClick={() =>
                    setEditData((prev) => ({ ...prev, avatar: num }))
                  }
                >
                  <img
                    src={`/public/${num}.png`}
                    alt={`Avatar ${num}`}
                    className="avatar-image"
                  />
                </div>
              ))}
            </div>
            <button
              className="modal-close-btn"
              onClick={() => setShowAvatarPicker(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
