import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const steps = ["Batch details", "Review bundle details", "Stickers", "Export documents", "COA", "Approval"];

export default function DemoDashboard({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [containerNo, setContainerNo] = useState("DEMO-001");
  const [lotNo, setLotNo] = useState("R2-54");
  const [bundleNo, setBundleNo] = useState("1");
  const [customer, setCustomer] = useState("Demo Metals Co., Ltd.");

  const content = [
    <div className="grid gap-3 sm:grid-cols-2"><Input value="Export" readOnly /><Input value="IPP Lead And Metals Co., Ltd." readOnly /><Input value="Pure Lead Ingots" readOnly /><Input value={containerNo} onChange={(e) => setContainerNo(e.target.value)} placeholder="Container number" /></div>,
    <div className="grid gap-3 sm:grid-cols-2"><Input value={lotNo} onChange={(e) => setLotNo(e.target.value)} placeholder="Lot No." /><Input value={bundleNo} onChange={(e) => setBundleNo(e.target.value)} placeholder="Bundle No." /><Input defaultValue="30" placeholder="Ingots" /><Input defaultValue="1,200" placeholder="Gross weight (kg)" /></div>,
    <div className="rounded-md border p-4 text-sm">Sticker workbook ready for {containerNo}. In demo mode, download is simulated.</div>,
    <div className="grid gap-3 sm:grid-cols-2"><Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer" /><Input defaultValue="FOB" placeholder="Payment terms" /><Input defaultValue="2,000" placeholder="Unit price USD/T" /><Input defaultValue="Busan, Korea" placeholder="Port of discharge" /></div>,
    <div className="grid gap-3 sm:grid-cols-2"><Input value={lotNo} onChange={(e) => setLotNo(e.target.value)} placeholder="Lot No." /><Input defaultValue="99.99" placeholder="Pb actual %" /><Input defaultValue="0.0005" placeholder="Sn actual %" /><Input defaultValue="0.0005" placeholder="Sb actual %" /></div>,
    <div className="rounded-md border p-4 text-sm">Documents for {customer} are ready to send for approval. In demo mode, approval is simulated.</div>,
  ];

  return (
    <div className="mx-auto min-h-screen max-w-5xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-amber-700">Demo mode — no real data is changed</p>
          <h1 className="text-2xl font-semibold">IPP Shipments demo</h1>
        </div>
        <Button variant="outline" onClick={onExit}>Exit demo</Button>
      </div>
      <div className="mt-8 rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Sample shipment · Pure Lead Ingots · Container DEMO-001</p>
        <h2 className="mt-2 text-xl font-semibold">{steps[step]}</h2>
        <div className="mt-6">{content[step]}</div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled={step === 0} variant="outline" onClick={() => setStep((value) => value - 1)}>Back</Button>
          <Button disabled={step === steps.length - 1} onClick={() => setStep((value) => value + 1)}>
            {step === steps.length - 1 ? "Complete" : `Continue to ${steps[step + 1]}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
