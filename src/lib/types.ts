import type { Timestamp } from 'firebase/firestore';
import { ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_TERMS, PRODUCT_UNITS } from './config';

export type UserProfile = {
  id: string;
  email: string | null;
  userType: 'vendor' | 'client';
}

export type Client = {
  id:string;
  name: string;
  contactEmail: string;
  deliveryAddress: string;
  creditLimit: number;
  defaultPaymentTerms: typeof PAYMENT_TERMS[number];
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
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type Order = {
  id: string;
  customOrderId: string;
  clientId: string;
  clientName: string;
  orderDate: Timestamp;
  status: typeof ORDER_STATUSES[number];
  lineItems: LineItem[];
  totalAmount: number;
  paymentStatus: typeof PAYMENT_STATUSES[number];
  createdAt: Timestamp;
};
