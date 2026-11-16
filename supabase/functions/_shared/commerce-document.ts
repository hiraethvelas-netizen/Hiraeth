/** Checks BR tax identifiers and telephone numbers without storing personal data. */
export function brazilianDigits(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}
export function isValidBrazilianDocument(value: unknown): boolean {
  const digits = brazilianDigits(value);
  if (![11, 14].includes(digits.length) || /^(\d)\1+$/.test(digits)) return false;
  const numbers = [...digits].map(Number);
  const validDigit = (index: number, weights: number[]) => {
    const sum = weights.reduce((total, weight, position) => total + numbers[position]! * weight, 0);
    const rest = sum % 11;
    return (rest < 2 ? 0 : 11 - rest) === numbers[index];
  };
  if (digits.length === 11) return validDigit(9, [10,9,8,7,6,5,4,3,2]) &&
    validDigit(10, [11,10,9,8,7,6,5,4,3,2]);
  return validDigit(12, [5,4,3,2,9,8,7,6,5,4,3,2]) &&
    validDigit(13, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
}
export function isValidBrazilianPhone(value: unknown): boolean {
  const digits = brazilianDigits(value);
  if (![10,11].includes(digits.length)) return false;
  const ddd = Number(digits.slice(0,2));
  if (ddd < 11 || ddd > 99) return false;
  const local = digits.slice(2);
  return digits.length === 11 ? /^9\d{8}$/.test(local) : /^[2-9]\d{7}$/.test(local);
}
