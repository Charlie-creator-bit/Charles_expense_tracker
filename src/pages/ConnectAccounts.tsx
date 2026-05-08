import { useState, useEffect } from "react";
import { 
  Plus, 
  Smartphone, 
  Building2, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  CreditCard
} from "lucide-react";
import { firebaseService } from "../services/firebaseService";
import { motion, AnimatePresence } from "motion/react";
import EmptyState from "../components/EmptyState";

interface ConnectedAccount {
  _id: string;
  provider: string;
  accountType: "bank" | "mobile_money";
  accountMask: string;
  status: "active" | "disconnected" | "error";
  lastSynced: string;
}

const PROVIDERS = [
  { name: "MTN MoMo", type: "mobile_money", icon: <Smartphone className="h-5 w-5" />, color: "#fbbf24" },
  { name: "Telecel Cash", type: "mobile_money", icon: <Smartphone className="h-5 w-5" />, color: "#ef4444" },
  { name: "AT Money", type: "mobile_money", icon: <Smartphone className="h-5 w-5" />, color: "#3b82f6" },
  { name: "GCB Bank", type: "bank", icon: <Building2 className="h-5 w-5" />, color: "#1e3a8a" },
  { name: "Ecobank", type: "bank", icon: <Building2 className="h-5 w-5" />, color: "#0369a1" },
  { name: "Stanbic Bank", type: "bank", icon: <Building2 className="h-5 w-5" />, color: "#1d4ed8" },
  { name: "Fidelity Bank", type: "bank", icon: <Building2 className="h-5 w-5" />, color: "#eab308" },
];

export default function ConnectAccounts() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await firebaseService.getAccounts();
      setAccounts(data as any);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkAccount = async () => {
    if (!selectedProvider) return;
    setIsLinking(true);
    try {
      // Simulate OAuth/Widget handshake
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newAcc = {
        provider: selectedProvider.name,
        accountType: selectedProvider.type,
        accountMask: (Math.floor(Math.random() * 9000) + 1000).toString(),
      };
      
      await firebaseService.addAccount(newAcc);
      await fetchAccounts();
      setShowLinkModal(false);
      setSelectedProvider(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLinking(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm("Sever connection to this financial node? Auto-sync will be disabled.")) return;
    try {
      await firebaseService.deleteAccount(id);
      setAccounts(accounts.filter(a => a._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      // Simulate pulling transactions
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Update lastSynced locally
      setAccounts(accounts.map(a => 
        a._id === id ? { ...a, lastSynced: new Date().toISOString() } : a
      ));
      
      // In a real app, this would trigger a backend process that populates expenses/incomes
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingId(null);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-400">Scanning financial landscape...</div>;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-display">Financial Nodes</h1>
          <p className="text-slate-400 font-sans">Connect your bank and mobile money accounts for real-time synchronization.</p>
        </div>
        <button
          onClick={() => setShowLinkModal(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-6 py-4 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-400 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Establish New Link
        </button>
      </header>

      {/* Security Banner */}
      <div className="mb-10 flex items-center gap-4 rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-6 backdrop-blur-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Military Grade Encryption</h3>
          <p className="text-xs text-slate-400">All connections are secured via 256-bit AES encryption. Ledger.io never stores your login credentials.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((acc) => (
          <motion.div
            layout
            key={acc._id}
            className="group relative overflow-hidden glass-card p-6 border-slate-700/50 hover:border-blue-500/30 transition-all duration-300"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 text-white shadow-inner">
                {acc.accountType === 'mobile_money' ? <Smartphone className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleSync(acc._id)}
                  disabled={syncingId === acc._id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition-all hover:bg-emerald-500 hover:text-white disabled:opacity-50"
                  title="Sync Transactions"
                >
                  <RefreshCw className={`h-4 w-4 ${syncingId === acc._id ? 'animate-spin' : ''}`} />
                </button>
                <button 
                  onClick={() => handleDeleteAccount(acc._id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition-all hover:bg-rose-500 hover:text-white"
                  title="Disconnect"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-bold text-white">{acc.provider}</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">**** {acc.accountMask}</p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${acc.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{acc.status}</span>
                </div>
                <span className="text-[10px] font-medium text-slate-600">
                  Reflected {new Date(acc.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </motion.div>
        ))}

        {accounts.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3">
            <EmptyState 
              icon={CreditCard}
              title="No Financial Nodes"
              description="Connect your Ghanaian bank or Mobile Money accounts to enable automatic transaction reflection."
              action={
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="group flex items-center gap-2 rounded-xl bg-blue-500/10 px-8 py-3 text-xs font-bold uppercase tracking-widest text-blue-400 transition-all hover:bg-blue-500 hover:text-white"
                >
                  Start Integration
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              }
            />
          </div>
        )}
      </div>

      {/* Link Account Modal */}
      <AnimatePresence>
        {showLinkModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/95 p-4 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl rounded-[3rem] border border-slate-700/50 bg-[#1e293b]/90 p-10 shadow-2xl"
            >
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white font-display">Secure Pipeline Setup</h2>
                  <p className="text-sm text-slate-400">Select your financial service provider to begin.</p>
                </div>
                <button onClick={() => setShowLinkModal(false)} className="text-slate-500 hover:text-white transition-colors">
                  <Plus className="h-8 w-8 rotate-45" />
                </button>
              </div>

              {!selectedProvider ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => setSelectedProvider(p)}
                      className="flex items-center gap-4 rounded-[1.5rem] border border-slate-800 bg-slate-900/40 p-5 text-left transition-all hover:border-blue-500/50 hover:bg-slate-800/60 group"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 group-hover:text-blue-400 transition-colors">
                        {p.icon}
                      </div>
                      <div>
                        <p className="font-bold text-white leading-tight">{p.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{p.type.replace('_', ' ')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-10 py-6 text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    {selectedProvider.icon}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">Authorize {selectedProvider.name}</h3>
                    <p className="mx-auto max-w-sm text-sm text-slate-400">
                      You will be redirected to {selectedProvider.name}'s secure portal to authorize Ledger.io to reflect your transaction data.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setSelectedProvider(null)}
                      className="flex-1 rounded-2xl bg-slate-800 py-4 text-xs font-bold uppercase tracking-widest text-slate-400 transition-all hover:bg-slate-700 hover:text-white"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleLinkAccount}
                      disabled={isLinking}
                      className="flex-1 rounded-2xl bg-blue-500 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-400 active:scale-95 disabled:opacity-50"
                    >
                      {isLinking ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Authorize Link"}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified Secure by Ledger Security
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
