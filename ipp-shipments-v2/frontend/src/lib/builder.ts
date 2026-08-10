import type { Customer } from "./api";

export function customerHasNotify1(customer: Customer): boolean {
  return Boolean(customer.notify1_l1?.trim());
}

export function customerHasNotify2(customer: Customer): boolean {
  return Boolean(customer.notify2_l1?.trim());
}

export function formatNotify1Label(customer: Customer): string {
  return customer.notify1_l1?.trim() || customer.name;
}

export function formatNotify1Detail(customer: Customer): string {
  return [customer.notify1_l2, customer.notify1_l3, customer.notify1_l4, customer.notify1_l5]
    .filter((line) => line?.trim())
    .join(" · ");
}

export function formatNotify2Label(customer: Customer): string {
  return customer.notify2_l1?.trim() || customer.name;
}

export function formatNotify2Detail(customer: Customer): string {
  return [customer.notify2_l2, customer.notify2_l3, customer.notify2_l4]
    .filter((line) => line?.trim())
    .join(" · ");
}

export function formatConsigneeLabel(customer: Customer): string {
  return customer.consignee_l1?.trim() || customer.name;
}

export function formatConsigneeDetail(customer: Customer): string {
  return [customer.consignee_l2, customer.consignee_l3, customer.consignee_l4, customer.consignee_l5]
    .filter((line) => line?.trim())
    .join(" · ");
}

export function applyConsigneeSelection(customer: Customer): {
  consigneeId: string;
  notify1Id: string | null;
  notify2Id: string | null;
  portOfDischarge: string | null;
  paymentTerms: string | null;
} {
  return {
    consigneeId: customer.id,
    notify1Id: customerHasNotify1(customer) ? customer.id : null,
    notify2Id: customerHasNotify2(customer) ? customer.id : null,
    portOfDischarge: customer.port_of_discharge,
    paymentTerms: customer.payment_terms,
  };
}
