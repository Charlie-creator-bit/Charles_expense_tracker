import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Plus, Wallet, TrendingUp, AlertCircle, ShoppingBag, Utensils, Car, Home, Zap, MoreHorizontal, TrendingDown, DollarSign, Loader2, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { auth } from "../lib/firebase";
import { firebaseService } from "../services/firebaseService";
import { formatCurrency } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import EmptyState from "../components/EmptyState";
import { FileText, PieChart as PieChartIcon } from "lucide-react";

interface Transaction {
  _id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  type: "expense" | "income";
}

const EXPENSE_CATEGORIES = [
  { name: "Food", icon: <Utensils className="h-4 w-4" />, color: "#6366f1" },
  { name: "Transport", icon: <Car className="h-4 w-4" />, color: "#ec4899" },
  { name: "Shopping", icon: <ShoppingBag className="h-4 w-4" />, color: "#f59e0b" },
  { name: "Housing", icon: <Home className="h-4 w-4" />, color: "#10b981" },
  { name: "Bills", icon: <Zap className="h-4 w-4" />, color: "#ef4444" },
  { name: "Other", icon: <MoreHorizontal className="h-4 w-4" />, color: "#64748b" },
];

const INCOME_CATEGORIES = [
  { name: "Salary", icon: <Wallet className="h-4 w-4" />, color: "#10b981" },
  { name: "Freelance", icon: <Zap className="h-4 w-4" />, color: "#6366f1" },
  { name: "Investment", icon: <TrendingUp className="h-4 w-4" />, color: "#f59e0b" },
  { name: "Gift", icon: <ShoppingBag className="h-4 w-4" />, color: "#ec4899" },
  { name: "Other", icon: <MoreHorizontal className="h-4 w-4" />, color: "#64748b" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState(0);
  const [budgetInput, setBudgetInput] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetMessage, setBudgetMessage] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // New Transaction form state
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense");
  const [newTransaction, setNewTransaction] = useState({
    amount: "",
    category: "Food",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const now = new Date();
      const [expData, incData, budgetData] = await Promise.all([
        firebaseService.getExpenses(),
        firebaseService.getIncomes(),
        firebaseService.getBudget(now.getMonth(), now.getFullYear())
      ]);
      
      const combined: Transaction[] = [
        ...(expData as any[]).map(e => ({ ...e, type: "expense" as const })),
        ...(incData as any[]).map(i => ({ ...i, type: "income" as const }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(combined);
      const bAmount = (budgetData as any)?.amount || 0;
      setBudget(bAmount);
      setBudgetInput(bAmount.toString());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const now = new Date();
  const currentMonthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const totalSpent = currentMonthTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalIncome = currentMonthTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalSpent;
  const remainingBudget = Math.max(0, budget - totalSpent);

  const chartData = EXPENSE_CATEGORIES.map(cat => ({
    name: cat.name,
    value: currentMonthTransactions
      .filter(t => t.type === "expense" && t.category === cat.name)
      .reduce((sum, t) => sum + t.amount, 0),
    color: cat.color
  })).filter(d => d.value > 0);

  const handleAddTransaction = async (e: any) => {
    e.preventDefault();
    try {
      const data = {
        ...newTransaction,
        amount: parseFloat(newTransaction.amount)
      };

      if (transactionType === "expense") {
        await firebaseService.addExpense(data);
      } else {
        await firebaseService.addIncome(data);
      }

      setShowAddModal(false);
      setNewTransaction({
        amount: "",
        category: transactionType === "expense" ? "Food" : "Salary",
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBudget = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingBudget(true);
    setBudgetMessage("");
    try {
      const now = new Date();
      await firebaseService.upsertBudget(parseFloat(budgetInput), now.getMonth(), now.getFullYear());
      setBudget(parseFloat(budgetInput));
      setBudgetMessage("Target parameters synchronized.");
      setTimeout(() => setBudgetMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setBudgetMessage("Synchronization failure.");
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleDeleteTransaction = async (id: string, type: "expense" | "income") => {
    if (!window.confirm("CRITICAL: Purge this transaction record from the ledger?")) return;
    try {
      if (type === "expense") {
        await firebaseService.deleteExpense(id);
      } else {
        await firebaseService.deleteIncome(id);
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-400">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-display">
            Good morning, {auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-slate-400 font-sans">Here's your financial overview for {format(new Date(), "MMMM yyyy")}.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Add Transaction
        </button>
      </header>

      {/* Stats Cards Row */}
      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <div className="glass-card relative overflow-hidden p-6 border-emerald-500/10">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-3xl"></div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Total Income</p>
          <h2 className="text-3xl font-bold text-white font-mono">{formatCurrency(totalIncome)}</h2>
          <p className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
            <TrendingUp className="h-3 w-3" />
            Inbound Flow
          </p>
        </div>

        <div className="glass-card relative overflow-hidden p-6 border-rose-500/10">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-rose-500/10 blur-3xl"></div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Total Spent</p>
          <h2 className="text-3xl font-bold text-white font-mono">{formatCurrency(totalSpent)}</h2>
          <p className="mt-3 flex items-center gap-1 text-[10px] font-bold text-rose-400 uppercase tracking-widest">
            <TrendingDown className="h-3 w-3" />
            Outbound Flow
          </p>
        </div>

        <div className="glass-card relative overflow-hidden p-6 border-blue-500/10">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-500/10 blur-3xl"></div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Net Balance</p>
          <h2 className={`text-3xl font-bold font-mono ${balance >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
            {formatCurrency(balance)}
          </h2>
          <p className="mt-3 flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Wallet className="h-3 w-3" />
            Current Surplus
          </p>
        </div>

        <div className="glass-card p-6 border-slate-700/50">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Budget Health</p>
          <h2 className="text-3xl font-bold text-white font-mono">{formatCurrency(remainingBudget)}</h2>
          <div className="mt-5 flex items-center gap-4">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000" 
                style={{ width: `${Math.min(100, (totalSpent / (budget || 1)) * 100)}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-bold text-blue-400 font-mono">
              {budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Recent Transactions */}
        <section className="lg:col-span-3">
          <h3 className="mb-4 px-2 text-lg font-bold text-white font-display">Recent History</h3>
          <div className="glass-panel min-h-[400px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-700/30 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <th className="px-6 py-4">Transaction</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {transactions.slice(0, 10).map((t) => (
                    <tr key={t._id} className="border-b border-slate-700/10 transition-colors hover:bg-slate-700/20 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full border bg-slate-800/80 ${t.type === 'income' ? 'border-emerald-500/30 text-emerald-400' : 'border-slate-700/50 text-slate-300'}`}>
                            {t.type === 'income' 
                              ? (INCOME_CATEGORIES.find(c => c.name === t.category)?.icon || <TrendingUp className="h-4 w-4" />)
                              : (EXPENSE_CATEGORIES.find(c => c.name === t.category)?.icon || <MoreHorizontal className="h-4 w-4" />)
                            }
                          </div>
                          <div>
                            <p className="font-medium text-white">{t.description}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{format(new Date(t.date), "MMM d, yyyy")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded bg-slate-700/50 px-2 py-1 text-[10px] font-bold uppercase text-slate-400 border border-slate-600/30">
                          {t.category}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteTransaction(t._id, t.type)}
                          className="text-slate-500 hover:text-rose-500 transition-all p-1"
                          title="Purge Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {transactions.length === 0 && (
              <EmptyState 
                icon={FileText}
                title="No activities recorded"
                description="Your transaction log is currently empty. Initialize a new inbound or outbound flow to begin tracking."
                className="border-none bg-transparent"
                action={
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="rounded-xl bg-emerald-500/10 px-6 py-2 text-xs font-bold uppercase tracking-widest text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
                  >
                    Quick Add
                  </button>
                }
              />
            )}
          </div>
        </section>

        {/* Spending Breakdown */}
        <section className="lg:col-span-2">
          <h3 className="mb-4 px-2 text-lg font-bold text-white font-display">Expense Mix</h3>
          <div className="glass-panel flex h-full flex-col p-6 min-h-[400px]">
            {chartData.length > 0 ? (
              <>
                <div className="mb-6 flex aspect-square w-full items-center justify-center py-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}
                        itemStyle={{ color: '#f1f5f9', fontWeight: 'bold', fontSize: '12px' }}
                      />
                      <Pie
                        data={chartData}
                        innerRadius="65%"
                        outerRadius="85%"
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-auto space-y-4">
                  {chartData.map(item => (
                    <div key={item.name} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full shadow-lg" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}40` }}></div>
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{item.name}</span>
                      </div>
                      <span className="font-mono text-sm text-white font-bold">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center">
                <EmptyState 
                  icon={PieChartIcon}
                  title="No expenditure mix"
                  description="Initialise at least one expenditure node to visualise your sectoral distribution."
                  className="border-none bg-transparent p-0"
                />
              </div>
            )}
          </div>
        </section>

        {/* Budget Calibration */}
        <section className="lg:col-span-2">
          <h3 className="mb-4 px-2 text-lg font-bold text-white font-display">Target Calibration</h3>
          <div className="glass-panel p-8">
            <p className="mb-6 text-xs text-slate-500 font-sans font-bold uppercase tracking-widest">Adjust Monthly Expenditure Limit</p>
            <form onSubmit={handleUpdateBudget} className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold">GH₵</span>
                <input
                  type="number"
                  required
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800/40 py-4 pl-10 pr-4 text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono text-sm"
                  placeholder="0.00"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingBudget}
                className="w-full rounded-2xl bg-blue-500/10 border border-blue-500/20 py-4 text-xs font-bold uppercase tracking-widest text-blue-400 transition-all hover:bg-blue-500 hover:text-white disabled:opacity-50"
              >
                {isSavingBudget ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Update Threshold"}
              </button>
            </form>
            {budgetMessage && (
              <motion.p 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 text-center text-[10px] font-bold uppercase tracking-widest ${budgetMessage.includes('failure') ? 'text-rose-400' : 'text-emerald-400'}`}
              >
                {budgetMessage}
              </motion.p>
            )}
          </div>
        </section>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/90 p-4 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-[2.5rem] border border-slate-700/50 bg-[#1e293b]/95 p-8 shadow-2xl backdrop-blur-sm"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white font-display">New Entry</h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors">
                  <Plus className="h-6 w-6 rotate-45" />
                </button>
              </div>

              {/* Type Selector */}
              <div className="mb-8 flex rounded-2xl bg-slate-900/50 p-1.5 border border-slate-800">
                <button
                  onClick={() => {
                    setTransactionType("expense");
                    setNewTransaction(prev => ({ ...prev, category: "Food" }));
                  }}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${transactionType === 'expense' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Expense
                </button>
                <button
                  onClick={() => {
                    setTransactionType("income");
                    setNewTransaction(prev => ({ ...prev, category: "Salary" }));
                  }}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${transactionType === 'income' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Income
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-6">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Credits/Debits</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold">GH₵</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={newTransaction.amount}
                      onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-800/40 py-4 pl-10 pr-4 text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Sector Class</label>
                  <select
                    value={newTransaction.category}
                    onChange={e => setNewTransaction({ ...newTransaction, category: e.target.value })}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800/40 px-4 py-4 text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm font-bold uppercase tracking-widest appearance-none"
                  >
                    {(transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                      <option key={cat.name} value={cat.name} className="bg-[#1e293b]">{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Log Description</label>
                  <input
                    type="text"
                    required
                    value={newTransaction.description}
                    onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800/40 px-4 py-4 text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm"
                    placeholder="Brief transaction log..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 rounded-2xl bg-slate-800 py-4 text-xs font-bold uppercase tracking-widest text-slate-400 transition-all hover:bg-slate-700 hover:text-slate-200"
                  >
                    Abort
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 rounded-2xl py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl transition-all ${transactionType === 'expense' ? 'bg-rose-500 shadow-rose-500/20 hover:bg-rose-400' : 'bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-400'}`}
                  >
                    Commit Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
