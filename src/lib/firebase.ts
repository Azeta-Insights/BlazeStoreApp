import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import rawConfig from '../../firebase-applet-config.json';

// Suppress benign gRPC idle stream cancellation warnings
setLogLevel('error');

// Construct Firebase configuration from applet configuration
export const firebaseConfig = {
  apiKey: rawConfig.apiKey || "AIzaSyBvT-lc2aM4COerr8EJIyODfa7gIvUdmBQ",
  authDomain: rawConfig.authDomain || "blazestoreapp.firebaseapp.com",
  projectId: rawConfig.projectId || "blazestoreapp",
  storageBucket: rawConfig.storageBucket || "blazestoreapp.firebasestorage.app",
  messagingSenderId: rawConfig.messagingSenderId || "724566112743",
  appId: rawConfig.appId || "1:724566112743:web:372057304061ac5e54e542",
};

// Initialize or get singleton Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const dbId = (rawConfig as any).firestoreDatabaseId;

// Initialize Firestore for blazestoreapp database with automatic long polling fallback
export const firestore = (() => {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    }, dbId);
  } catch (e) {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
})();

export const db = firestore;

export const auth = getAuth(app);

export default app;

