
'use client';

export const COUNTRIES = {
    AE: {
        code: 'AE',
        name: 'United Arab Emirates',
        currencyCode: 'AED',
        currencySymbol: 'AED',
        vatRate: 0.05,
        vatLabel: 'VAT',
        taxIdLabel: 'TRN',
        taxIdName: 'Tax Registration Number',
    },
    IN: {
        code: 'IN',
        name: 'India',
        currencyCode: 'INR',
        currencySymbol: '₹',
        vatRate: 0.18, 
        vatLabel: 'GST',
        taxIdLabel: 'GSTIN',
        taxIdName: 'Goods and Services Tax Identification Number',
    },
} as const;

export type CountryCode = keyof typeof COUNTRIES;
export type CountryConfig = typeof COUNTRIES[CountryCode];
