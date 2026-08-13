import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDe_WcpRMDRr6y138kBty9rtLMamSP8E4E",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "med-vault-a2b2b.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "med-vault-a2b2b",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "med-vault-a2b2b.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "125671336755",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:125671336755:web:6f014495a7ca915c78ec46",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-KP0KJ8S2L0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics = null;

if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (err) {
    console.warn("Analytics initialization skipped:", err.message);
  }
}

export { app, analytics };
export default app;
