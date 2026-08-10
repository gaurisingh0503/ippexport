import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { signOut } from "@/lib/supabase";

type DashboardProps = {
  email: string;
  onSignOut: () => void;
};

export default function Dashboard({ email, onSignOut }: DashboardProps) {
  const isAdmin = email === env.adminEmail;

  async function handleSignOut() {
    await signOut();
    onSignOut();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <h1 className="text-2xl font-semibold">IPP Shipments</h1>
      <p className="text-muted-foreground">Welcome, {email}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/shipments/new">New Shipment</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/submit-customer">Submit Customer</Link>
        </Button>
        {isAdmin && (
          <Button asChild variant="secondary">
            <Link to="/admin">Admin</Link>
          </Button>
        )}
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
