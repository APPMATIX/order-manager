# B2B Order Manager

This is a Next.js application designed to manage clients, products, and orders for B2B vendors. It uses Firebase for backend services and Genkit for AI-powered features.

## Getting Started

Follow these instructions to set up and run the project on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

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
    *   In the console, navigate to the **Authentication** section and enable the **Email/Password** sign-in method on the "Sign-in method" tab.
    *   Navigate to the **Firestore Database** section and create a new database. Choose **Production mode** and select a location.
3.  **Get Your Web App Config**:
    *   Go to your **Project Settings** in the Firebase Console.
    *   In the "Your apps" card, click the **Web** icon (`</>`) to register a new web app.
    *   Give your app a nickname and click "Register app".
    *   Firebase will provide you with a `firebaseConfig` object. Copy this object.
4.  **Update Application Code**:
    *   Open the `src/firebase/config.ts` file in your project.
    *   Replace the existing placeholder `firebaseConfig` object with the one you copied from your Firebase project.

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

    *   In the **first terminal**, start the Next.js application:
        ```bash
        npm run dev
        ```
    *   In the **second terminal**, start the Genkit server:
        ```bash
        npm run genkit:dev
        ```

3.  **Access the App**: Once both servers are running, open your browser and go to [http://localhost:9002](http://localhost:9002).
