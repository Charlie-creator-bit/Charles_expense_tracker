import React, { useState, useEffect } from "react";
import { format, isPast, parseISO } from "date-fns";
import { Bell, Plus, Trash2, Clock, CheckCircle, AlertCircle, Loader2, Calendar } from "lucide-react";
import { expenseService, Reminder } from "../services/expenseService";
import { cn } from "../lib/utils";

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const requestPermission = async () => {
    if (typeof Notification !== "undefined") {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const data = await expenseService.getReminders();
      setReminders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newTime) return;

    try {
      await expenseService.addReminder({
        title: newTitle,
        time: newTime,
      });
      setNewTitle("");
      setNewTime("");
      setIsAdding(false);
      fetchReminders();
    } catch (err) {
      setError("Failed to set reminder node.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await expenseService.deleteReminder(id);
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await expenseService.toggleReminder(id, !currentStatus);
      setReminders(prev => prev.map(r => r.id === id ? { ...r, isCompleted: !currentStatus } : r));
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-display">Alert Nodes</h1>
          <p className="text-xs text-slate-400 font-medium">Schedule your financial checkpoints.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-90 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </button>
      </header>

      {notificationPermission === "default" && (
        <div className="mb-6 flex items-center justify-between rounded-3xl bg-blue-500/10 border border-blue-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500 text-white">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest leading-none text-blue-400">Push Notifications</p>
              <p className="mt-1 text-[10px] font-medium text-slate-400">Enable alerts for your financial nodes.</p>
            </div>
          </div>
          <button 
            onClick={requestPermission}
            className="rounded-xl bg-blue-500 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-blue-400 active:scale-95"
          >
            Enable
          </button>
        </div>
      )}

      {notificationPermission === "denied" && (
        <div className="mb-6 flex items-center gap-3 rounded-3xl bg-rose-500/10 border border-rose-500/20 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-500">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest leading-none text-rose-400">Notifications Blocked</p>
            <p className="mt-1 text-[10px] font-medium text-slate-500">Please enable notifications in your browser settings to receive financial alerts.</p>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsAdding(false)}></div>
          <form onSubmit={handleAdd} className="relative w-full max-w-sm rounded-[2.5rem] border border-slate-700/50 bg-slate-900 p-8 shadow-2xl">
            <h3 className="mb-6 text-xl font-bold text-white">New Reminder</h3>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Pay Electricity Bill"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Execution Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-white focus:border-emerald-500 focus:outline-none [scheme:dark]"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-400">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 rounded-2xl border border-slate-700 py-4 text-sm font-bold text-slate-400 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-emerald-500 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  Set Node
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800/50 text-slate-700">
              <Bell className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-bold text-white">No active nodes</h3>
            <p className="mt-2 text-sm text-slate-500 px-10">You haven't set any financial reminders for yourself yet.</p>
          </div>
        ) : (
          reminders.map((reminder) => {
            const isDue = isPast(parseISO(reminder.time)) && !reminder.isCompleted;
            return (
              <div 
                key={reminder.id}
                className={cn(
                  "glass-panel relative overflow-hidden transition-all",
                  reminder.isCompleted ? "opacity-50" : "",
                  isDue ? "border-rose-500/30 bg-rose-500/5 shadow-lg shadow-rose-500/5" : ""
                )}
              >
                <div className="flex items-center gap-4 p-5">
                  <button
                    onClick={() => handleToggle(reminder.id, reminder.isCompleted)}
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-90",
                      reminder.isCompleted 
                        ? "bg-emerald-500 text-white border-emerald-500" 
                        : "border-slate-700 text-slate-500 hover:border-slate-500"
                    )}
                  >
                    <CheckCircle className="h-5 w-5" />
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "truncate text-sm font-bold",
                      reminder.isCompleted ? "text-slate-500 line-through" : "text-white"
                    )}>
                      {reminder.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(reminder.time), "MMM d, yyyy")}
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 text-[10px] font-bold uppercase",
                        isDue ? "text-rose-400" : "text-slate-500"
                      )}>
                        <Clock className="h-3 w-3" />
                        {format(parseISO(reminder.time), "HH:mm")}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(reminder.id)}
                    className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-600 hover:text-rose-400 active:scale-90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                {isDue && (
                  <div className="bg-rose-500/10 px-5 py-2">
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle className="h-3 w-3" />
                      Status: Overdue
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
