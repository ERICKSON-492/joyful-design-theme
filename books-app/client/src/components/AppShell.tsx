import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { BookOpen, Boxes, CircleDollarSign, FileBarChart, LayoutDashboard, Link2, LogOut, Menu, Package, ReceiptText, Shield, X } from "lucide-react";
import { useState } from "react";
import { booksPath } from "@/paths";

const nav = [
  { href: booksPath(), label: "Overview", icon: LayoutDashboard },
  { href: booksPath("materials"), label: "Materials", icon: Boxes },
  { href: booksPath("inventory"), label: "Inventory", icon: Package },
  { href: booksPath("expenses"), label: "Expenses", icon: ReceiptText },
  { href: booksPath("sales"), label: "Sales & orders", icon: CircleDollarSign },
  { href: booksPath("reports"), label: "Reports", icon: FileBarChart },
  { href: booksPath("connection"), label: "Store connection", icon: Link2 },
  { href: booksPath("catalogue"), label: "Private catalogue", icon: Shield },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const admin = user?.role === "admin";

  return (
    <div className="app-frame">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand-block">
          <div className="ledger-mark"><BookOpen size={17} /></div>
          <div><div className="brand-name">USHANGA BOOKS</div><div className="brand-caption">THE MAKING OF MARGIN</div></div>
          <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-stack">
          {nav.map(item => {
            const Icon = item.icon;
            const active = item.href === booksPath() ? location === booksPath() || location === `${booksPath()}/` : location.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`} onClick={() => setOpen(false)}><Icon size={17} /><span>{item.label}</span>{item.href === booksPath("connection") && <span className="nav-dot" />}</Link>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-mini"><span className="status-dot" /><div><strong>{admin ? "Admin workspace" : "Protected workspace"}</strong><small>{admin ? "Ready to record" : "Sign in to edit books"}</small></div></div>
          {isAuthenticated ? <button className="quiet-button" onClick={() => logout()}><LogOut size={15} /> Sign out</button> : <button className="quiet-button" onClick={() => startLogin()}><LogOut size={15} /> Admin sign in</button>}
        </div>
      </aside>
      {open && <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="Close navigation" />}
      <main className="main-canvas">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div><div className="eyebrow">NAIROBI · KENYA / BOOKKEEPING DESK</div><h1>{nav.find(item => item.href === location || (item.href !== booksPath() && location.startsWith(item.href)))?.label ?? "Overview"}</h1></div>
          <div className="topbar-meta"><span className={`role-pill ${admin ? "is-admin" : ""}`}>{admin ? "ADMIN" : "READ-ONLY"}</span><div className="avatar">{user?.name?.slice(0, 1).toUpperCase() ?? "U"}</div></div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
