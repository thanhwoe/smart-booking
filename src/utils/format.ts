export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}
