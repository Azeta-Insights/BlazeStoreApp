import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import rawConfig from '../firebase-applet-config.json';

// Suppress benign gRPC idle stream cancellation warnings
setLogLevel('error');

export const firebaseConfig = {
  apiKey: rawConfig.apiKey,
  authDomain: rawConfig.authDomain,
  projectId: rawConfig.projectId,
  storageBucket: rawConfig.storageBucket,
  messagingSenderId: rawConfig.messagingSenderId,
  appId: rawConfig.appId,
};

export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const dbId = (rawConfig as any).firestoreDatabaseId;

export const firestoreDb = (() => {
  try {
    return initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true,
    }, dbId);
  } catch (e) {
    return dbId ? getFirestore(firebaseApp, dbId) : getFirestore(firebaseApp);
  }
})();

export const firebaseAuth = getAuth(firebaseApp);
