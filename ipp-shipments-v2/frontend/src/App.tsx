import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { supabase } from "@/lib/supabase";
import Admin from "@/pages/Admin";
import BatchGate from "@/pages/BatchGate";
import Dashboard from "@/pages/Dashboard";
import DomesticBatchBuilder from "@/pages/DomesticBatchBuilder";
import ExportBatchBuilder from "@/pages/ExportBatchBuilder";
import Login from "@/pages/Login";
import OcrPlaceholder from "@/pages/OcrPlaceholder";
import SubmitCustomer from "@/pages/SubmitCustomer";

function App() {
  const [session, setSession] = useState<Session | null>(null);
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              email={session.user.email ?? ""}
              onSignOut={() => setSession(null)}
            />
          }
        />
        <Route path="/admin" element={<Admin />} />
        <Route path="/submit-customer" element={<SubmitCustomer />} />
        <Route path="/batches/new" element={<BatchGate />} />
        <Route path="/batches/new/domestic" element={<DomesticBatchBuilder />} />
        <Route path="/batches/new/export" element={<ExportBatchBuilder />} />
        <Route path="/batches/:id/ocr" element={<OcrPlaceholder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
