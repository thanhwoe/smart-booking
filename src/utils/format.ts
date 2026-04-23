/**
 * Format date string to local string
 * @param iso ISO string of the date
 * @returns formatted local date string
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

/**
 * Format numerical amount to internationalized currency string
 * @param amount amount in smallest unit (e.g., cents)
 * @param currency currency code
 * @returns formatted amount string
 */
export function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Format validation errors
 * @param errors array of validation errors
 * @returns array of formatted validation errors
 */
export function formatValidationErrors(errors: string[]): string[] {
  return errors.map((error) => {
    return error
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  });
}
