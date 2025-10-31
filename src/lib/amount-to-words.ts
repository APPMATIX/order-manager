// Function to convert number to words
// It's a simplified version and might not cover all edge cases
// but should work for typical invoice amounts.

const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
const thousands = ['', 'THOUSAND', 'MILLION', 'BILLION'];

function numberToWords(num: number): string {
    if (num === 0) return 'ZERO';

    let words = '';
    let i = 0;

    do {
        let n = num % 1000;
        if (n !== 0) {
            let s = convertHundreds(n);
            words = s + (thousands[i] ? ' ' + thousands[i] : '') + ' ' + words;
        }
        i++;
        num = Math.floor(num / 1000);
    } while (num > 0);

    return words.trim();
}

function convertHundreds(num: number): string {
    let word = '';
    if (num >= 100) {
        word += ones[Math.floor(num / 100)] + ' HUNDRED ';
        num %= 100;
    }
    if (num >= 10 && num <= 19) {
        word += teens[num - 10] + ' ';
    } else {
        if (num >= 20) {
            word += tens[Math.floor(num / 10)] + ' ';
            num %= 10;
        }
        if (num > 0) {
            word += ones[num] + ' ';
        }
    }
    return word;
}

export function amountToWords(amount: number): string {
    if (typeof amount !== 'number' || amount < 0) {
        return '';
    }

    const integerPart = Math.floor(amount);
    const fractionalPart = Math.round((amount - integerPart) * 100);

    let words = numberToWords(integerPart);
    if (fractionalPart > 0) {
        words += ` AND ${fractionalPart}/100`;
    }
    
    return words + ' ONLY';
}
