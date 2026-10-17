import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { supabase } from "@/lib/supabase";
import Admin from "@/pages/Admin";
import BatchGate from "@/pages/BatchGate";
import CoaDocumentPage from "@/pages/CoaDocumentPage";
import CustomerDirectory from "@/pages/CustomerDirectory";
import Dashboard from "@/pages/Dashboard";
import DomesticBatchBuilder from "@/pages/DomesticBatchBuilder";
import ExportDocumentBuilder from "@/pages/ExportDocumentBuilder";
import ExportDocumentPreview from "@/pages/ExportDocumentPreview";
import ExportBatchBuilder from "@/pages/ExportBatchBuilder";
import Login from "@/pages/Login";
import OcrPage from "@/pages/OcrPage";
import StickersPlaceholder from "@/pages/StickersPlaceholder";
import ShipmentHistory from "@/pages/ShipmentHistory";
import SubmitCustomer from "@/pages/SubmitCustomer";
import { setDemoMode as setDemoApiMode } from "@/lib/demo-api";

function DashboardButton() {
  const { pathname } = useLocation();
  if (pathname === "/") return null;
  return (
    <Link
      to="/"
      className="fixed right-4 top-4 z-50 rounded-md border bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted"
    >
      Dashboard
    </Link>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setDemoApiMode(demoMode);
  }, [demoMode]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  function enterDemo() {
    setDemoApiMode(true);
    setDemoMode(true);
  }

  function exitDemo() {
    setDemoApiMode(false);
    setDemoMode(false);
  }

  if (!session && !demoMode) {
    return <Login onDemo={enterDemo} />;
  }

  return (
    <BrowserRouter>
      <DashboardButton />
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              email={demoMode ? "demo@example.test" : session!.user.email ?? ""}
              demoMode={demoMode}
              onSignOut={demoMode ? exitDemo : () => setSession(null)}
            />
          }
        />
        <Route path="/admin" element={<Admin />} />
        <Route path="/submit-customer" element={<SubmitCustomer />} />
        <Route path="/customers/:id/edit" element={<SubmitCustomer />} />
        <Route path="/customers" element={<CustomerDirectory />} />
        <Route path="/shipments" element={<ShipmentHistory />} />
        <Route path="/batches/new" element={<BatchGate />} />
        <Route path="/batches/new/domestic" element={<DomesticBatchBuilder />} />
        <Route path="/batches/new/export" element={<ExportBatchBuilder />} />
        <Route path="/batches/:id/ocr" element={<OcrPage />} />
        <Route path="/batches/:id/stickers" element={<StickersPlaceholder />} />
        <Route path="/export-documents/new" element={<ExportDocumentBuilder />} />
        <Route path="/export-documents/:id/coa" element={<CoaDocumentPage />} />
        <Route path="/export-documents/:id" element={<ExportDocumentPreview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
