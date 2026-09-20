import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import rawConfig from '../firebase-applet-config.json';

const projectId = rawConfig.projectId || 'blazestoreapp';

export const adminApp = getApps().length === 0
  ? initializeApp({ projectId })
  : getApp();

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
