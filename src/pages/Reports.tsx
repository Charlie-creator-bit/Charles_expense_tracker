import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart as BarChartIcon, AlertCircle, Wallet, ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react";
import { firebaseService } from "../services/firebaseService";
import { formatCurrency } from "../lib/utils";
import EmptyState from "../components/EmptyState";
import { BarChart3, Activity } from "lucide-react";

interface Transaction {
  _id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  type: "expense" | "income";
}

export default function Reports() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expData, incData] = await Promise.all([
        firebaseService.getExpenses(),
        firebaseService.getIncomes()
      ]);

      const combined: Transaction[] = [
        ...(expData as any[]).map(e => ({ ...e, type: "expense" as const })),
        ...(incData as any[]).map(i => ({ ...i, type: "income" as const }))
      ];

      setTransactions(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
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

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyTotals = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i);
    const m = d.getMonth();
    const y = d.getFullYear();
    
    const monthTransactions = transactions.filter(t => {
      const td = new Date(t.date);
      return td.getMonth() === m && td.getFullYear() === y;
    });

    const income = monthTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expense = monthTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      name: format(d, "MMM"),
      income,
      expense,
      balance: income - expense
    };
  }).reverse();

  const currentMonthExp = transactions
    .filter(t => t.type === "expense")
    .filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonthInc = transactions
    .filter(t => t.type === "income")
    .filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const prevMonthExp = transactions
    .filter(t => t.type === "expense")
    .filter(t => {
      const d = new Date(t.date);
      const pm = currentMonth === 0 ? 11 : currentMonth - 1;
      const py = currentMonth === 0 ? currentYear - 1 : currentYear;
      return d.getMonth() === pm && d.getFullYear() === py;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const expPercentChange = prevMonthExp > 0 ? ((currentMonthExp - prevMonthExp) / prevMonthExp) * 100 : 0;

  if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-400">Loading Report Data...</div>;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white font-display">Financial Analysis</h1>
        <p className="text-slate-400 font-sans">Detailed performance report for your expenditure and revenue nodes.</p>
      </header>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <div className="glass-card p-6 md:col-span-1 border-blue-500/10">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Balance</p>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${currentMonthInc - currentMonthExp >= 0 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}></div>
            <span className="text-lg font-bold text-white font-mono">{formatCurrency(currentMonthInc - currentMonthExp)}</span>
          </div>
        </div>

        <div className="glass-card p-6 md:col-span-1 border-rose-500/10">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Expense Drift (MOM)</p>
          <div className={`flex items-center gap-1 text-lg font-bold ${expPercentChange > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {expPercentChange > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {Math.abs(expPercentChange).toFixed(1)}%
          </div>
        </div>

        <div className="glass-card flex flex-col justify-center p-6 md:col-span-1 border-emerald-500/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Month Revenue</p>
          <h2 className="mt-1 text-2xl font-bold text-white font-mono">{formatCurrency(currentMonthInc)}</h2>
        </div>

        <div className="glass-card flex flex-col justify-center p-6 md:col-span-1 border-rose-500/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Month Expenditure</p>
          <h2 className="mt-1 text-2xl font-bold text-white font-mono">{formatCurrency(currentMonthExp)}</h2>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="glass-panel p-8 lg:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white font-display">Flow Dynamics</h3>
              <p className="text-xs text-slate-500 font-sans font-bold uppercase tracking-widest">6-Month Revenue vs Expenditure</p>
            </div>
            <BarChartIcon className="h-5 w-5 text-emerald-500" />
          </div>
          
          <div className="h-[350px] w-full flex flex-col">
            {transactions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTotals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                    tickFormatter={(val) => `GH₵${val}`}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                  <Bar dataKey="income" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expenditure" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <EmptyState 
                  icon={BarChart3}
                  title="No flow data detected"
                  description="A 6-month historical analysis requires active transaction nodes to be populated."
                  className="border-none bg-transparent p-0"
                />
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel p-8">
          <h3 className="mb-6 text-lg font-bold text-white font-display">Major Flux Nodes</h3>
          <div className="space-y-6">
            {transactions.filter(t => t.type === 'expense').length > 0 ? (
              transactions
                .filter(t => t.type === 'expense')
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map((expense) => (
                  <div key={expense._id} className="group relative">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white transition-colors group-hover:text-emerald-400">{expense.description}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{expense.category}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-rose-400">-{formatCurrency(expense.amount)}</span>
                        <button 
                          onClick={() => handleDeleteTransaction(expense._id, expense.type)}
                          className="text-slate-500 hover:text-rose-500 transition-all p-1"
                          title="Purge Record"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
                      <div 
                        className="h-full bg-slate-700 transition-all group-hover:bg-rose-500/50" 
                        style={{ width: `${Math.min(100, (expense.amount / (currentMonthExp || 1)) * 100)}%` }} 
                      />
                    </div>
                  </div>
                ))
            ) : (
              <EmptyState 
                icon={Activity}
                title="Stable parameters"
                description="No anomalies or major flux nodes detected in the current expenditure cycle."
                className="border-none bg-transparent py-12"
              />
            )}
          </div>
          
          <div className="mt-10 space-y-4">
            <div className="rounded-2xl bg-slate-900/50 p-4 border border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Top Revenue Source</span>
              </div>
              {transactions.filter(t => t.type === 'income').length > 0 ? (
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-white">{transactions.filter(t => t.type === 'income').sort((a,b) => b.amount - a.amount)[0].category}</span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">{formatCurrency(transactions.filter(t => t.type === 'income').sort((a,b) => b.amount - a.amount)[0].amount)}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">No data</span>
              )}
            </div>
            
            <button className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 transition-all hover:bg-slate-700 hover:text-white active:scale-95">
              Export Audit Payload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
