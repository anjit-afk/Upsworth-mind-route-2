// =============================================================================
// Firebase Configuration
// =============================================================================
// HOW TO SET UP:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (or use an existing one)
// 3. Click "Add app" and choose the Web platform (</>)
// 4. Register your app and copy the config values below
// 5. In the Firebase console, go to "Firestore Database" and create a database
// 6. Replace the placeholder values below with your actual Firebase config
// =============================================================================

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC_pTEn8moMAcanvPcWxnrBkJ_1dNv9whQ",
  authDomain: "upsworth-mind.firebaseapp.com",
  projectId: "upsworth-mind",
  storageBucket: "upsworth-mind.firebasestorage.app",
  messagingSenderId: "402476144317",
  appId: "1:402476144317:web:4c5c76f27439a2adfa89d4",
  measurementId: "G-L7CJFSDWB0"
};

// Check if Firebase is configured (not using placeholder values)
export const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID_HERE" &&
    firebaseConfig.appId !== "YOUR_APP_ID_HERE"
  );
};

// Initialize Firebase only if configured
let app = null;
let db = null;
let storage = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.warn('[Firebase] Failed to initialize:', error.message);
  }
}

export { db, storage };
export default app;
