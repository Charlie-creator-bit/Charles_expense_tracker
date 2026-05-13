import { useState } from "react";
import { MessageSquare, Loader2, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";
import { aiService, ParsedTransaction } from "../services/aiService";
import { expenseService } from "../services/expenseService";
import { cn } from "../lib/utils";

interface SMSImporterProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function SMSImporter({ onSuccess, onClose }: SMSImporterProps) {
  const [smsText, setSmsText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<ParsedTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const EXAMPLES = [
    "You have sent 500 GH₵ to John Doe. Fee: 5.00 GH₵. Balance: 1240.20 GH₵.",
    "Confirmed. You have received 1200 GH₵ from 0244112233. Ref: Monthly Salary.",
    "Payment of 45 GH₵ to JUMIA GHANA successful. Transaction ID: 8923112."
  ];

  const handleParse = async () => {
    if (!smsText.trim()) return;
    
    setIsParsing(true);
    setError(null);
    try {
      const parsed = await aiService.parseSMS(smsText);
      if (parsed) {
        setResult(parsed);
      } else {
        setError("Could not parse this message. Please check the format.");
      }
    } catch (err) {
      setError("An error occurred while parsing the message.");
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = async () => {
    if (!result) return;

    try {
      if (result.type === "expense") {
        await expenseService.addExpense({
          amount: result.amount,
          category: result.categoryOrSource,
          description: result.description,
          date: result.date
        });
      } else {
        await expenseService.addIncome({
          amount: result.amount,
          source: result.categoryOrSource,
          date: result.date
        });
      }
      
      // Save to SMS History
      await expenseService.addSMSHistory({
        originalText: smsText,
        parsedData: result,
        status: "success"
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError("Failed to save transaction.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-sm rounded-[2rem] border border-slate-700/50 bg-slate-900 p-6 shadow-2xl overflow-hidden">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">SMS Sync</h2>
            <p className="text-xs text-slate-400">Import transaction from message</p>
          </div>
        </div>

        {!result ? (
          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                placeholder="Paste your mobile money or bank SMS alert here..."
                className="h-32 w-full rounded-2xl border border-slate-700 bg-slate-800/50 p-4 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setSmsText(ex)}
                    className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-bold text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    Ex {i + 1}
                  </button>
                ))}
              </div>
            </div>
            
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleParse}
              disabled={isParsing || !smsText.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing Message...
                </>
              ) : (
                <>
                  Parse Transaction
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                  result.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                )}>
                  {result.type} Detected
                </span>
                <span className="text-xs text-slate-500">{result.date}</span>
              </div>
              <div className="mb-1 text-2xl font-bold text-white">
                {result.type === "income" ? "+" : "-"}${result.amount.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-slate-300">{result.categoryOrSource}</div>
              <p className="mt-2 text-xs text-slate-500 line-clamp-2">{result.description}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setResult(null)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-bold text-slate-300 active:scale-95 transition-all"
              >
                Retry
              </button>
              <button
                onClick={handleConfirm}
                className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm & Save
              </button>
            </div>
          </div>
        )}

        <button 
          onClick={onClose}
          className="mt-4 w-full text-center text-xs font-medium text-slate-500 hover:text-slate-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
