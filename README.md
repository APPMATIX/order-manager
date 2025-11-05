# B2B Order Manager

A comprehensive Next.js application designed for B2B vendors to efficiently manage clients, products, orders, and purchase bills. It integrates Firebase for robust backend services and leverages Google's Genkit for AI-powered features like invoice scanning.

## Features

-   **Vendor Dashboard**: An at-a-glance overview of business performance, including total revenue, purchases, and profit within a selected date range. It also features charts for monthly performance and a feed of recent activities like new orders and client signups.
-   **Client Management**: A full CRUD (Create, Read, Update, Delete) interface to manage your client database. You can add new clients, edit their details (like credit limits and payment terms), and search through existing clients.
-   **Product Catalog**: Manage your product inventory with ease. Add new products, update pricing, and specify units (e.g., KG, Box, Crate). The system can automatically generate SKUs for new products.
-   **Order Management**: A powerful system to create, view, and manage client orders. You can update order and payment statuses, and generate professional, print-ready tax invoices.
-   **Purchase Bill Tracking**: Keep track of your Cost-of-Goods-Sold (COGS) by recording purchase bills. This module features an AI-powered bill scanner that uses Google's Gemini model to automatically extract details from an uploaded image of a bill, populating the form for you.
-   **Reporting Engine**: Generate and download insightful reports in CSV format, including:
    -   Overall Sales Report
    -   Overall Purchases Report
    -   Client-Specific Sales Report
-   **Multi-level User Roles**:
    -   **Vendor**: The primary user, with access to all business management features.
    -   **Admin**: Can view data across all vendors.
    -   **Super-admin**: Can manage users and generate one-time signup tokens for new admins.
-   **Secure Authentication**: A complete authentication system for user signup and login, with different paths for vendors and admins.

## Technology Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication & Firestore)
-   **Generative AI**: [Google Genkit](https://firebase.google.com/docs/genkit) (for AI flows)
-   **Form Management**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) for validation

---

## Getting Started (Local Development)

Follow these instructions to set up and run the project on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   [npm](https://www.npmjs.com/) (usually comes with Node.js)

### 1. Environment Setup

You need to create a local environment file to store your secret keys.

1.  Create a new file in the root directory of the project named `.env.local`.
2.  Add the following line to it. You will get the key in a later step.

    ```
    GEMINI_API_KEY="YOUR_GOOGLE_AI_API_KEY"
    ```

### 2. Firebase Configuration

The application requires a Firebase project for authentication and the Firestore database.

1.  **Create a Firebase Project**: Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Enable Services**:
    -   In the console, navigate to the **Authentication** section and enable the **Email/Password** sign-in method on the "Sign-in method" tab.
    -   Navigate to the **Firestore Database** section and create a new database. Choose **Production mode** and select a location.
3.  **Get Your Web App Config**:
    -   Go to your **Project Settings** in the Firebase Console.
    -   In the "Your apps" card, click the **Web** icon (`</>`) to register a new web app.
    -   Give your app a nickname and click "Register app".
    -   Firebase will provide you with a `firebaseConfig` object. Copy this object.
4.  **Update Application Code**:
    -   Open the `src/firebase/config.ts` file in your project.
    -   Replace the existing placeholder `firebaseConfig` object with the one you copied from your Firebase project.

### 3. Google AI API Key

AI features, like scanning purchase bills, are powered by Google's Gemini model.

1.  Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to get your API key.
2.  Create a new API key.
3.  Copy the key and paste it as the value for `GEMINI_API_KEY` in your `.env.local` file.

### 4. Install & Run the Application

Now you're ready to start the application.

1.  **Install Dependencies**: Open your terminal in the project's root directory and run:
    ```bash
    npm install
    ```
2.  **Run the Development Servers**: For full functionality, you need to run both the Next.js frontend and the Genkit AI server. Open two separate terminal tabs or windows.

    -   In the **first terminal**, start the Next.js application:
        ```bash
        npm run dev
        ```
    -   In the **second terminal**, start the Genkit server:
        ```bash
        npm run genkit:dev
        ```

3.  **Access the App**: Once both servers are running, open your browser and go to [http://localhost:9002](http://localhost:9002).


---

## 🚀 Deployment

When deploying your application to a hosting provider like Vercel, you must configure your environment variables in the project settings on that platform. The local `.env.local` file is **not** used in production.

### Configuring Environment Variables on Vercel

The AI-powered features (like the bill scanner) will fail in your live application if the `GEMINI_API_KEY` is not set.

1.  **Go to your Vercel Project**: Open your project on the Vercel dashboard.
2.  **Navigate to Settings**: Click on the "Settings" tab.
3.  **Go to Environment Variables**: In the left-hand menu, click on "Environment Variables".
4.  **Add the API Key**:
    -   For the **Name**, enter `GEMINI_API_KEY`.
    -   For the **Value**, paste the same Google AI API key you used in your `.env.local` file.
    -   Ensure the key is available to all environments (Production, Preview, and Development).
5.  **Save and Redeploy**: Save the variable. Vercel will automatically trigger a new deployment with the updated environment variable.

After the new deployment is complete, the bill scanning feature should work correctly on your live Vercel app.
