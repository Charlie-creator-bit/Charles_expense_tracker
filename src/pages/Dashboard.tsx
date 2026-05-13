import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Wallet, Trash2, TrendingUp, ShoppingCart, Utensils, Car, Home, Zap, MoreHorizontal, RefreshCw, MessageSquare, User, Bell, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { expenseService, Expense, Income, Budget, Reminder } from "../services/expenseService";
import { formatCurrency, cn } from "../lib/utils";
import { isPast, parseISO } from "date-fns";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import SMSImporter from "../components/SMSImporter";

const CATEGORIES = [
  { name: "Food", icon: <Utensils className="h-4 w-4" />, color: "#6366f1" },
  { name: "Transport", icon: <Car className="h-4 w-4" />, color: "#ec4899" },
  { name: "Shopping", icon: <ShoppingCart className="h-4 w-4" />, color: "#f59e0b" },
  { name: "Housing", icon: <Home className="h-4 w-4" />, color: "#10b981" },
  { name: "Bills", icon: <Zap className="h-4 w-4" />, color: "#ef4444" },
  { name: "Other", icon: <MoreHorizontal className="h-4 w-4" />, color: "#64748b" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [budget, setBudget] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const { user } = useAuth();

  // New Expense form state
  const [newExpense, setNewExpense] = useState({
    amount: "",
    category: "Food",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  // New Income form state
  const [newIncome, setNewIncome] = useState({
    amount: "",
    source: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const now = new Date();
      const [expData, incData, budgetData, accountsData, reminderData] = await Promise.all([
        expenseService.getExpenses(),
        expenseService.getIncome(),
        expenseService.getBudget(now.getMonth(), now.getFullYear()),
        expenseService.getLinkedAccounts(),
        expenseService.getReminders()
      ]);
      setExpenses(expData);
      setIncomes(incData);
      setBudget(budgetData?.amount || 0);
      setLinkedAccounts(accountsData);
      setReminders(reminderData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const overdueReminders = reminders.filter(r => !r.isCompleted && isPast(parseISO(r.time)));

  const currentMonthExpenses = expenses.filter(e => {
    const date = new Date(e.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const currentMonthIncomes = incomes.filter(i => {
    const date = new Date(i.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = currentMonthIncomes.reduce((sum, i) => sum + i.amount, 0);
  const netBalance = totalIncome - totalSpent;

  const chartData = CATEGORIES.map(cat => ({
    name: cat.name,
    value: currentMonthExpenses.filter(e => e.category === cat.name).reduce((sum, e) => sum + e.amount, 0),
    color: cat.color
  })).filter(d => d.value > 0);

  const handleAddExpense = async (e: any) => {
    e.preventDefault();
    try {
      await expenseService.addExpense({
        ...newExpense,
        amount: parseFloat(newExpense.amount)
      });
      setShowAddModal(false);
      setNewExpense({
        amount: "",
        category: "Food",
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddIncome = async (e: any) => {
    e.preventDefault();
    try {
      await expenseService.addIncome({
        ...newIncome,
        amount: parseFloat(newIncome.amount)
      });
      setShowIncomeModal(false);
      setNewIncome({
        amount: "",
        source: "",
        date: format(new Date(), "yyyy-MM-dd"),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await expenseService.syncTransactions();
    await fetchData();
    setIsSyncing(false);
  };

  const handleDeleteTransaction = async (id: string, type: 'expense' | 'income') => {
    if (window.confirm("Verify: Permanently purge this transaction record?")) {
      // Optimistic Update: Remove from UI immediately for better responsiveness
      if (type === 'expense') {
        setExpenses(prev => prev.filter(e => e.id !== id));
      } else {
        setIncomes(prev => prev.filter(i => i.id !== id));
      }

      try {
        if (type === 'expense') {
          await expenseService.deleteExpense(id);
        } else {
          await expenseService.deleteIncome(id);
        }
        // No need to fetchData() here because we already updated the state optimistically
      } catch (err) {
        console.error("Deletion failed:", err);
        // Revert state if the server operation fails
        fetchData();
      }
    }
  };

  const userName = user?.displayName || user?.email?.split('@')[0] || "Operator";

  const allTransactions = [
    ...expenses.map(e => ({ ...e, type: 'expense' as const })),
    ...incomes.map(i => ({ ...i, type: 'income' as const, description: i.source, category: 'Income' }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const categoryTotals = CATEGORIES.reduce((acc, cat) => {
    acc[cat.name] = expenses.filter(e => e.category === cat.name).reduce((sum, e) => sum + e.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  const transactions = allTransactions.slice(0, 8);

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8 h-full min-h-screen">
      <header className="mb-8 flex flex-col gap-6">
        {overdueReminders.length > 0 && (
          <div 
            onClick={() => navigate("/reminders")}
            className="mb-2 flex items-center justify-between rounded-3xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400 animate-pulse active:scale-95 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/20">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest leading-none">Alert Node Active</p>
                <p className="mt-1 text-[10px] font-medium opacity-80">{overdueReminders.length} reminder{overdueReminders.length > 1 ? 's' : ''} require attention</p>
              </div>
            </div>
            <AlertCircle className="h-4 w-4" />
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-display">Hey, {userName}</h1>
            <p className="text-xs text-slate-400">Total Activity Node</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
            <User className="h-5 w-5" />
          </div>
        </div>
        
        {/* Main Balance Card */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-500 via-emerald-500 to-emerald-600 p-8 shadow-2xl shadow-emerald-500/20">
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 opacity-80">Available Liquidity</p>
            <h2 className="mt-2 text-4xl font-bold text-white tracking-tighter">
              {formatCurrency(totalIncome - totalSpent)}
            </h2>
            <div className="mt-8 flex gap-4">
              <div className="flex-1 rounded-2xl bg-white/10 p-3 backdrop-blur-md border border-white/10">
                <p className="text-[10px] font-bold text-emerald-100/60 uppercase">Inflow</p>
                <p className="text-sm font-bold text-white">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="flex-1 rounded-2xl bg-white/10 p-3 backdrop-blur-md border border-white/10">
                <p className="text-[10px] font-bold text-emerald-100/60 uppercase">Outflow</p>
                <p className="text-sm font-bold text-white">{formatCurrency(totalSpent)}</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-black/10 blur-3xl"></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowSMSModal(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-blue-500/10 border border-blue-500/20 p-4 text-blue-400 transition-all active:scale-90"
          >
            <MessageSquare className="h-6 w-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">SMS Sync</span>
          </button>
          <button
            onClick={() => navigate("/reports")}
            className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-slate-800/50 border border-slate-700/50 p-4 text-slate-300 transition-all active:scale-90"
          >
            <TrendingUp className="h-6 w-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Reports</span>
          </button>
          <button
            onClick={() => setShowIncomeModal(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-emerald-500 p-4 text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-90"
          >
            <Plus className="h-6 w-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Add Income</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-rose-500 p-4 text-white shadow-lg shadow-rose-500/20 transition-all active:scale-90"
          >
            <Plus className="h-6 w-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Add Expense</span>
          </button>
        </div>
      </header>

      {/* Categories Grid (Mobile UI) */}
      <section className="mb-10 overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Categories</h3>
          <span className="text-[10px] text-slate-500 uppercase font-bold">Scroll</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
          {CATEGORIES.map((cat) => {
            const amount = categoryTotals[cat.name] || 0;
            const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
            return (
              <div key={cat.name} className="flex-shrink-0 w-32 glass-panel p-4 rounded-3xl border border-slate-700/30">
                <div 
                  className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${cat.color}33`, color: cat.color }}
                >
                  {cat.icon}
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">{cat.name}</p>
                <p className="mt-1 text-sm font-bold text-white">{formatCurrency(amount)}</p>
                <div className="mt-3 h-1 w-full rounded-full bg-slate-800">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ backgroundColor: cat.color, width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Recent Activity</h3>
          <button onClick={fetchData} className="text-slate-500 hover:text-white transition-colors">
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          </button>
        </div>
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="group flex items-center gap-4 rounded-3xl bg-slate-800/30 border border-slate-700/30 p-4 transition-all active:bg-slate-800/50">
              <div className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                tx.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
              )}>
                {tx.type === "income" ? <TrendingUp className="h-6 w-6" /> : <ShoppingCart className="h-6 w-6" />}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-bold text-white">{tx.description}</p>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{tx.type === 'expense' ? tx.category : tx.source}</p>
              </div>
              <div className="text-right">
                <p className={cn(
                  "text-sm font-bold font-mono",
                  tx.type === "income" ? "text-emerald-400" : "text-white"
                )}>
                  {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                </p>
                <p className="text-[10px] text-slate-500">{format(new Date(tx.date), "MMM d")}</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTransaction(tx.id, tx.type);
                }}
                className="ml-2 h-8 w-8 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50 text-slate-600">
                <RefreshCw className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-slate-500">No transactions recorded yet</p>
              <p className="text-xs text-slate-600 mt-1">Try the SMS Sync feature</p>
            </div>
          )}
        </div>
      </section>

      {showSMSModal && (
        <SMSImporter 
          onSuccess={fetchData} 
          onClose={() => setShowSMSModal(false)} 
        />
      )}

      {/* Add Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/80 p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-[2rem] border border-slate-700/50 bg-[#1e293b] p-8 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white font-display">Add Income</h2>
              <button onClick={() => setShowIncomeModal(false)} className="text-slate-500 hover:text-white">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddIncome} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold">GH₵</span>
                  <input
                    type="number"
                    required
                    value={newIncome.amount}
                    onChange={e => setNewIncome({ ...newIncome, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3.5 pl-10 pr-4 text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Source</label>
                <input
                  type="text"
                  required
                  value={newIncome.source}
                  onChange={e => setNewIncome({ ...newIncome, source: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3.5 text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  placeholder="e.g. Salary, Dividend, Gift"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Date</label>
                <input
                  type="date"
                  required
                  value={newIncome.date}
                  onChange={e => setNewIncome({ ...newIncome, date: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3.5 text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 [scheme:dark]"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
                  className="flex-1 rounded-xl bg-slate-800 py-3.5 font-bold text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-500 py-3.5 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
                >
                  Save Income
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/80 p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-[2rem] border border-slate-700/50 bg-[#1e293b] p-8 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white font-display">Add Expense</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold">GH₵</span>
                  <input
                    type="number"
                    required
                    value={newExpense.amount}
                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3.5 pl-10 pr-4 text-white placeholder-slate-600 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Category</label>
                <select
                  value={newExpense.category}
                  onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3.5 text-white focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.name} value={cat.name} className="bg-[#1e293b]">{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Description</label>
                <input
                  type="text"
                  required
                  value={newExpense.description}
                  onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3.5 text-white placeholder-slate-600 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                  placeholder="What was it for?"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Date</label>
                <input
                  type="date"
                  required
                  value={newExpense.date}
                  onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3.5 text-white focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/50 [scheme:dark]"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl bg-slate-800 py-3.5 font-bold text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-rose-500 py-3.5 font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-400"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
