import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Wallet, Trash2, TrendingUp, ShoppingCart, Utensils, Car, Home, Zap, MoreHorizontal, RefreshCw, MessageSquare, User, Bell, AlertCircle, Radio, ShieldCheck } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { expenseService, Expense, Income, Budget, Reminder } from "../services/expenseService";
import { formatCurrency, cn } from "../lib/utils";
import { isPast, parseISO } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useUndo } from "../context/UndoContext";
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
  const [isLiveEnabled, setIsLiveEnabled] = useState(true);
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const { user } = useAuth();
  const { recordDeletion } = useUndo();

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

  const handleDeleteTransaction = async (tx: any) => {
    const typeLabel = tx.type === 'income' ? 'Revenue' : 'Expense';
    const amountLabel = tx.type === 'income' ? '+' : '-';
    
    // Formatting the system timestamp if available
    let systemTime = "";
    if (tx.createdAt) {
      const date = tx.createdAt.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
      systemTime = `\nRecorded: ${format(date, "MMM d, yyyy HH:mm:ss")}`;
    }

    const details = `[${typeLabel}] ${tx.description}\nAmount: ${amountLabel}${formatCurrency(tx.amount)}\nDate: ${format(new Date(tx.date), "MMM d, yyyy")}${systemTime}`;

    if (window.confirm(`Verify: Permanently purge this transaction record?\n\n${details}`)) {
      const originalData = { ...tx };
      
      // Optimistic Update: Remove from UI immediately for better responsiveness
      if (tx.type === 'expense') {
        setExpenses(prev => prev.filter(e => e.id !== tx.id));
      } else {
        setIncomes(prev => prev.filter(i => i.id !== tx.id));
      }

      try {
        if (tx.type === 'expense') {
          await expenseService.deleteExpense(tx.id);
        } else {
          await expenseService.deleteIncome(tx.id);
        }
        
        recordDeletion(
          { id: tx.id, type: tx.type as any, data: originalData },
          () => fetchData() // Callback to refresh data on undo
        );
      } catch (err) {
        console.error("Deletion failed:", err);
        // Revert state if the server operation fails
        fetchData();
      }
    }
  };

  const rawName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || "Operator";
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

  const greetings = ["Hey", "Yo", "Sup", "Hi", "Hello"];
  const greeting = greetings[new Date().getMinutes() % greetings.length];

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
    <div className="mx-auto max-w-md px-4 pb-24 pt-8 h-full min-h-screen">
      <header className="mb-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-display">{greeting}, {userName}</h1>
            <p className="text-xs text-slate-400">Ledger Intelligence Node</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
              onClick={() => setIsLiveEnabled(!isLiveEnabled)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase transition-all ring-1",
                isLiveEnabled ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" : "bg-slate-800 text-slate-500 ring-slate-700 hover:text-slate-300"
              )}
            >
              <Radio className={cn("h-3 w-3", isLiveEnabled && "animate-pulse")} />
              {isLiveEnabled ? "Live" : "Offline"}
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/20">
              <User className="h-5 w-5" />
            </div>
          </div>
        </div>

        {isLiveEnabled && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2.5rem] bg-indigo-500/10 border border-indigo-500/20 p-4 relative overflow-hidden"
          >
            <div className="flex items-start gap-3 relative z-10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Autonomous Detection Active</h3>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                  Your device's SMS notification bridge is linked. Transactions will be logged as they arrive.
                </p>
                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => setShowSMSModal(true)}
                    className="rounded-xl bg-indigo-500 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-indigo-400 active:scale-95 transition-all"
                  >
                    Bridge Hardware
                  </button>
                  <div className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 px-3 py-2 text-[10px] font-bold text-indigo-400 uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Ready
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-indigo-500/10 to-transparent"></div>
          </motion.div>
        )}
        
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
        
        {/* Main Balance Card */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-800 via-slate-900 to-[#0f172a] p-6 shadow-2xl border border-slate-700/50">
          <div className="relative z-10 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Net Liquidity</p>
            <h2 className="mt-2 text-4xl font-bold text-white tracking-tighter">
              {formatCurrency(totalIncome - totalSpent)}
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div 
                onClick={() => navigate("/income")}
                className="rounded-3xl bg-slate-800/80 p-4 border border-slate-700/50 cursor-pointer active:scale-95 transition-all group"
              >
                <p className="text-[9px] font-bold text-slate-500/80 uppercase mb-0.5">Inflow</p>
                <p className="text-base font-bold text-emerald-400 group-hover:scale-105 transition-transform">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="rounded-3xl bg-slate-800/80 p-4 border border-slate-700/50 group">
                <p className="text-[9px] font-bold text-slate-500/80 uppercase mb-0.5">Outflow</p>
                <p className="text-base font-bold text-rose-400 group-hover:scale-105 transition-transform">{formatCurrency(totalSpent)}</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-indigo-500/5 blur-2xl"></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 mb-2">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Manual Overrides</h4>
          </div>
          <button
            onClick={() => setShowIncomeModal(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400 transition-all active:scale-90"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Inflow</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400 transition-all active:scale-90"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Outflow</span>
          </button>
          <button
            onClick={() => navigate("/reports")}
            className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-slate-800/50 border border-slate-700/50 p-4 text-slate-300 transition-all active:scale-90"
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Analysis</span>
          </button>
          <button
            onClick={() => setShowSMSModal(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-slate-800/50 border border-slate-700/50 p-4 text-slate-300 transition-all active:scale-90"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">History</span>
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
          <AnimatePresence initial={false}>
            {transactions.map((tx) => (
              <motion.div 
                key={tx.id} 
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group flex items-center gap-4 rounded-3xl bg-slate-800/20 border border-slate-700/30 p-4 transition-all active:bg-slate-800/50"
              >
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
                    handleDeleteTransaction(tx);
                  }}
                  className="ml-2 h-10 w-10 flex shrink-0 items-center justify-center rounded-2xl bg-slate-800/50 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-700/50 transition-all active:scale-90"
                  title="Delete transaction"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
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
          initialListening={isLiveEnabled}
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
