import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Plus, Wallet, TrendingUp, AlertCircle, ShoppingBag, Utensils, Car, Home, Zap, MoreHorizontal } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { auth } from "../lib/firebase";
import { firebaseService } from "../services/firebaseService";
import { formatCurrency } from "../lib/utils";
import { motion } from "motion/react";

interface Expense {
  _id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
}

const CATEGORIES = [
  { name: "Food", icon: <Utensils className="h-4 w-4" />, color: "#6366f1" },
  { name: "Transport", icon: <Car className="h-4 w-4" />, color: "#ec4899" },
  { name: "Shopping", icon: <ShoppingBag className="h-4 w-4" />, color: "#f59e0b" },
  { name: "Housing", icon: <Home className="h-4 w-4" />, color: "#10b981" },
  { name: "Bills", icon: <Zap className="h-4 w-4" />, color: "#ef4444" },
  { name: "Other", icon: <MoreHorizontal className="h-4 w-4" />, color: "#64748b" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // New Expense form state
  const [newExpense, setNewExpense] = useState({
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
      const [expData, budgetData] = await Promise.all([
        firebaseService.getExpenses(),
        firebaseService.getBudget(now.getMonth(), now.getFullYear())
      ]);
      setExpenses(expData as any);
      setBudget((budgetData as any)?.amount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentMonthExpenses = expenses.filter(e => {
    const date = new Date(e.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = Math.max(0, budget - totalSpent);

  const chartData = CATEGORIES.map(cat => ({
    name: cat.name,
    value: currentMonthExpenses.filter(e => e.category === cat.name).reduce((sum, e) => sum + e.amount, 0),
    color: cat.color
  })).filter(d => d.value > 0);

  const handleAddExpense = async (e: any) => {
    e.preventDefault();
    try {
      await firebaseService.addExpense({
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

  if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-400">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Good morning, {auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User'}</h1>
          <p className="text-slate-400">Here's your financial overview for {format(new Date(), "MMMM yyyy")}.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          New Expense
        </button>
      </header>

      {/* Stats Cards Row */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="glass-card relative overflow-hidden p-6">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-3xl"></div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Total Spent</p>
          <h2 className="text-4xl font-bold text-white">{formatCurrency(totalSpent)}</h2>
          <p className="mt-3 flex items-center gap-1 text-xs font-bold text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            Active month
          </p>
        </div>

        <div className="glass-card p-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Remaining Budget</p>
          <h2 className="text-4xl font-bold text-white">{formatCurrency(remainingBudget)}</h2>
          <div className="mt-5 flex items-center gap-4">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000" 
                style={{ width: `${Math.min(100, (totalSpent / (budget || 1)) * 100)}%` }}
              ></div>
            </div>
            <span className="text-xs font-bold text-blue-400">
              {budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0}%
            </span>
          </div>
        </div>

        <div className="glass-card relative overflow-hidden p-6">
          <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-rose-500/10 blur-3xl"></div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Target</p>
          <h2 className="text-4xl font-bold text-white">{formatCurrency(budget)}</h2>
          <button 
            onClick={() => navigate("/profile")}
            className="mt-3 text-xs font-bold text-slate-400 hover:text-white hover:underline"
          >
            Adjust Target
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Recent Transactions */}
        <section className="lg:col-span-3">
          <h3 className="mb-4 px-2 text-lg font-bold text-white">Recent Transactions</h3>
          <div className="glass-panel min-h-[400px]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700/30 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <th className="px-6 py-4">Transaction</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {expenses.slice(0, 7).map((expense) => (
                  <tr key={expense._id} className="border-b border-slate-700/10 transition-colors hover:bg-slate-700/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/50 bg-slate-800 text-slate-300">
                          {CATEGORIES.find(c => c.name === expense.category)?.icon || <MoreHorizontal className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-white">{expense.description}</p>
                          <p className="text-[10px] text-slate-500">{format(new Date(expense.date), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-slate-700/50 px-2 py-1 text-[10px] font-bold uppercase text-slate-400 border border-slate-600/30">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-rose-400">
                      -{formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-20 text-center text-slate-500">No transactions recorded yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Spending Breakdown */}
        <section className="lg:col-span-2">
          <h3 className="mb-4 px-2 text-lg font-bold text-white">Spending Mix</h3>
          <div className="glass-panel flex h-full flex-col p-6">
            <div className="mb-6 flex aspect-square w-full items-center justify-center py-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: '#f1f5f9' }}
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
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <div className="h-32 w-32 rounded-full border-[12px] border-slate-700/50"></div>
                  <span className="text-xs font-bold uppercase tracking-widest">No Mix Data</span>
                </div>
              )}
            </div>
            
            <div className="mt-auto space-y-4">
              {chartData.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-slate-300">{item.name}</span>
                  </div>
                  <span className="font-mono text-sm text-white">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/80 p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-[2rem] border border-slate-700/50 bg-[#1e293b] p-8 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white text-display">Add Expense</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold">$</span>
                  <input
                    type="number"
                    required
                    value={newExpense.amount}
                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3.5 pl-10 pr-4 text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Category</label>
                <select
                  value={newExpense.category}
                  onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3.5 text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3.5 text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  placeholder="What was it for?"
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
                  className="flex-1 rounded-xl bg-emerald-500 py-3.5 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, amount, icon, color, action }: any) {
  const bgStyles: any = {
    indigo: "bg-indigo-50 border-indigo-100",
    emerald: "bg-emerald-50 border-emerald-100",
    rose: "bg-rose-50 border-rose-100",
    slate: "bg-slate-50 border-slate-100",
  };

  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${bgStyles[color]}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-xl bg-white p-2 shadow-sm">{icon}</div>
        {action}
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        <p className="text-2xl font-bold text-slate-900">{formatCurrency(amount)}</p>
      </div>
    </div>
  );
}
