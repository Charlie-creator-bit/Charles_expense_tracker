import React from "react";
import { LucideIcon, Ghost } from "lucide-react";
import { motion } from "motion/react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ 
  icon: Icon = Ghost, 
  title, 
  description, 
  action,
  className = "" 
}: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center rounded-[2rem] border border-slate-800/50 bg-slate-900/30 p-12 text-center backdrop-blur-sm ${className}`}
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800/50 text-slate-500 shadow-inner">
        <Icon className="h-10 w-10 opacity-40" />
      </div>
      <h3 className="mb-2 text-xl font-bold tracking-tight text-white font-display">{title}</h3>
      <p className="mx-auto max-w-xs text-sm leading-relaxed text-slate-500 font-sans">
        {description}
      </p>
      {action && <div className="mt-8">{action}</div>}
    </motion.div>
  );
}
