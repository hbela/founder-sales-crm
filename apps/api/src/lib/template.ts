import type { Contact, Product } from "@founder-crm/db";

export const TEMPLATE_VARIABLES = [
  "{{firstName}}",
  "{{lastName}}",
  "{{company}}",
  "{{website}}",
  "{{productName}}",
] as const;

export function renderTemplate(
  template: string,
  ctx: { contact: Pick<Contact, "firstName" | "lastName" | "company" | "website">; product?: Pick<Product, "name"> | null },
): string {
  return template
    .replaceAll("{{firstName}}", ctx.contact.firstName ?? "")
    .replaceAll("{{lastName}}", ctx.contact.lastName ?? "")
    .replaceAll("{{company}}", ctx.contact.company ?? "")
    .replaceAll("{{website}}", ctx.contact.website ?? "")
    .replaceAll("{{productName}}", ctx.product?.name ?? "");
}
