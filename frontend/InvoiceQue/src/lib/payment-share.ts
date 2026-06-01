import { formatCurrency } from "./utils";

type ShareablePaymentLink = {
  title: string;
  description?: string;
  amount: number;
  currency: string;
  url: string;
};

export function createPaymentWhatsAppUrl(link: ShareablePaymentLink) {
  const message = [
    "Halo, berikut link pembayaran:",
    "",
    `*${link.title}*`,
    `Nominal: ${formatCurrency(link.amount, link.currency)}`,
    link.description ? `Keterangan: ${link.description}` : "",
    "",
    link.url,
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
