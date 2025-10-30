import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "studio-4978464444-3fae6",
  "appId": "1:871282879454:web:da4c1e2c3d61262cb64b4f",
  "apiKey": "AIzaSyAf__b5CFr_HyE2svDEaJi9AHps_7rEHlM",
  "authDomain": "studio-4978464444-3fae6.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "871282879454",
  "storageBucket": "studio-4978464444-3fae6.appspot.com"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
