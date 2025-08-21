
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBzwIU09yq6SLpRZTbx6smuVveKLOK1t9A",
  authDomain: "finvoice-f12cb.firebaseapp.com",
  projectId: "finvoice-f12cb",
  storageBucket: "finvoice-f12cb.firebasestorage.app",
  messagingSenderId: "239074027183",
  appId: "1:239074027183:web:045974c5da32ced92b965a",
  measurementId: "G-VT95G9CWJB"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };