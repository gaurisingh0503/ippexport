import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { api, type AuthUser } from "@/lib/api";
import { ApiError } from "@/lib/http";
import { signOut, supabase } from "@/lib/supabase";
import Admin from "@/pages/Admin";
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
  const [me, setMe] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

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

  const accessToken = session?.access_token;
  useEffect(() => {
    if (!accessToken || demoMode) {
      setMe(null);
      setAuthError(null);
      return;
    }
    api.me()
      .then((user) => {
        setMe(user);
        setAuthError(null);
      })
      .catch((err) => {
        setMe(null);
        setAuthError(
          err instanceof ApiError && err.status === 403
            ? "This account doesn't have access to IPP Shipments. Ask an admin to add your email."
            : "Couldn't check your account. Please refresh the page.",
        );
      });
  }, [accessToken, demoMode]);

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

  if (!demoMode && authError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-md text-destructive">{authError}</p>
        <p className="text-sm text-muted-foreground">Signed in as {session?.user.email}</p>
        <button
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() => void signOut().then(() => setSession(null))}
        >
          Sign out
        </button>
      </div>
    );
  }

  if (!demoMode && !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Checking your account…</p>
      </div>
    );
  }

  const isAdmin = demoMode || me?.role === "admin";

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
              isAdmin={isAdmin}
              onSignOut={demoMode ? exitDemo : () => setSession(null)}
            />
          }
        />
        <Route path="/admin" element={<Admin isAdmin={isAdmin} />} />
        <Route path="/submit-customer" element={<SubmitCustomer />} />
        <Route path="/customers/:id/edit" element={<SubmitCustomer />} />
        <Route path="/customers" element={<CustomerDirectory />} />
        <Route path="/shipments" element={<ShipmentHistory />} />
        <Route path="/batches/new/domestic" element={<DomesticBatchBuilder />} />
        <Route path="/batches/new/export" element={<ExportBatchBuilder />} />
        <Route path="/batches/:id/ocr" element={<OcrPage />} />
        <Route path="/batches/:id/stickers" element={<StickersPlaceholder />} />
        <Route path="/export-documents/new" element={<ExportDocumentBuilder />} />
        <Route path="/export-documents/:id/coa" element={<CoaDocumentPage />} />
        <Route path="/export-documents/:id" element={<ExportDocumentPreview isAdmin={isAdmin} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
