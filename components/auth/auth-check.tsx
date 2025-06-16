"use client"

import { useState, useEffect } from "react";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";
import { ForgotPasswordForm } from "./forgot-password-form";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
// import { onAuthChange, logoutUser } from "@/lib/firebase/auth"
// import { setDocument, getDocument } from "@/lib/firebase/firestore"

interface AuthCheckProps {
  children: React.ReactNode;
}

export function AuthCheck({ children }: AuthCheckProps) {
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("login");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: firebaseUser.uid, ...userDoc.data() });
        } else {
          // Create user document if it doesn't exist
          await setDoc(doc(db, "users", firebaseUser.uid), {
            email: firebaseUser.email,
            name: firebaseUser.displayName || "",
            createdAt: new Date().toISOString()
          });
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName || "" });
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Create user document in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        createdAt: new Date().toISOString()
      });
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Logout error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authMode === "login") {
      return (
        <LoginForm
          onLogin={handleLogin}
          onSwitchToSignup={() => setAuthMode("signup")}
          onSwitchToForgotPassword={() => setAuthMode("forgot")}
        />
      );
    }

    if (authMode === "signup") {
      return <SignupForm onSignup={handleSignup} onSwitchToLogin={() => setAuthMode("login")} />;
    }

    if (authMode === "forgot") {
      return <ForgotPasswordForm onSendReset={handleForgotPassword} onBackToLogin={() => setAuthMode("login")} />;
    }
  }

  return <>{children}</>;
}