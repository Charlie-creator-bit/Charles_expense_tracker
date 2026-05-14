import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ArrowLeft, Trash2, Wallet, Plus, Calendar, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { expenseService, Income } from "../services/expenseService";
import { formatCurrency, cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { useUndo } from "../context/UndoContext";
import { motion, AnimatePresence } from "motion/react";

export default function IncomeTransactions() {
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const { recordDeletion } = useUndo();

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const data = await expenseService.getIncome();
      setIncomes(data);
      setSelectedIds(new Set()); // Clear selection on refresh
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredIncomes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIncomes.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (window.confirm(`Verify: Permanently purge ${selectedIds.size} revenue records?`)) {
      const itemsToDelete = incomes.filter(i => selectedIds.has(i.id));
      const previousIncomes = [...incomes];
      
      // Optimistic update
      setIncomes(prev => prev.filter(i => !selectedIds.has(i.id)));
      const deletedItems = itemsToDelete.map(i => ({ id: i.id, type: "income" as const, data: { ...i } }));
      setSelectedIds(new Set());

      try {
        await Promise.all(itemsToDelete.map(i => expenseService.deleteIncome(i.id)));
        recordDeletion(deletedItems, () => fetchData());
      } catch (err) {
        console.error("Bulk deletion failed:", err);
        setIncomes(previousIncomes);
        alert("Failed to delete some records. System auto-reverting.");
      }
    }
  };

  const handleDelete = async (income: Income) => {
    let systemTime = "";
    if ((income as any).createdAt) {
      const date = (income as any).createdAt.toDate ? (income as any).createdAt.toDate() : new Date((income as any).createdAt);
      systemTime = `\nRecorded: ${format(date, "MMM d, yyyy HH:mm:ss")}`;
    }

    const details = `${income.source}\nAmount: +${formatCurrency(income.amount)}\nDate: ${format(new Date(income.date), "MMM d, yyyy")}${systemTime}`;
    
    if (window.confirm(`Verify: Permanently purge this revenue record?\n\n${details}`)) {
      // Optimistic Update
      const originalData = { ...income };
      setIncomes(prev => prev.filter(i => i.id !== income.id));
      
      try {
        await expenseService.deleteIncome(income.id);
        recordDeletion(
          { id: income.id, type: "income", data: originalData },
          () => fetchData()
        );
      } catch (err) {
        console.error("Deletion failed:", err);
        fetchData();
        alert("Failed to delete record. Sync error.");
      }
    }
  };

  const filteredIncomes = incomes
    .filter(i => i.source.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f172a]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#0f172a] px-4 pb-24 pt-8">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800/50 text-slate-400 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{selectedIds.size} Selected</span>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-rose-400 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500 group-hover:text-white" />
                  Bulk Purge
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-display">Revenue Nodes</h1>
            <p className="text-xs text-slate-400 font-medium">History of all capital inflows.</p>
          </div>
          {filteredIncomes.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400"
            >
              {selectedIds.size === filteredIncomes.length ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>
      </header>

      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input 
          type="text"
          placeholder="Search by source..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border border-slate-700 bg-slate-800/50 py-4 pl-12 pr-4 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
        />
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredIncomes.map((income) => (
            <motion.div
              layout
              key={income.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => toggleSelect(income.id)}
              className={cn(
                "glass-panel group relative flex items-center gap-4 p-5 cursor-pointer transition-all",
                selectedIds.has(income.id) ? "border-emerald-500/50 bg-emerald-500/5" : ""
              )}
            >
              <div className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all",
                selectedIds.has(income.id) 
                  ? "bg-emerald-500 border-emerald-500 text-white" 
                  : "bg-slate-800/50 border-slate-700 text-transparent"
              )}>
                <Plus className="h-3 w-3 rotate-45" style={{ display: selectedIds.has(income.id) ? 'none' : 'block' }} />
                {selectedIds.has(income.id) && <Plus className="h-3 w-3" />}
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Wallet className="h-6 w-6" />
              </div>
              
              <div className="flex-1 overflow-hidden">
                <h3 className="truncate text-sm font-bold text-white">{income.source}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(income.date), "MMM d, yyyy")}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-bold font-mono text-emerald-400">
                  +{formatCurrency(income.amount)}
                </p>
                <button 
                  onClick={() => handleDelete(income)}
                  className="mt-2 text-[10px] font-bold uppercase tracking-widest text-rose-500/50 hover:text-rose-400 transition-colors"
                >
                  Purge
                </button>
              </div>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(income);
                }}
                className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-700/80 border border-slate-600 text-slate-300 shadow-lg active:scale-90 transition-all hover:bg-rose-500 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredIncomes.length === 0 && (
          <div className="py-20 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800/50 text-slate-700">
              <Plus className="h-10 w-10 opacity-20" />
            </div>
            <p className="text-sm font-medium text-slate-500">No revenue nodes found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
