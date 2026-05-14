import React, { useState, useEffect } from "react";
import { Wallet, Plus, Trash2, RefreshCw, Landmark, Smartphone, AlertCircle, CheckCircle2 } from "lucide-react";
import { expenseService } from "../services/expenseService";
import { cn } from "../lib/utils";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";

export default function LinkedAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkMode, setLinkMode] = useState<"bank" | "mobile_money" | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  const fetchAccounts = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await expenseService.getLinkedAccounts();
      setAccounts(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await expenseService.syncTransactions();
    setIsSyncing(false);
  };

  const handleUnlink = async (id: string) => {
    if (window.confirm("Disconnect this account? Real-time syncing will stop.")) {
      await expenseService.unlinkAccount(id);
      fetchAccounts();
    }
  };

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkMode) return;
    
    setIsLinking(true);
    try {
      // 1. Get security link token from backend
      console.log("Requesting link token from backend...");
      const linkToken = await expenseService.createLinkToken();
      
      // 2. Simulate User Auth via Provider (Plaid/Mono/Momo)
      // In a real app, you'd initialize the SDK here:
      // const plaid = usePlaidLink({ token: linkToken, onSuccess: ... })
      console.log("Security Handshake initialized with token:", linkToken);
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate UI interaction
      
      const simulatedPublicToken = "pub_auth_" + Math.random().toString(36).substr(2, 16);
      const metadata = {
        institution: linkMode === "bank" ? "Standard Chartered" : "MTN Ghana",
        account_name: linkMode === "bank" ? "Savings Account" : "MoMo Wallet",
        account_id: "id_" + Math.floor(Math.random() * 100000)
      };

      // 3. Exchange public token for permanent access token
      console.log("Exchanging public token for permanent access...");
      const authData = await expenseService.exchangePublicToken(simulatedPublicToken, metadata);
      
      // 4. Store linked account details securely
      await expenseService.linkAccount({
        type: linkMode,
        name: metadata.institution,
        accountNumber: "****" + Math.floor(1000 + Math.random() * 9000),
        lastSync: new Date().toISOString(),
        accessToken: authData.access_token,
        itemId: authData.item_id
      });

      setShowLinkModal(false);
      await fetchAccounts();
    } catch (err) {
      console.error("Link initiation failed", err);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
      <header className="mb-8 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-display">Linked Accounts</h1>
          <p className="text-xs text-slate-400 font-medium">Connect your bank and mobile money for automated tracking.</p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing || accounts.length === 0}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-xs font-bold text-slate-300 border border-slate-700 hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
          Sync All
        </button>
      </header>

      <div className="grid gap-6">
        {isLoading ? (
          [...Array(2)].map((_, i) => (
            <div key={i} className="glass-card h-24 animate-pulse bg-slate-800/50" />
          ))
        ) : accounts.map((account) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={account.id} 
            className="glass-card flex items-center justify-between p-6"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl border bg-slate-800/50",
                account.type === "bank" ? "border-blue-500/30 text-blue-400" : "border-yellow-500/30 text-yellow-400"
              )}>
                {account.type === "bank" ? <Landmark className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="font-bold text-white">{account.name}</h3>
                <p className="text-xs text-slate-500">{account.accountNumber} • Connected</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Last Synced</p>
                <p className="text-xs text-slate-300">{new Date(account.lastSync).toLocaleTimeString()}</p>
              </div>
              <button 
                onClick={() => handleUnlink(account.id)}
                className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        ))}

        <button
          onClick={() => setShowLinkModal(true)}
          className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed border-slate-800 p-12 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <Plus className="h-6 w-6" />
          </div>
          <span className="font-bold text-slate-500 group-hover:text-emerald-400">Add New Connection</span>
        </button>
      </div>

      {showLinkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/80 p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-[2rem] border border-slate-700/50 bg-[#1e293b] p-8 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Choose Provider</h2>
              <button onClick={() => setShowLinkModal(false)} className="text-slate-500 hover:text-white">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            
            <div className="grid gap-4">
              <button
                onClick={() => setLinkMode("bank")}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border p-6 text-left transition-all",
                  linkMode === "bank" ? "border-blue-500 bg-blue-500/10" : "border-slate-700 bg-slate-800/50 hover:bg-slate-700"
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                  <Landmark className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-white">Bank Account</p>
                  <p className="text-xs text-slate-500">Support for over 10,000 global banks.</p>
                </div>
              </button>

              <button
                onClick={() => setLinkMode("mobile_money")}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border p-6 text-left transition-all",
                  linkMode === "mobile_money" ? "border-yellow-500 bg-yellow-500/10" : "border-slate-700 bg-slate-800/50 hover:bg-slate-700"
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/20 text-yellow-400">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-white">Mobile Money</p>
                  <p className="text-xs text-slate-500">MTN, Airtel, Orange, M-PESA, etc.</p>
                </div>
              </button>
            </div>

            {linkMode && (
              <form onSubmit={handleCreateConnection} className="mt-8">
                <div className="rounded-xl bg-slate-800/50 p-4 border border-slate-700 mb-6 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-emerald-400" />
                  <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-wider font-bold">
                    This will open a secure window to verify your identity with the provider.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isLinking}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {isLinking ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Establishing Secure Link...
                    </>
                  ) : (
                    "Continue to Secure Link"
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
