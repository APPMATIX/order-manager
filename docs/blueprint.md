# **App Name**: B2B Order Manager

## Core Features:

- Client Management: Create, read, update, and delete client information including name, contact email, delivery address, credit limit, and default payment terms (Net 30, COD).
- Product Catalog: Manage the product catalog with details such as SKU, name, unit (KG, Box, Crate), and price.
- Order Management: Simulate order placements, track order status through fulfillment (Pending, Accepted, In Transit, Delivered), and manage line items with total amount calculations.
- Payment Tracking: Track payment status (Unpaid, Invoiced, Paid, Overdue) and payment method for each order.
- Data Persistence: Store all client, product, and order data securely in Firestore with unique identifiers for data isolation and security. Collections are rooted under the current user's private path.
- Authentication: Secure the app, only the authorized vendor is able to view and make changes.

## Style Guidelines:

- Primary color: Deep teal (#008080) to reflect freshness and reliability.
- Background color: Light teal (#E0F8F7), a very lightly saturated variant of the primary color for a calm atmosphere.
- Accent color: Light orange (#EBB674), contrasting with the teal, for CTAs and important updates.
- Body and headline font: 'Inter' for a clean, modern user interface.
- Crisp, clear icons representing clients, products, and order status.
- Clean and organized layout with intuitive navigation between Clients, Products, and Orders tabs.
- Subtle animations when updating order or payment statuses to provide user feedback.