# B2B Order Manager

A comprehensive Next.js application designed for B2B vendors to efficiently manage clients, products, orders, and purchase bills. It integrates Firebase for robust backend services and leverages Google's Genkit for AI-powered features like invoice scanning.

## 🚀 Overview

This platform serves as a bridge between Vendors and their Clients. Vendors can manage their product catalog and track COGS (Cost of Goods Sold), while Clients can access a portal to place orders and track their delivery status.

## 🛠 Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Backend**: Firebase (Auth & Firestore)
- **AI**: Google Genkit + Gemini 2.5 Flash
- **Styling**: Tailwind CSS + ShadCN UI
- **Context**: Custom providers for User Profiles and Multi-Country configurations (UAE/India)

## 📁 Project Structure

- `src/app`: App Router pages and layouts.
- `src/components`: Reusable UI components, organized by feature (orders, clients, admin).
- `src/context`: React Context providers for global state management.
- `src/firebase`: Firebase configuration, hooks (`useCollection`, `useDoc`), and non-blocking update utilities.
- `src/ai`: Genkit flows for structured data extraction from purchase bills.
- `docs/backend.json`: The source of truth for the Firestore data model.

## 👥 User Roles

### 1. Vendor
- **Dashboard**: View revenue, purchases, and profit metrics.
- **Product Catalog**: Manage SKUs, pricing, and units.
- **Order Management**: Create "legacy" orders for clients or price orders placed through the portal.
- **Purchase Bills**: Record purchases with AI-powered scanning to track expenses.
- **Reporting**: Export sales and purchase data to CSV.

### 2. Client
- **Portal**: Browse the vendor's catalog and place orders.
- **Order Tracking**: Monitor order status (Pending, Priced, In Transit, Delivered).
- **Invoices**: View and print professional A5 tax invoices or thermal receipts.

### 3. Admin
- **User Management**: Monitor all accounts, delete inactive profiles, and initiate password resets.
- **Invitation System**: Generate one-time tokens for new vendors or sub-admins.
- **Global Visibility**: Filter and view orders across the entire platform.

## 🧾 Documentation & Maintenance

### Data Modeling
The `docs/backend.json` file defines the schema for all entities. Use this as a reference when adding new fields or collections to ensure consistency with security rules.

### Security Rules
Security is enforced at the database level via `firestore.rules`. Access is restricted based on user roles and ownership paths (e.g., `/users/{userId}/...`).

### Adding AI Features
New AI capabilities should be implemented as Genkit Flows in `src/ai/flows`. These flows are server-side and should return structured JSON data for the frontend.

---

## 🔧 Setup & Deployment

Refer to the original setup instructions for environment variables and Firebase configuration. For production, ensure `GEMINI_API_KEY` is configured in your hosting environment.
