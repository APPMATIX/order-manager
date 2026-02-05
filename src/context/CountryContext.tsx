
'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useUserProfile } from './UserProfileContext';
import { COUNTRIES, CountryConfig, CountryCode } from '@/lib/country-config';

interface CountryContextType {
    countryConfig: CountryConfig;
    formatCurrency: (amount: number) => string;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export const CountryProvider = ({ children }: { children: ReactNode }) => {
    const { userProfile } = useUserProfile();

    // Default to AE if no user profile or country is found
    const countryCode: CountryCode = userProfile?.country || 'AE';
    const countryConfig = COUNTRIES[countryCode];

    // Memoize the formatter function
    const formatCurrency = useMemo(() => {
        const formatter = new Intl.NumberFormat(`en-${countryCode}`, {
            style: 'currency',
            currency: countryConfig.currencyCode,
        });
        return (amount: number) => formatter.format(amount);
    }, [countryCode, countryConfig.currencyCode]);
    
    // Memoize the context value
    const value = useMemo(() => ({
        countryConfig,
        formatCurrency,
    }), [countryConfig, formatCurrency]);

    return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export const useCountry = (): CountryContextType => {
    const context = useContext(CountryContext);
    if (context === undefined) {
        throw new Error('useCountry must be used within a CountryProvider');
    }
    return context;
}
