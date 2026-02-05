
'use client';
import type { Timestamp } from 'firebase/firestore';
import { ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_TERMS, PRODUCT_UNITS, INVOICE_TYPES } from './config';
import { CountryCode } from './country-config';

export type UserProfile = {
  id: string;
  email: string | null;
  userType: 'vendor' | 'admin' | 'client';
  companyName: string;
  country: CountryCode;
  vendorId?: string; // For client users
  trn?: string;
  address?: string;
  billingAddress?: string;
  phone?: string;
  website?: string;
  photoURL?: string;
  createdAt?: Timestamp;
}

export type Vendor = {
  id: string;
  name: string;
}

export type Client = {
  id:string;
  name: string;
  contactEmail?: string;
  deliveryAddress?: string;
  creditLimit?: number;
  defaultPaymentTerms?: typeof PAYMENT_TERMS[number];
  trn?: string;
  createdAt?: Timestamp;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  unit: typeof PRODUCT_UNITS[number];
  price: number;
  createdAt?: Timestamp;
};

export type LineItem = {
  productId?: string;
  productName?: string;
  name?: string;
  unit?: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
};

export type Order = {
  id: string;
  customOrderId?: string;
  clientId: string;
  clientName: string;
  vendorId: string;
  orderDate: Timestamp;
  status: typeof ORDER_STATUSES[number];
  lineItems: LineItem[];
  subTotal?: number;
  vatAmount?: number;
  totalAmount?: number;
  paymentStatus?: typeof PAYMENT_STATUSES[number];
  createdAt: Timestamp;
  invoiceType?: typeof INVOICE_TYPES[number];
  paymentMethod?: string;
};

export type PurchaseBill = {
  id: string;
  vendorName: string;
  vendorTrn?: string;
  vendorAddress?: string;
  vendorPhone?: string;
  billDate: Timestamp;
  subTotal: number;
  vatAmount: number;
  totalAmount: number;
  lineItems: {
    itemName: string;
    unit?: string;
    quantity: number;
    costPerUnit: number;
  }[];
  createdAt?: Timestamp;
};

export type SignupToken = {
  id: string;
  role: 'admin' | 'vendor';
  status: 'active' | 'used' | 'expired';
  createdBy: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  usedBy?: string;
  usedAt?: Timestamp;
};
