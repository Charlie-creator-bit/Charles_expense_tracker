import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart } from "recharts";
import { TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart as BarChartIcon, AlertCircle } from "lucide-react";
import { firebaseService } from "../services/firebaseService";
import { formatCurrency } from "../lib/utils";

interface Expense {
  _id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
}

export default function Reports() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await firebaseService.getExpenses();
      setExpenses(data as any);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTotals = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i);
    const m = d.getMonth();
    const y = d.getFullYear();
    const total = expenses
      .filter(e => {
        const ed = new Date(e.date);
        return ed.getMonth() === m && ed.getFullYear() === y;
      })
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      name: format(d, "MMM"),
      amount: total,
    };
  }).reverse();

  const currentMonthTotal = expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const prevMonthTotal = expenses
    .filter(e => {
      const d = new Date(e.date);
      const pm = currentMonth === 0 ? 11 : currentMonth - 1;
      const py = currentMonth === 0 ? currentYear - 1 : currentYear;
      return d.getMonth() === pm && d.getFullYear() === py;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const percentChange = prevMonthTotal > 0 ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;

  if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-400">Loading Report Data...</div>;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white font-display">Financial Analysis</h1>
        <p className="text-slate-400">Detailed performance report for your expenditure nodes.</p>
      </header>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <div className="glass-card p-6 md:col-span-1">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Node Status</p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <span className="text-sm font-bold text-white">Active Optimized</span>
          </div>
        </div>

        <div className="glass-card p-6 md:col-span-1">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">MOM Variance</p>
          <div className={`flex items-center gap-1 text-lg font-bold ${percentChange > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {percentChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {Math.abs(percentChange).toFixed(1)}%
          </div>
        </div>

        <div className="glass-card flex flex-col justify-center p-6 md:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Cycle Total</p>
            <PieChartIcon className="h-4 w-4 text-slate-500" />
          </div>
          <h2 className="mt-1 text-3xl font-bold text-white">{formatCurrency(currentMonthTotal)}</h2>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="glass-panel p-8 lg:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Expenditure Drift</h3>
              <p className="text-xs text-slate-500">6-Month historical flow verification</p>
            </div>
            <BarChartIcon className="h-5 w-5 text-emerald-500" />
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTotals}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
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
                  tickFormatter={(val) => `$${val}`}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-8">
          <h3 className="mb-6 text-lg font-bold text-white font-display">Target Anomalies</h3>
          <div className="space-y-6">
            {expenses
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 5)
              .map((expense) => (
                <div key={expense._id} className="group relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white transition-colors group-hover:text-emerald-400">{expense.description}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{expense.category}</p>
                    </div>
                    <span className="font-mono text-sm font-bold text-rose-400">-{formatCurrency(expense.amount)}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
                    <div 
                      className="h-full bg-slate-700 transition-all group-hover:bg-emerald-500/50" 
                      style={{ width: `${Math.min(100, (expense.amount / (currentMonthTotal || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            {expenses.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <AlertCircle className="mb-2 h-8 w-8 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">No anomalies detected</p>
              </div>
            )}
          </div>
          
          <button className="mt-10 w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 transition-all hover:bg-slate-700 hover:text-white">
            Export Audit Payload
          </button>
        </div>
      </div>
    </div>
  );
}
