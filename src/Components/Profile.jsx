import React, { useState, useEffect, useCallback } from "react";
import { 
  getAuth, 
  signOut, 
  onAuthStateChanged, 
  updateProfile 
} from "firebase/auth";
import { 
  getDatabase, 
  ref, 
  get, 
  update 
} from "firebase/database";
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
  const [panError, setPanError] = useState("");
  
  const [editData, setEditData] = useState({
    name: "",
    contact: "",
    mobile: "",
    panCard: "",
    avatar: 1
  });
  
  const navigate = useNavigate();
  const auth = getAuth(app);
  const db = getDatabase(app);
  const panCardRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

  const fetchUserDetails = useCallback(async (uid) => {
    try {
      const userRef = ref(db, `users/${uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUserDetails(userData);
        setEditData({
          name: userData.name || "",
          contact: userData.contact || "",
          mobile: userData.mobile || "",
          panCard: userData.panCard || "",
          avatar: userData.avatar || 1
        });
      }
    } catch (err) {
      console.error("Error fetching user details:", err);
      setError("Failed to load user details");
    }
  }, [db]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchUserDetails(currentUser.uid);
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
      // Reset edit data when canceling
      setEditData({
        name: userDetails?.name || "",
        contact: userDetails?.contact || "",
        mobile: userDetails?.mobile || "",
        panCard: userDetails?.panCard || "",
        avatar: userDetails?.avatar || 1
      });
      setPanError("");
    }
    setIsEditing(!isEditing);
    setError("");
    setSuccess("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePanCardBlur = () => {
    if (editData.panCard && !panCardRegex.test(editData.panCard)) {
      setPanError("Please enter PAN Card in format: ABCDE1234F (5 letters, 4 digits, 1 letter)");
    } else {
      setPanError("");
    }
  };



  const saveProfile = async () => {
    // Validate required fields
    if (!editData.name.trim()) {
      setError("Name is required");
      return;
    }

    if (editData.panCard && !panCardRegex.test(editData.panCard)) {
      setError("Please enter a valid PAN Card format");
      return;
    }

    try {
      setError("");
      const updatedData = {
        ...editData,
        updatedAt: new Date().toISOString()
      };

      // Update in Realtime Database
      await update(ref(db, `users/${user.uid}`), updatedData);

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: editData.name,
        photoURL: `/public/${editData.avatar}.png`
      });

      // Update local state
      setUserDetails(prev => ({ ...prev, ...updatedData }));
      setIsEditing(false);
      setSuccess("Profile updated successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
      setError("Failed to save profile. Please try again.");
    }
  };

  const handleSaveProfile = async () => {
    await saveProfile();
  };

  const handleAvatarSelect = (avatarNum) => {
    setEditData(prev => ({ ...prev, avatar: avatarNum }));
    setShowAvatarPicker(false);
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

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
              <button className="save-btn" onClick={handleSaveProfile}>
                Save Changes
              </button>
              <button className="cancel-btn" onClick={handleEditToggle}>
                Cancel
              </button>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            Logout
          </button>
        </div>
      </div>

      {error && <div className="profile-error">{error}</div>}
      {success && <div className="profile-success">{success}</div>}

      <div className="profile-content">
        {/* Avatar Display */}
        <div className="profile-avatar">
          <img
            src={`/public/${isEditing ? editData.avatar : (userDetails?.avatar || 1)}.png`}
            alt="User Avatar"
            className="avatar-display"
            onClick={() => isEditing && setShowAvatarPicker(true)}
            style={{ cursor: isEditing ? 'pointer' : 'default' }}
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

        {/* User Information */}
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
              <span>{userDetails?.name || user.displayName || "Not provided"}</span>
            )}
          </div>

          <div className="info-item">
            <label>Email:</label>
            <span>{user.email}</span>
          </div>

          <div className="info-item">
            <label>Contact:</label>
            {isEditing ? (
              <input
                type="text"
                name="contact"
                value={editData.contact}
                onChange={handleInputChange}
                className="edit-input"
                placeholder="Enter your contact address"
              />
            ) : (
              <span>{userDetails?.contact || "Not provided"}</span>
            )}
          </div>

          <div className="info-item">
            <label>Mobile:</label>
            {isEditing ? (
              <div className="mobile-input-container">
                <input
                  type="tel"
                  name="mobile"
                  value={editData.mobile}
                  onChange={handleInputChange}
                  className="edit-input"
                  placeholder="Enter 10-digit mobile number"
                  maxLength="10"
                />
              </div>
            ) : (
              <div className="mobile-display">
                <span>{userDetails?.mobile || "Not provided"}</span>
              </div>
            )}
          </div>

          <div className="info-item">
            <label>PAN Card:</label>
            {isEditing ? (
              <div className="pan-input-container">
                <input
                  type="text"
                  name="panCard"
                  value={editData.panCard}
                  onChange={handleInputChange}
                  onBlur={handlePanCardBlur}
                  className={`edit-input ${panError ? 'error-input' : ''}`}
                  placeholder="ABCDE1234F"
                  maxLength="10"
                  style={{ textTransform: 'uppercase' }}
                />
                {panError && <div className="field-error">{panError}</div>}
              </div>
            ) : (
              <span>{userDetails?.panCard || "Not provided"}</span>
            )}
          </div>

          <div className="info-item">
            {/* <label>Member Since:</label>
            <span>
              {userDetails?.createdAt
                ? new Date(userDetails.createdAt).toLocaleDateString()
                : new Date(user.metadata.creationTime).toLocaleDateString()}
            </span> */}
          </div>

          <div className="info-item">
            {/* <label>Last Login:</label>
            <span>
              {new Date(user.metadata.lastSignInTime).toLocaleString()}
            </span> */}
          </div>
        </div>

        {/* Change Password Button */}
        {!isEditing && (
          <div className="profile-actions">
            <button className="change-password-btn">Change Password</button>
          </div>
        )}
      </div>

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <div className="modal-overlay">
          <div className="avatar-picker-modal">
            <h3>Choose Your Avatar</h3>
            <div className="avatar-grid">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <div
                  key={num}
                  className={`avatar-option ${editData.avatar === num ? 'selected' : ''}`}
                  onClick={() => handleAvatarSelect(num)}
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