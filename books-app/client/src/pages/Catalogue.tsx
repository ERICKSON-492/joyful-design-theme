import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { money } from "@/lib/bookData";
import { ChevronLeft, ChevronRight, Clipboard, LockKeyhole, Maximize2, RefreshCw, Search, ShieldAlert, ZoomIn, ZoomOut } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMemo, useState } from "react";
import { booksPath } from "@/paths";

const PAGE_SIZE = 6;

export default function Catalogue() {
  const { user } = useAuth();
  const admin = user?.role === "admin";
  const query = trpc.books.catalogue.useQuery(undefined, { enabled: admin, retry: false, refetchOnMount: "always", refetchOnWindowFocus: true, refetchInterval: 60_000 });
  const shareQuery = trpc.books.catalogueShare.useQuery(undefined, { enabled: admin, retry: false });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [customerCopied, setCustomerCopied] = useState(false);
  const products = query.data?.products ?? [];
  const categories = useMemo(() => ["All categories", ...Array.from(new Set(products.map(product => product.category).filter((value): value is string => Boolean(value))))], [products]);
  const filtered = products.filter(product => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [product.name, product.category, product.subcategory, product.description].some(value => value?.toLowerCase().includes(term));
    return matchesSearch && (category === "All categories" || product.category === category);
  });
  const pages = Array.from({ length: Math.ceil(filtered.length / PAGE_SIZE) }, (_, index) => filtered.slice(index * PAGE_SIZE, index * PAGE_SIZE + PAGE_SIZE));
  const safePage = Math.min(page, Math.max(pages.length - 1, 0));
  const currentProducts = pages[safePage] ?? [];
  const copyLink = async () => {
    await navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const copyCustomerLink = async () => {
    const token = shareQuery.data?.token ?? (await shareQuery.refetch()).data?.token;
    if (!token) return;
    await navigator.clipboard?.writeText(`${window.location.origin}${booksPath("catalogue/view")}?token=${token}`);
    setCustomerCopied(true);
    window.setTimeout(() => setCustomerCopied(false), 1800);
  };
  const updateFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(0); };

  return <AppShell><div className="catalogue-protected" onContextMenu={event => event.preventDefault()}><div className="catalogue-heading"><div><div className="eyebrow">PRIVATE CATALOGUE / DOCUMENT VIEWER</div><h2>Ushanga Chronicles collection.</h2><p>Live storefront catalogue presented as a protected, paper-style document.</p></div><div className="catalogue-heading-actions"><button className="secondary-button" onClick={() => query.refetch()}><RefreshCw size={14} /> Refresh</button><button className="secondary-button" onClick={copyCustomerLink}><Clipboard size={14} /> {customerCopied ? "Customer link copied" : "Copy customer link"}</button><button className="primary-button" onClick={copyLink}><Clipboard size={14} /> {copied ? "Admin link copied" : "Copy admin link"}</button></div></div><div className="catalogue-security-note"><ShieldAlert size={16} /><span><strong>Private admin document.</strong> This view requires an authenticated admin account. Use the customer link to share a separate read-only view with a customer.</span></div>{!admin && <div className="data-note" style={{ marginBottom: 16 }}><LockKeyhole size={14} /> This catalogue is restricted to admin accounts. Sign in to access it.</div>}{query.error && <div className="data-note" style={{ marginBottom: 16 }}>Catalogue error: {query.error.message}</div>}{admin && <><div className="catalogue-controls"><div className="catalogue-control-group"><div className="text-input catalogue-search"><Search size={14} color="#b9a98f" /><input aria-label="Search catalogue" value={search} onChange={event => updateFilter(setSearch, event.target.value)} placeholder="Search products" /></div><select className="filter-select" value={category} onChange={event => updateFilter(setCategory, event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select></div><div className="catalogue-view-controls"><button className="viewer-icon-button" aria-label="Zoom out" onClick={() => setZoom(value => Math.max(.8, Number((value - .1).toFixed(1))))}><ZoomOut size={15} /></button><span>{Math.round(zoom * 100)}%</span><button className="viewer-icon-button" aria-label="Zoom in" onClick={() => setZoom(value => Math.min(1.3, Number((value + .1).toFixed(1))))}><ZoomIn size={15} /></button><button className="viewer-icon-button" aria-label="Reset zoom" onClick={() => setZoom(1)}><Maximize2 size={14} /></button></div></div><div className="catalogue-viewer"><div className="catalogue-viewer-bar"><span><LockKeyhole size={13} /> Ushanga Chronicles · Private catalogue</span><span>{filtered.length} products · live source</span></div><div className="catalogue-paper-stage"><div className="catalogue-paper" style={{ transform: `scale(${zoom})`, transformOrigin: "top center", marginBottom: `${(zoom - 1) * 760}px` }}><header className="catalogue-paper-header"><div><div className="catalogue-paper-kicker">USHANGA CHRONICLES</div><h3>Collection catalogue</h3><p>Handcrafted pieces · Nairobi, Kenya</p></div><div className="catalogue-paper-stamp">ADMIN<br />COPY</div></header><div className="catalogue-paper-rule" /><div className="catalogue-paper-meta"><span>Live edition · {new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })}</span><span>Page {pages.length ? safePage + 1 : 0} of {pages.length || 0}</span></div><div className="catalogue-paper-grid">{currentProducts.length ? currentProducts.map(product => <article className="catalogue-paper-product" key={product.externalId}><div className="catalogue-paper-image">{product.images[0] ? <img src={product.images[0]} alt="" draggable={false} /> : <span>{product.name.slice(0, 1).toUpperCase()}</span>}<small>{product.active ? "AVAILABLE" : "HIDDEN"}</small></div><div className="catalogue-paper-product-copy"><div className="catalogue-paper-category">{product.category ?? "Uncategorised"}{product.subcategory ? ` · ${product.subcategory}` : ""}</div><h4>{product.name}</h4>{product.description && <p>{product.description}</p>}<div className="catalogue-paper-price"><strong>{money(product.salePrice ?? product.price)}</strong>{product.salePrice != null && product.price > product.salePrice && <del>{money(product.price)}</del>}<span>{product.preorder ? "Pre-order" : `${product.stock} in stock`}</span></div></div></article>) : <div className="catalogue-paper-empty"><strong>No matching products</strong><br />Upload products in the storefront or clear the filters.</div>}</div><footer className="catalogue-paper-footer"><span>One bead. A thousand stories.</span><span>USHANGA BOOKS · ADMIN COPY · LIVE</span></footer></div></div><div className="catalogue-viewer-bar catalogue-viewer-footer"><button className="viewer-page-button" disabled={safePage <= 0} onClick={() => setPage(value => Math.max(0, value - 1))}><ChevronLeft size={15} /> Previous</button><span>Page {pages.length ? safePage + 1 : 0} / {pages.length || 0}</span><button className="viewer-page-button" disabled={safePage >= pages.length - 1} onClick={() => setPage(value => Math.min(pages.length - 1, value + 1))}>Next <ChevronRight size={15} /></button></div></div><div className="catalogue-notice"><LockKeyhole size={14} /> Admin view is protected. Customer links open the separate read-only viewer.</div></>}</div></AppShell>;
}
