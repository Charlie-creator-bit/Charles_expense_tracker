import { useState, useEffect } from "react";
import { format } from "date-fns";
import { MessageSquare, Calendar, ChevronRight, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";
import { expenseService, SMSHistoryRecord } from "../services/expenseService";
import { formatCurrency, cn } from "../lib/utils";

export default function SMSHistory() {
  const [history, setHistory] = useState<SMSHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<SMSHistoryRecord | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await expenseService.getSMSHistory();
        setHistory(data);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500"></div>
          <p className="text-sm font-medium">Retrieving history nodes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white font-display">Sync Archive</h1>
        <p className="text-xs text-slate-400 font-medium">History of AI-processed SMS alerts.</p>
      </header>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800/50 text-slate-700">
            <MessageSquare className="h-10 w-10" />
          </div>
          <h3 className="text-lg font-bold text-white">No history yet</h3>
          <p className="mt-2 text-sm text-slate-500">Successful SMS syncs will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record) => (
            <div 
              key={record.id}
              onClick={() => setSelectedRecord(selectedRecord?.id === record.id ? null : record)}
              className="glass-panel overflow-hidden transition-all active:scale-[0.98]"
            >
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      record.parsedData?.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    )}>
                      {record.parsedData?.type === "income" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white truncate max-w-[150px]">
                        {record.parsedData?.categoryOrSource || "Unknown"}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
                        <Clock className="h-3 w-3" />
                        {record.createdAt ? format(record.createdAt.toDate(), "MMM d, HH:mm") : "Recently"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-bold font-mono",
                      record.parsedData?.type === "income" ? "text-emerald-400" : "text-white"
                    )}>
                      {record.parsedData?.type === "income" ? "+" : "-"}{formatCurrency(record.parsedData?.amount || 0)}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">
                      Synced <ChevronRight className={cn("h-3 w-3 transition-transform", selectedRecord?.id === record.id ? "rotate-90" : "")} />
                    </div>
                  </div>
                </div>

                {selectedRecord?.id === record.id && (
                  <div className="mt-5 space-y-4 border-t border-slate-700/50 pt-5">
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Original SMS Alert</p>
                      <div className="rounded-2xl bg-slate-800/50 p-4 text-xs italic text-slate-400 border border-slate-700/30">
                        "{record.originalText}"
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">AI Logic Extraction</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{record.parsedData?.description}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
