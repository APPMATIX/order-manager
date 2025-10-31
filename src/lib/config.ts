'use client';
export const PAYMENT_TERMS = ['Net 30', 'COD'] as const;
export const PRODUCT_UNITS = ['KG', 'Box', 'Crate', 'Piece', 'PCS', 'TRAY', 'CTN', 'TIN', 'PKT', 'BKT'] as const;
export const ORDER_STATUSES = ['Pending', 'Accepted', 'In Transit', 'Delivered'] as const;
export const PAYMENT_STATUSES = ['Unpaid', 'Invoiced', 'Paid', 'Overdue'] as const;
export const INVOICE_TYPES = ['Normal', 'VAT'] as const;
export const VAT_RATE = 0.05;
