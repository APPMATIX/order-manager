
'use client';

export const COUNTRIES = {
    AE: {
        code: 'AE',
        name: 'United Arab Emirates',
        currencyCode: 'AED',
        currencySymbol: 'AED',
        vatRate: 0.05,
        vatLabel: 'VAT',
    },
    IN: {
        code: 'IN',
        name: 'India',
        currencyCode: 'INR',
        currencySymbol: '₹',
        vatRate: 0.18, // Example GST rate
        vatLabel: 'GST',
    },
} as const;

export type CountryCode = keyof typeof COUNTRIES;
export type CountryConfig = typeof COUNTRIES[CountryCode];
