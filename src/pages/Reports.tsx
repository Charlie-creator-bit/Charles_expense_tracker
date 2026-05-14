import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart } from "recharts";
import { TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart as BarChartIcon, AlertCircle, Trash2 } from "lucide-react";
import { expenseService, Income } from "../services/expenseService";
import { formatCurrency } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { useUndo } from "../context/UndoContext";

export default function Reports() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { recordDeletion } = useUndo();

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

  const handleDeleteIncome = async (income: Income) => {
    let systemTime = "";
    if ((income as any).createdAt) {
      const date = (income as any).createdAt.toDate ? (income as any).createdAt.toDate() : new Date((income as any).createdAt);
      systemTime = `\nRecorded: ${format(date, "MMM d, yyyy HH:mm:ss")}`;
    }

    const details = `${income.source}\nAmount: +${formatCurrency(income.amount)}\nDate: ${format(new Date(income.date), "MMM d, yyyy")}${systemTime}`;
    
    if (window.confirm(`Verify: Permanently purge this revenue record?\n\n${details}`)) {
      const originalData = { ...income };
      // Optimistic update
      setIncomes(prev => prev.filter(inc => inc.id !== income.id));
      try {
        await expenseService.deleteIncome(income.id);
        recordDeletion(
          { id: income.id, type: "income", data: originalData },
          () => fetchData()
        );
      } catch (err) {
        console.error("Deletion failed:", err);
        fetchData();
      }
    }
  };

  const handleDeleteExpense = async (expense: any) => {
    let systemTime = "";
    if (expense.createdAt) {
      const date = expense.createdAt.toDate ? expense.createdAt.toDate() : new Date(expense.createdAt);
      systemTime = `\nRecorded: ${format(date, "MMM d, yyyy HH:mm:ss")}`;
    }

    const details = `${expense.description}\nAmount: -${formatCurrency(expense.amount)}\nCategory: ${expense.category}\nDate: ${format(new Date(expense.date), "MMM d, yyyy")}${systemTime}`;
    
    if (window.confirm(`Verify: Permanently purge this expense record?\n\n${details}`)) {
      const originalData = { ...expense };
      // Optimistic update
      setExpenses(prev => prev.filter(e => e.id !== expense.id));
      try {
        await expenseService.deleteExpense(expense.id);
        recordDeletion(
          { id: expense.id, type: "expense", data: originalData },
          () => fetchData()
        );
      } catch (err) {
        console.error("Deletion failed:", err);
        fetchData();
      }
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
    <div className="mx-auto max-w-md px-4 pb-24 pt-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white font-display">Analysis</h1>
        <p className="text-xs text-slate-400">Node performance and cashflow flux.</p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3">
        <div className="glass-card p-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Net Flow</p>
          <div className={`text-sm font-bold ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(netBalance)}
          </div>
        </div>
        <div className="glass-card p-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</p>
          <span className="text-[10px] font-bold text-white uppercase tracking-tighter truncate block">{netBalance >= 0 ? 'Surplus' : 'Deficit'}</span>
        </div>
        <div className="glass-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Inbound</p>
          <h2 className="text-sm font-bold text-emerald-400">{formatCurrency(currentMonthIncTotal)}</h2>
        </div>
        <div className="glass-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Outbound</p>
          <h2 className="text-sm font-bold text-rose-400">{formatCurrency(currentMonthExpTotal)}</h2>
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-panel p-6">
          <div className="mb-6 flex flex-col gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Cashflow Flux</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                <span className="text-[8px] font-bold text-slate-400 uppercase">In</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500"></div>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Out</span>
              </div>
            </div>
          </div>
          
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                {/* ... existing chart logic ... */}
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
            {[...expenses]
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 5)
              .map((expense) => (
                <div key={expense.id} className="group relative">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white transition-colors group-hover:text-emerald-400">{expense.description}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{expense.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-rose-400">-{formatCurrency(expense.amount)}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExpense(expense);
                        }}
                        className="p-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:text-rose-400 transition-all active:scale-90"
                        title="Delete expense record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
      <div className="mt-8 grid gap-8 lg:grid-cols-1">
        <div className="glass-panel p-8 border border-slate-700/30 hover:border-emerald-500/20 transition-all duration-500">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white font-display uppercase tracking-tight">Income Transactions</h3>
              <p className="text-xs text-slate-500">Chronological record of all revenue inflows.</p>
            </div>
            <button 
              onClick={() => navigate("/income")}
              className="rounded-xl bg-emerald-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all"
            >
              Manage All
            </button>
          </div>
          
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[500px] text-left">
              <thead>
                <tr className="border-b border-slate-700/30 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <th className="pb-4 px-4">Date</th>
                  <th className="pb-4 px-4">Source</th>
                  <th className="pb-4 px-4 text-right">Amount</th>
                  <th className="pb-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[...incomes]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((income) => (
                    <tr key={income.id} className="border-b border-slate-700/10 transition-colors hover:bg-slate-700/20 group">
                      <td className="py-4 px-4 text-slate-400">
                        {format(new Date(income.date), "MMM d, yyyy")}
                      </td>
                      <td className="py-4 px-4 font-medium text-white underline decoration-emerald-500/20 underline-offset-4">
                        {income.source}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-emerald-400">
                        +{formatCurrency(income.amount)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteIncome(income);
                          }}
                          className="p-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:text-rose-400 transition-all active:scale-90"
                          title="Delete income record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                {incomes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-slate-500">
                      No income records found in history.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
