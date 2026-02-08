# B2B Order Manager & Billing System

A high-performance Next.js application designed for B2B vendors to manage clients, products, orders, and purchase bills with an integrated AI-powered invoice scanner.

## 🚀 Key Features

### 🏢 Multi-Role Access Control
- **Vendors**: Manage catalog, inventory pricing, and track COGS via AI scanning.
- **Clients**: Self-service portal to browse catalogs and place orders.
- **Admins**: System-wide oversight, user lifecycle management, and secure token issuance.

### 📄 Professional Billing
- **Bilingual Tax Invoices**: Strict A5-sized layout with English/Arabic headers for UAE/India compliance.
- **Thermal Receipts**: Optimized for 80mm thermal printers with "No Warranty No Return" disclaimers.
- **Smart Preview**: Modern dashboard preview contrasted with legacy-compliant print layouts.

### 🤖 AI Integration (Genkit)
- **Bill Extraction**: Automatic data entry from purchase bill images using Gemini 2.5 Flash.
- **Auto-Inventory**: Automatically detects and adds new products to the catalog during purchase recording.

### 📱 Mobile-First Design
- **Adaptive Lists**: All data tables automatically transform into touch-friendly cards on mobile devices.
- **Responsive Charts**: Business intelligence visualizations that resize dynamically.

## 📁 Project Structure

- `src/app`: Next.js App Router (Auth-guarded routes).
- `src/components`: UI components organized by feature (orders, admin, layout).
- `src/ai`: Genkit flows for structured data extraction.
- `src/context`: Global state for User Profiles and Country-specific configurations (Tax/Currency).
- `docs/backend.json`: The technical source of truth for the Firestore schema.

## 🛠 Tech Stack

- **Framework**: Next.js 15
- **Database/Auth**: Firebase (Firestore & Auth)
- **AI Engine**: Google Genkit + Gemini
- **UI Components**: Radix UI + ShadCN + Tailwind CSS
- **Icons**: Lucide React

## 🔒 Security Architecture

The system utilizes **Authorization Independence**. Access control is enforced via `firestore.rules` based on:
1.  **Path Ownership**: `/users/{userId}/...` paths ensure vendors only see their data.
2.  **Custom Claims**: Admin and Vendor roles are verified at the database level.
3.  **Cross-Reference Checks**: Clients can only see products from their specific linked `vendorId`.

---
Developed by **Appmatix Solutions**. All Rights Reserved.
