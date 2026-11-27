import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Materials from "./pages/Materials";
import Inventory from "./pages/Inventory";
import Expenses from "./pages/Expenses";
import Sales from "./pages/Sales";
import Reports from "./pages/Reports";
import Connection from "./pages/Connection";
import Catalogue from "./pages/Catalogue";
import CustomerCatalogue from "./pages/CustomerCatalogue";

function Router() { return <Switch><Route path="/books" component={Home} /><Route path="/books/" component={Home} /><Route path="/books/materials" component={Materials} /><Route path="/books/inventory" component={Inventory} /><Route path="/books/expenses" component={Expenses} /><Route path="/books/sales" component={Sales} /><Route path="/books/reports" component={Reports} /><Route path="/books/connection" component={Connection} /><Route path="/books/catalogue/view" component={CustomerCatalogue} /><Route path="/books/catalogue" component={Catalogue} /><Route path="/books/404" component={NotFound} /><Route component={NotFound} /></Switch>; }

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
