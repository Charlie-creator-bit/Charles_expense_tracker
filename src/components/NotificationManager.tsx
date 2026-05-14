import { useEffect, useRef, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Reminder } from "../services/expenseService";
import { isPast, parseISO } from "date-fns";
import { useAuth } from "../context/AuthContext";

export default function NotificationManager() {
  const { user } = useAuth();
  const notifiedReminders = useRef<Set<string>>(new Set());
  const [activeReminders, setActiveReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    if (!user?.uid) return;

    // Request permission on mount if default
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const q = query(
      collection(db, "reminders"),
      where("userId", "==", user.uid),
      where("isCompleted", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
      setActiveReminders(data);
      
      // Immediate check for newly added/modified reminders
      data.forEach(reminder => {
        checkAndNotify(reminder);
      });
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Periodic check for reminders that become due while the app is open
  useEffect(() => {
    const interval = setInterval(() => {
      activeReminders.forEach(reminder => {
        checkAndNotify(reminder);
      });
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [activeReminders]);

  const checkAndNotify = (reminder: Reminder) => {
    if (reminder.isCompleted) return;
    
    const dueDate = parseISO(reminder.time);
    // Only notify if within the last hour to avoid spamming very old reminders on login
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    if (isPast(dueDate) && dueDate > oneHourAgo && !notifiedReminders.current.has(reminder.id)) {
      showNotification(reminder);
      notifiedReminders.current.add(reminder.id);
    }
  };

  const showNotification = (reminder: Reminder) => {
    if (typeof Notification === "undefined") return;

    if (Notification.permission === "granted") {
      try {
        const n = new Notification("Ledger Node Alert", {
          body: reminder.title,
          badge: "/vite.svg", // Using vite icon as a fallback
          tag: reminder.id, // Prevent duplicate notifications for same ID
        });
        
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch (err) {
        console.error("Notification failed", err);
      }
    }
  };

  return null;
}
