import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, LayoutDashboard, PieChart, User, Wallet, ChevronRight, CreditCard } from "lucide-react";
import { cn } from "../lib/utils";
import { auth } from "../lib/firebase";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  const menuItems = [
    { to: "/", icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard" },
    { to: "/reports", icon: <PieChart className="h-5 w-5" />, label: "Reports" },
    { to: "/accounts", icon: <CreditCard className="h-5 w-5" />, label: "Accounts" },
    { to: "/profile", icon: <User className="h-5 w-5" />, label: "Profile" },
  ];

  return (
    <>
      {/* Mobile Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-slate-700/50 bg-[#0f172a]/80 backdrop-blur-xl md:hidden">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              location.pathname === item.to ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"
            )}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-slate-400"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-medium">Exit</span>
        </button>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col gap-10 border-r border-slate-700/50 bg-[#1e293b]/50 p-8 md:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
            <Wallet className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white font-display">Ledger.io</span>
        </div>

        <div className="flex flex-col gap-2">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all duration-200",
                location.pathname === item.to
                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              )}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
              {location.pathname === item.to && <ChevronRight className="ml-auto h-4 w-4 opacity-50" />}
            </Link>
          ))}
        </div>

        <div className="mt-auto space-y-4">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-none">Plan Status</p>
            <p className="mb-3 text-sm font-medium text-slate-200">Pro Workspace</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
              <div className="h-full w-[85%] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
