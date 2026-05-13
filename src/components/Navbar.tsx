import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, LayoutDashboard, PieChart, User, Wallet, ChevronRight, History, Bell } from "lucide-react";
import { cn } from "../lib/utils";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const menuItems = [
    { to: "/", icon: <LayoutDashboard className="h-5 w-5" />, label: "Stats" },
    { to: "/reports", icon: <PieChart className="h-5 w-5" />, label: "Reports" },
    { to: "/reminders", icon: <Bell className="h-5 w-5" />, label: "Alerts" },
    { to: "/history", icon: <History className="h-5 w-5" />, label: "Archive" },
    { to: "/profile", icon: <User className="h-5 w-5" />, label: "Profile" },
  ];

  return (
    <>
      {/* Universal Bottom Bar (Mobile & Desktop - Mobile-First Approach) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-20 items-center justify-around border-t border-slate-700/50 bg-[#0f172a]/95 pb-4 backdrop-blur-xl">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 transition-colors px-1",
              location.pathname === item.to ? "text-emerald-400" : "text-slate-400"
            )}
          >
            <div className={cn(
              "flex items-center justify-center rounded-2xl p-2 transition-all",
              location.pathname === item.to ? "bg-emerald-500/10" : ""
            )}>
              {item.icon}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
