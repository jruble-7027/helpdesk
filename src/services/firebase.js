import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  setDoc,
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

// Production Firebase Configuration for WCA Tickets
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCmJ90tk3NL-2bmunFsorUoOo7NtF6hOUE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "wca-tickets-58f6c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "wca-tickets-58f6c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "wca-tickets-58f6c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "354905762912",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:354905762912:web:9f014f9966499bddf2a705",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WJQQPXFT28"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

export const logoutUser = () => signOut(auth);

// Ticket creation helper
export const submitTicket = async (ticketData, files = []) => {
  try {
    const uploadedPhotos = [];
    
    // Upload any attached photos/files to Firebase Storage
    for (const file of files) {
      try {
        const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const fileRef = storageRef(storage, `ticket-attachments/${fileId}`);
        const uploadResult = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        uploadedPhotos.push({
          url: downloadUrl,
          name: file.name,
          size: file.size,
          type: file.type
        });
      } catch (uploadErr) {
        console.warn("Storage upload error (may require storage activation):", uploadErr);
      }
    }

    const docRef = await addDoc(collection(db, 'tickets'), {
      ...ticketData,
      attachments: uploadedPhotos,
      status: 'new',
      statusHistory: [
        {
          status: 'new',
          timestamp: new Date().toISOString(),
          updatedBy: ticketData.createdByName || 'Requester',
          note: 'Ticket submitted via Helpdesk Portal'
        }
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { id: docRef.id, ...ticketData, attachments: uploadedPhotos };
  } catch (error) {
    console.error("Error creating ticket:", error);
    throw error;
  }
};
