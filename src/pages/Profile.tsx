import { useState, useEffect } from "react";
import React from "react";
import { User, ShieldCheck, Settings, LogOut, Loader2, Trash2 } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { firebaseService } from "../services/firebaseService";
import { deleteUser } from "firebase/auth";
import { doc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { motion } from "motion/react";

export default function Profile() {
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchBudget();
  }, []);

  const fetchBudget = async () => {
    try {
      const now = new Date();
      const budgetData = await firebaseService.getBudget(now.getMonth(), now.getFullYear());
      setBudget((budgetData as any)?.amount?.toString() || "");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const now = new Date();
      await firebaseService.upsertBudget(
        parseFloat(budget),
        now.getMonth(),
        now.getFullYear()
      );
      setMessage({ type: "success", text: "Budget node parameters updated successfully." });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to update financial constraints." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!window.confirm("CRITICAL: This will permanently delete your account and all associated financial data. This action CANNOT be undone. Proceed?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const uid = user.uid;

      // 1. Delete user data (expenses, budgets, profile)
      const expensesRef = collection(db, `users/${uid}/expenses`);
      const expensesSnap = await getDocs(expensesRef);
      await Promise.all(expensesSnap.docs.map(d => deleteDoc(d.ref)));

      const budgetsRef = collection(db, `users/${uid}/budgets`);
      const budgetsSnap = await getDocs(budgetsRef);
      await Promise.all(budgetsSnap.docs.map(d => deleteDoc(d.ref)));

      await deleteDoc(doc(db, "users", uid));

      // 2. Delete Auth user
      await deleteUser(user);
      
      window.location.href = "/register";
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        alert("For security, you must log in again before deleting your account.");
        auth.signOut();
        window.location.href = "/login";
      } else {
        alert("An error occurred while deleting your account: " + err.message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-white font-display">Identity Settings</h1>
        <p className="text-slate-400">Configure your operational parameters and financial thresholds.</p>
      </header>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Profile Sidebar */}
        <div className="md:col-span-1">
          <div className="glass-card text-center p-8">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-800 border border-slate-700 shadow-xl shadow-black/20">
              <User className="h-12 w-12 text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-white truncate px-2">{auth.currentUser?.email || 'Active Operator'}</h3>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 border border-emerald-500/20">
              Verified Node
            </div>
            
            <div className="mt-10 space-y-2 text-left">
              <div className="rounded-xl bg-slate-900/50 p-4 border border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Security Level</p>
                <p className="text-sm font-medium text-slate-300">Level 4 Access</p>
              </div>
              <div className="rounded-xl bg-slate-900/50 p-4 border border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Node Sync</p>
                <p className="text-sm font-medium text-emerald-400">100% Operational</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="md:col-span-2 space-y-8">
          <section className="glass-panel p-8">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Financial Constraints</h3>
                <p className="text-xs text-slate-500">Set your maximum monthly expenditure limit</p>
              </div>
            </div>

            {message.text && (
              <div className={`mb-6 rounded-xl p-4 text-sm font-medium border ${
                message.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleUpdateBudget} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Monthly Budget Target</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-500">$</span>
                  <input
                    type="number"
                    required
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800/40 py-4 pl-10 pr-4 text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="Enter limit..."
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify and Update Target"}
              </button>
            </form>
          </section>

          <section className="glass-panel p-8 opacity-60">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700">
                  <Settings className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">System Preferences</h3>
                  <p className="text-xs text-slate-500">Advanced cryptographic node settings</p>
                </div>
              </div>
              <span className="rounded bg-slate-800 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-slate-600 border border-slate-700">Coming Soon</span>
            </div>
          </section>

          <button 
            onClick={() => {
              auth.signOut();
              window.location.href = "/login";
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/40 py-4 font-bold text-slate-300 transition-all hover:bg-slate-700"
          >
            <LogOut className="h-5 w-5" />
            Terminate Session
          </button>

          <div className="pt-4 mt-4 border-t border-slate-800/50">
            <button 
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/10 bg-rose-500/5 py-4 font-bold text-rose-500/60 transition-all hover:bg-rose-500 hover:text-white disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  <Trash2 className="h-5 w-5" />
                  Wipe Node & Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
