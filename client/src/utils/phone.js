/** US phone input mask: (555) 123-4567. */
export const US_PHONE_PATTERN = '\(\d{3}\) \d{3}-\d{4}';
export const US_PHONE_HINT = 'Enter a 10-digit US number: (555) 123-4567';

const digitsOf = (value) => {
    let digits = value.replace(/\D/g, '');
    if (digits.length > 10 && digits[0] === '1') digits = digits.slice(1); // pasted "+1 555…"
    return digits.slice(0, 10);
};

/**
 * Formats typed or pasted text as (555) 123-4567. Pass the previous value so that backspacing over a mask
 * character such as ")" removes the digit before it instead of re-adding the character.
 */
export const maskPhone = (next, previous = '') => {
    let digits = digitsOf(next);
    if (next.length < previous.length && digits === digitsOf(previous)) digits = digits.slice(0, -1);
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};
