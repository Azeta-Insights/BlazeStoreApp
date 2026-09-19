import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import rawConfig from '../../firebase-applet-config.json';

// Construct Firebase configuration from applet configuration
export const firebaseConfig = {
  apiKey: (rawConfig as any).apiKey || "AIzaSyBvT-lc2aM4COerr8EJIyODfa7gIvUdmBQ",
  authDomain: rawConfig.authDomain || "blazestoreapp.firebaseapp.com",
  projectId: rawConfig.projectId || "blazestoreapp",
  storageBucket: rawConfig.storageBucket || "blazestoreapp.firebasestorage.app",
  messagingSenderId: rawConfig.messagingSenderId || "724566112743",
  appId: rawConfig.appId || "1:724566112743:web:372057304061ac5e54e542",
};

// Initialize or get singleton Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore for blazestoreapp default database
export const firestore = getFirestore(app);

export const auth = getAuth(app);

export default app;

