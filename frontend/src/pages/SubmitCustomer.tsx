import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import {
  EMPTY_FORM,
  EMPTY_PARTY,
  formToCustomerInput,
  customerToForm,
  MAX_NOTIFY_PARTIES,
  DEFAULT_COA_SPECIFICATIONS,
  type CustomerFormState,
  type PartyFields,
} from "@/lib/customer-form";
import { ApiError } from "@/lib/http";

type PartySectionProps = {
  title: string;
  party: PartyFields;
  onChange: (party: PartyFields) => void;
  onRemove?: () => void;
  defaultOpen?: boolean;
};

function PartySection({ title, party, onChange, onRemove, defaultOpen = false }: PartySectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" className="flex-1 justify-between px-2">
            {title}
            <span className="text-muted-foreground">{open ? "−" : "+"}</span>
          </Button>
        </CollapsibleTrigger>
        {onRemove && (
          <Button type="button" variant="outline" size="sm" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      <CollapsibleContent className="mt-3 space-y-3">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input
            value={party.name}
            onChange={(e) => onChange({ ...party, name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Address</Label>
          <Input
            value={party.address}
            onChange={(e) => onChange({ ...party, address: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Contact</Label>
          <Input
            value={party.contact}
            onChange={(e) => onChange({ ...party, contact: e.target.value })}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function SubmitCustomer() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getCustomers().then((customers) => {
      const customer = customers.find((c) => c.id === id);
      if (customer) setForm(customerToForm(customer));
    });
  }, [id]);

  function updateConsignee(consignee: PartyFields) {
    setForm((prev) => ({ ...prev, consignee }));
  }

  function updateNotifyParty(index: number, party: PartyFields) {
    setForm((prev) => ({
      ...prev,
      notifyParties: prev.notifyParties.map((p, i) => (i === index ? party : p)),
    }));
  }

  function addNotifyParty() {
    if (form.notifyParties.length >= MAX_NOTIFY_PARTIES) return;
    setForm((prev) => ({
      ...prev,
      notifyParties: [...prev.notifyParties, { ...EMPTY_PARTY }],
    }));
  }

  function removeNotifyParty(index: number) {
    if (form.notifyParties.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      notifyParties: prev.notifyParties.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      if (isEdit && id) {
        await api.updateCustomer(id, formToCustomerInput(form));
        navigate("/customers");
      } else {
        await api.createCustomer(formToCustomerInput(form));
        setSuccess(true);
        setForm(EMPTY_FORM);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">{isEdit ? "Edit Customer" : "Add New Customer"}</h1>

      {success && (
        <Alert>
          <AlertDescription>Submitted for admin approval</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">Customer Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="customer-code">Customer Code</Label>
          <Input
            id="customer-code"
            value={form.customer_code}
            onChange={(e) => setForm((prev) => ({ ...prev, customer_code: e.target.value }))}
            placeholder="e.g. AR (2 letters, used in invoice number)"
            maxLength={2}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="port">Port of Discharge</Label>
          <Input
            id="port"
            value={form.port_of_discharge}
            onChange={(e) => setForm((prev) => ({ ...prev, port_of_discharge: e.target.value }))}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="material-name">Material name for export documents</Label>
          <Input
            id="material-name"
            value={form.material_name}
            onChange={(e) => setForm((prev) => ({ ...prev, material_name: e.target.value }))}
            placeholder="For example: Pure Lead Ingots"
          />
        </div>

        <PartySection
          title="Consignee"
          party={form.consignee}
          onChange={updateConsignee}
          defaultOpen
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Notifying Parties</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={form.notifyParties.length >= MAX_NOTIFY_PARTIES}
              onClick={addNotifyParty}
            >
              Add notifying party
            </Button>
          </div>

          {form.notifyParties.map((party, index) => (
            <PartySection
              key={index}
              title={`Notifying Party ${index + 1}`}
              party={party}
              onChange={(updated) => updateNotifyParty(index, updated)}
              onRemove={form.notifyParties.length > 1 ? () => removeNotifyParty(index) : undefined}
              defaultOpen={index === 0}
            />
          ))}
        </div>

        <div className="space-y-1">
          <Label htmlFor="payment">Payment Terms</Label>
          <Input
            id="payment"
            value={form.payment_terms}
            onChange={(e) => setForm((prev) => ({ ...prev, payment_terms: e.target.value }))}
          />
        </div>

        <Collapsible className="rounded-md border p-3">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="w-full justify-between px-2">
              COA specifications
              <span className="text-muted-foreground">Edit limits</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 grid gap-3 sm:grid-cols-2">
            {Object.entries(DEFAULT_COA_SPECIFICATIONS).map(([symbol]) => (
              <div key={symbol} className="space-y-1">
                <Label htmlFor={`spec-${symbol}`}>{symbol}</Label>
                <Input
                  id={`spec-${symbol}`}
                  value={form.coa_specifications[symbol] ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      coa_specifications: {
                        ...prev.coa_specifications,
                        [symbol]: event.target.value,
                      },
                    }))
                  }
                />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Add customer for approval"}
        </Button>
      </form>
    </div>
  );
}
