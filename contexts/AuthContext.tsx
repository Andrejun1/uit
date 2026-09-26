"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Constants for inactivity timeout (in milliseconds)
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before logout

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  showWarning: boolean;
  remainingTime: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(INACTIVITY_TIMEOUT);

  const router = useRouter();
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset activity timestamp
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    setShowWarning(false);
    setRemainingTime(INACTIVITY_TIMEOUT);
  }, []);

  // Check for inactivity
  const checkInactivity = useCallback(() => {
    if (!user) return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    const remaining = INACTIVITY_TIMEOUT - timeSinceActivity;

    setRemainingTime(remaining);

    // Show warning when 5 minutes left
    if (
      remaining <= WARNING_TIME &&
      remaining > 0 &&
      !warningShownRef.current
    ) {
      warningShownRef.current = true;
      setShowWarning(true);
    }

    // Auto logout when timeout reached
    if (remaining <= 0) {
      handleAutoLogout();
    }
  }, [user]);

  // Auto logout function
  const handleAutoLogout = useCallback(async () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    await supabase.auth.signOut();
    setUser(null);
    setShowWarning(false);
    router.push("/login?timeout=true");
  }, [router]);

  // Setup activity listeners
  useEffect(() => {
    if (!user) return;

    // Activity events to track
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    const handleActivity = () => {
      if (user) {
        resetActivity();
      }
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start checking interval
    checkIntervalRef.current = setInterval(checkInactivity, 1000);

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, resetActivity, checkInactivity]);

  // Initial session check
  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    await supabase.auth.signOut();
    setUser(null);
    setShowWarning(false);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signOut, showWarning, remainingTime }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
