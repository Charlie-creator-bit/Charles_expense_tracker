import React, { createContext, useContext, useState, useRef } from "react";
import { expenseService } from "../services/expenseService";
import { motion, AnimatePresence } from "motion/react";
import { RotateCcw, X } from "lucide-react";

interface DeletedItem {
  id: string;
  type: "expense" | "income";
  data: any;
}

interface UndoContextType {
  recordDeletion: (items: DeletedItem | DeletedItem[], onUndo: () => void) => void;
}

const UndoContext = createContext<UndoContextType | undefined>(undefined);

export const UndoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const onUndoRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const recordDeletion = (items: DeletedItem | DeletedItem[], onUndo: () => void) => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    
    setDeletedItems(Array.isArray(items) ? items : [items]);
    onUndoRef.current = onUndo;

    timeoutRef.current = window.setTimeout(() => {
      setDeletedItems([]);
      onUndoRef.current = null;
    }, 6000); // 6 seconds to undo
  };

  const handleUndo = async () => {
    if (deletedItems.length === 0 || !onUndoRef.current) return;

    try {
      // Use Promise.all to restore all items
      await Promise.all(deletedItems.map(async (item) => {
        if (item.type === "expense") {
          await expenseService.addExpense({
            amount: item.data.amount,
            category: item.data.category,
            date: item.data.date,
            description: item.data.description,
          });
        } else {
          await expenseService.addIncome({
            amount: item.data.amount,
            source: item.data.source || item.data.description,
            date: item.data.date,
          });
        }
      }));
      
      onUndoRef.current();
      setDeletedItems([]);
      onUndoRef.current = null;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    } catch (err) {
      console.error("Undo failed:", err);
    }
  };

  return (
    <UndoContext.Provider value={{ recordDeletion }}>
      {children}
      <AnimatePresence>
        {deletedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-24 left-1/2 z-[200] flex w-[90%] max-w-sm -translate-x-1/2 items-center justify-between gap-4 rounded-3xl border border-slate-700/50 bg-[#1e293b] p-4 shadow-2xl shadow-slate-950/50 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white leading-none">
                  {deletedItems.length === 1 ? "Record Purged" : `${deletedItems.length} Records Purged`}
                </p>
                <p className="mt-1 text-[10px] text-slate-400 font-medium">
                  {deletedItems.length === 1 
                    ? `${deletedItems[0].data.description || deletedItems[0].data.source} removed.`
                    : "Multiple records removed."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all"
              >
                Undo
              </button>
              <button 
                onClick={() => setDeletedItems([])}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </UndoContext.Provider>
  );
};

export const useUndo = () => {
  const context = useContext(UndoContext);
  if (context === undefined) {
    throw new Error("useUndo must be used within an UndoProvider");
  }
  return context;
};
