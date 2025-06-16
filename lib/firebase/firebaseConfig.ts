import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBCPKJLfEiYZuXG0qRaTWv8bsx0YFl9Pdg",
  authDomain: "fiverr-1asr-project.firebaseapp.com",
  projectId: "fiverr-1asr-project",
  storageBucket: "fiverr-1asr-project.firebasestorage.app",
  messagingSenderId: "608454214582",
  appId: "1:608454214582:web:845b52c63abd66b04af717",
  measurementId: "G-N6PSNQERE6"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);