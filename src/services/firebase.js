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
  deleteDoc,
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  onSnapshot,
  arrayUnion 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { SUPER_ADMIN_EMAILS } from '../data/rolesData';
import { AREAS as DEFAULT_AREAS, BUILDINGS as DEFAULT_BUILDINGS, DEFAULT_PLACES } from '../data/categoriesData';

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

// Synchronize user profile in Firestore
export const syncUserProfile = async (user) => {
  if (!user) return null;
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const emailLower = (user.email || '').toLowerCase();
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(emailLower);

  if (!userSnap.exists()) {
    const initialRole = isSuperAdmin ? 'admin' : 'requester';
    const newUserData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL || null,
      role: initialRole,
      department: 'general',
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    };
    await setDoc(userRef, newUserData);
    return newUserData;
  } else {
    const existingData = userSnap.data();
    const updates = {
      displayName: user.displayName || existingData.displayName,
      photoURL: user.photoURL || existingData.photoURL,
      lastLogin: serverTimestamp()
    };
    // Ensure super admin always keeps admin role
    if (isSuperAdmin && existingData.role !== 'admin') {
      updates.role = 'admin';
    }
    await updateDoc(userRef, updates);
    return { ...existingData, ...updates };
  }
};

// Listen to current user's profile
export const subscribeToUserProfile = (uid, callback) => {
  if (!uid) return () => {};
  return onSnapshot(doc(db, 'users', uid), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    }
  });
};

// Admin: Update another user's role
export const updateUserRole = async (targetUid, newRole, department = 'general') => {
  const userRef = doc(db, 'users', targetUid);
  await updateDoc(userRef, {
    role: newRole,
    department,
    updatedAt: serverTimestamp()
  });
};

// Custom Catalog & Settings (Buildings, Places, Asset Lists, Pre-Defined Issues)
export const subscribeToCatalog = (callback) => {
  const catalogRef = doc(db, 'settings', 'catalog');
  return onSnapshot(catalogRef, async (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      let needsPersist = false;

      // Ensure places is populated with the correct 3 NC locations (Centennial, Sandy Ridge, Conrad)
      const hasOldMinnesotaPlaces = data.places && Array.isArray(data.places) && data.places.some((p) => (p.address || '').includes('MN') || p.id === 'secondary');
      
      if (!data.places || !Array.isArray(data.places) || data.places.length === 0 || hasOldMinnesotaPlaces) {
        data.places = DEFAULT_PLACES;
        needsPersist = true;
      } else {
        // Ensure every place has its rooms array populated
        data.places = data.places.map((place) => {
          const defaultMatch = DEFAULT_PLACES.find((dp) => dp.id === place.id || dp.name.toLowerCase() === place.name.toLowerCase());
          if (!place.rooms || !Array.isArray(place.rooms) || place.rooms.length === 0) {
            needsPersist = true;
            return {
              ...place,
              rooms: defaultMatch?.rooms || [
                'Main Office', 'Cafeteria', 'Gymnasium', 'Media Center / Library',
                'Room 101', 'Room 102', 'Room 103', 'Room 104', 'Restrooms', 'Exterior / Grounds'
              ]
            };
          }
          return place;
        });
      }

      data.buildings = data.places.map((p) => p.name);

      if (needsPersist) {
        try {
          await setDoc(catalogRef, {
            ...data,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.warn("Could not auto-migrate catalog settings:", e);
        }
      }

      callback(data);
    } else {
      // Auto-seed initial defaults into Firestore
      const initialCatalog = {
        places: DEFAULT_PLACES,
        buildings: DEFAULT_PLACES.map((p) => p.name),
        areas: DEFAULT_AREAS,
        updatedAt: serverTimestamp()
      };
      try {
        await setDoc(catalogRef, initialCatalog);
        callback(initialCatalog);
      } catch (err) {
        console.warn("Could not seed settings/catalog:", err);
        callback({ places: DEFAULT_PLACES, buildings: DEFAULT_PLACES.map((p) => p.name), areas: DEFAULT_AREAS });
      }
    }
  }, (err) => {
    console.warn("Catalog listener fallback to defaults:", err);
    callback({ places: DEFAULT_PLACES, buildings: DEFAULT_PLACES.map((p) => p.name), areas: DEFAULT_AREAS });
  });
};

export const saveCatalogSettings = async (catalogData) => {
  const catalogRef = doc(db, 'settings', 'catalog');
  await setDoc(catalogRef, {
    ...catalogData,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

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
        console.warn("Storage upload error:", uploadErr);
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

export const deleteTicket = async (ticketId) => {
  const ticketRef = doc(db, 'tickets', ticketId);
  await deleteDoc(ticketRef);
};

// Staff Members (Technicians, Admins, Agents)
export const subscribeToStaffMembers = (callback) => {
  const q = query(collection(db, 'users'));
  return onSnapshot(q, (snapshot) => {
    const staff = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((u) => ['admin', 'agent', 'facilities_tech', 'housekeeping_tech', 'it_tech'].includes(u.role))
      .sort((a, b) => (a.displayName || a.email || '').localeCompare(b.displayName || b.email || ''));
    callback(staff);
  }, (err) => {
    console.warn("Error fetching staff members:", err);
    callback([]);
  });
};

// Assign ticket to a technician
export const assignTicket = async (ticketId, assigneeUser, assignedBy) => {
  const ticketRef = doc(db, 'tickets', ticketId);
  const assigneeName = assigneeUser ? (assigneeUser.displayName || assigneeUser.email) : null;
  const assigneeEmail = assigneeUser ? assigneeUser.email : null;
  const assigneeUid = assigneeUser ? (assigneeUser.uid || assigneeUser.id) : null;

  const historyEntry = {
    status: assigneeUser ? 'assigned' : 'new',
    timestamp: new Date().toISOString(),
    updatedBy: assignedBy?.displayName || assignedBy?.email || 'Dispatcher',
    note: assigneeUser ? `Ticket assigned to ${assigneeName}` : 'Ticket unassigned'
  };

  const updatePayload = {
    assignedToName: assigneeName,
    assignedToEmail: assigneeEmail,
    assignedToUid: assigneeUid,
    statusHistory: arrayUnion(historyEntry),
    updatedAt: serverTimestamp()
  };

  if (assigneeUser) {
    updatePayload.status = 'assigned';
  }

  await updateDoc(ticketRef, updatePayload);
};
