import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import ConnectAccounts from "./pages/ConnectAccounts";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

function Layout({ children }: { children: any }) {
  return (
    <div className="flex min-h-screen bg-[#0f172a]">
      <Navbar />
      <main className="flex-1 pb-20 md:ml-64 md:pb-0">
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#0f172a] to-[#1e1b4b]">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/reports" element={<Layout><Reports /></Layout>} />
          <Route path="/accounts" element={<Layout><ConnectAccounts /></Layout>} />
          <Route path="/profile" element={<Layout><Profile /></Layout>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
