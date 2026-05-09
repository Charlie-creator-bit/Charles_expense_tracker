import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart } from "recharts";
import { TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart as BarChartIcon, AlertCircle } from "lucide-react";
import { expenseService } from "../services/expenseService";
import { formatCurrency } from "../lib/utils";
import { useAuth } from "../context/AuthContext";

export default function Reports() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [expData, incData] = await Promise.all([
        expenseService.getExpenses(),
        expenseService.getIncome()
      ]);
      setExpenses(expData as any);
      setIncomes(incData as any);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i);
    const m = d.getMonth();
    const y = d.getFullYear();
    
    const totalExp = expenses
      .filter(e => {
        const ed = new Date(e.date);
        return ed.getMonth() === m && ed.getFullYear() === y;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const totalInc = incomes
      .filter(inc => {
        const id = new Date(inc.date);
        return id.getMonth() === m && id.getFullYear() === y;
      })
      .reduce((sum, inc) => sum + inc.amount, 0);

    return {
      name: format(d, "MMM"),
      expenses: totalExp,
      income: totalInc,
      net: totalInc - totalExp,
    };
  }).reverse();

  const currentMonthExpTotal = expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const currentMonthIncTotal = incomes
    .filter(inc => {
      const d = new Date(inc.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, inc) => sum + inc.amount, 0);

  const netBalance = currentMonthIncTotal - currentMonthExpTotal;

  if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-400">Loading Report Data...</div>;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white font-display">Financial Analysis</h1>
        <p className="text-slate-400">Detailed performance report for your income and expenditure nodes.</p>
      </header>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <div className="glass-card p-6 md:col-span-1">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</p>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${netBalance >= 0 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}></div>
            <span className="text-sm font-bold text-white">{netBalance >= 0 ? 'Positive Cashflow' : 'Negative Drift'}</span>
          </div>
        </div>

        <div className="glass-card p-6 md:col-span-1">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Net Profit/Loss</p>
          <div className={`text-lg font-bold ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(netBalance)}
          </div>
        </div>

        <div className="glass-card flex flex-col justify-center p-6 md:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cycle Income</p>
          <h2 className="mt-1 text-2xl font-bold text-emerald-400">{formatCurrency(currentMonthIncTotal)}</h2>
        </div>

        <div className="glass-card flex flex-col justify-center p-6 md:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cycle Expenses</p>
          <h2 className="mt-1 text-2xl font-bold text-rose-400">{formatCurrency(currentMonthExpTotal)}</h2>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="glass-panel p-8 lg:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Cashflow Flux</h3>
              <p className="text-xs text-slate-500">6-Month historical income vs expenses</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Expenses</span>
              </div>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
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
                  tickFormatter={(val) => `GH₵${val}`}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorInc)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#f43f5e" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorExp)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-8">
          <h3 className="mb-6 text-lg font-bold text-white font-display">Major Expenses</h3>
          <div className="space-y-6">
            {expenses
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 5)
              .map((expense) => (
                <div key={expense.id} className="group relative">
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
                      style={{ width: `${Math.min(100, (expense.amount / (currentMonthExpTotal || 1)) * 100)}%` }} 
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
