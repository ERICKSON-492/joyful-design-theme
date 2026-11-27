import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { dateLabel } from "@/lib/bookData";
import { Database, Link2, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const contract = `Direct source: Supabase storefront database
Tables: products · orders · custom_orders

Optional signed snapshot endpoint:
POST /api/store-sync
Header: x-store-sync-secret: <shared-secret>`;

export default function Connection() {
  const { user } = useAuth();
  const admin = user?.role === "admin";
  const query = trpc.books.connection.useQuery(undefined, { enabled: admin, retry: false });
  const storefront = trpc.books.storefront.useQuery(undefined, { enabled: admin, retry: false });
  const info = query.data;
  const live = storefront.data;

  return <AppShell><div className="page-intro"><div><div className="eyebrow">INTEGRATION / SOURCE OF TRUTH</div><h2>Keep the store and books in step.</h2><p>Ushanga Books is separate by design, while storefront products, orders, and custom requests are read directly from the Ushanga Chronicles Supabase database.</p></div><button className="primary-button" onClick={() => { storefront.refetch(); query.refetch(); }}><RefreshCw size={14} /> Refresh connection</button></div>{!admin && <div className="data-note" style={{ marginBottom: 16 }}>Sign in as an admin to inspect the live storefront connection.</div>}{live?.error && <div className="data-note" style={{ marginBottom: 16 }}>Storefront read error: {live.error}</div>}<div className="connection-hero"><div className="connection-state"><div className="connection-icon"><Database size={19} /></div><h3>{live?.connected ? "Direct Supabase connection active" : "Direct connection unavailable"}</h3><p className="card-subtitle">{live?.connected ? "Books is reading the live storefront tables with server-side credentials." : live?.error ?? "Configure the server-side Supabase credentials to read the website database."}</p><div className="mini-kpis"><div className="mini-kpi"><span>Live products</span><strong>{live?.productCount ?? 0}</strong></div><div className="mini-kpi"><span>Live orders</span><strong>{live?.orderCount ?? 0}</strong></div><div className="mini-kpi"><span>Custom orders</span><strong>{live?.customOrderCount ?? 0}</strong></div></div></div><div className="connection-state"><div className="connection-icon"><ShieldCheck size={19} /></div><h3>Signed bridge retained</h3><p className="card-subtitle">The snapshot endpoint remains available for scheduled storefront workers, while direct reads provide current visibility.</p><div className="connection-mini" style={{ color: "#30231d", marginTop: 15 }}><span className={`status-dot ${info?.configured ? "" : "offline"}`} /><div><strong>{info?.configured ? "Sync credential configured" : "Sync credential not configured"}</strong><small>{info?.events?.[0]?.message ?? "No signed snapshot history yet"}</small></div></div></div></div><div className="card"><div className="card-header"><div><h3 className="card-title">Live database mapping</h3><p className="card-subtitle">Read-only storefront source plus the optional signed snapshot route.</p></div><span className="stamp">SUPABASE</span></div><pre className="contract-code">{contract}</pre></div><div className="section-heading"><div><h3>Signed sync history</h3><p>Recent payloads received by the optional bridge endpoint.</p></div></div><div className="card table-card"><table className="table"><thead><tr><th>Completed</th><th>Source</th><th>Status</th><th>Records</th><th>Message</th></tr></thead><tbody>{(info?.events ?? []).length ? info?.events.map(event => <tr key={event.id}><td>{dateLabel(event.completedAt)}</td><td>{event.source}</td><td><span className={`status-chip ${event.status === "success" ? "synced" : "failed"}`}>{event.status}</span></td><td>{event.records}</td><td>{event.message}</td></tr>) : <tr><td colSpan={5}><div className="empty-lock"><strong>No signed sync history.</strong><br />Direct Supabase reads are active independently of the optional snapshot bridge.</div></td></tr>}</tbody></table></div><div style={{ marginTop: 18, display: "flex", gap: 8, alignItems: "center", color: "#6f5c47", fontSize: 13 }}><Link2 size={15} /> Service-role credentials stay on the server and are never sent to browser code.</div></AppShell>;
}
