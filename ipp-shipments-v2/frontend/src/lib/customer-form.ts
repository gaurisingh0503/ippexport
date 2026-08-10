import type { CustomerInput } from "./api";

export type PartyFields = {
  name: string;
  address: string;
  contact: string;
};

export type CustomerFormState = {
  name: string;
  port_of_discharge: string;
  payment_terms: string;
  consignee: PartyFields;
  notifyParties: PartyFields[];
};

export const MAX_NOTIFY_PARTIES = 5;

export const EMPTY_PARTY: PartyFields = { name: "", address: "", contact: "" };

export const EMPTY_FORM: CustomerFormState = {
  name: "",
  port_of_discharge: "",
  payment_terms: "",
  consignee: { ...EMPTY_PARTY },
  notifyParties: [{ ...EMPTY_PARTY }],
};

const NOTIFY_PARTY_KEYS = [
  ["notify1_l1", "notify1_l2", "notify1_l3"],
  ["notify2_l1", "notify2_l2", "notify2_l3"],
  ["notify3_l1", "notify3_l2", "notify3_l3"],
  ["notify4_l1", "notify4_l2", "notify4_l3"],
  ["notify5_l1", "notify5_l2", "notify5_l3"],
] as const;

function nullIfEmpty(value: string): string | null {
  return value.trim() ? value.trim() : null;
}

export function formToCustomerInput(form: CustomerFormState): CustomerInput {
  const payload: CustomerInput = {
    name: form.name.trim(),
    consignee_l1: nullIfEmpty(form.consignee.name),
    consignee_l2: nullIfEmpty(form.consignee.address),
    consignee_l3: nullIfEmpty(form.consignee.contact),
    consignee_l4: null,
    consignee_l5: null,
    notify1_l1: null,
    notify1_l2: null,
    notify1_l3: null,
    notify1_l4: null,
    notify1_l5: null,
    notify2_l1: null,
    notify2_l2: null,
    notify2_l3: null,
    notify2_l4: null,
    notify3_l1: null,
    notify3_l2: null,
    notify3_l3: null,
    notify4_l1: null,
    notify4_l2: null,
    notify4_l3: null,
    notify5_l1: null,
    notify5_l2: null,
    notify5_l3: null,
    port_of_discharge: nullIfEmpty(form.port_of_discharge),
    payment_terms: nullIfEmpty(form.payment_terms),
  };

  form.notifyParties.slice(0, MAX_NOTIFY_PARTIES).forEach((party, index) => {
    const [nameKey, addressKey, contactKey] = NOTIFY_PARTY_KEYS[index];
    payload[nameKey] = nullIfEmpty(party.name);
    payload[addressKey] = nullIfEmpty(party.address);
    payload[contactKey] = nullIfEmpty(party.contact);
  });

  return payload;
}

export function consigneeDisplayName(customer: {
  consignee_l1: string | null;
}): string {
  return customer.consignee_l1 ?? "—";
}
