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
export const assignTicket = async (ticketId, assigneeUser, assignedBy, ticket = null, catalog = null) => {
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

  // Trigger email notification to newly assigned technician
  if (assigneeEmail && ticket) {
    try {
      const { sendTicketNotification } = await import('./notificationService');
      await sendTicketNotification({
        type: 'assigned',
        ticket: { ...ticket, assignedToName: assigneeName, assignedToEmail: assigneeEmail },
        actor: assignedBy,
        webhookUrl: catalog?.emailWebhookUrl
      });
    } catch (notifErr) {
      console.warn("Could not dispatch assignment notification:", notifErr);
    }
  }
};

// Add comment or internal technician note with optional file uploads & waiting status change
export const addTicketComment = async ({
  ticketId,
  ticket,
  text,
  isInternal = false,
  changeStatusToWaiting = false,
  files = [],
  user = null,
  catalog = null
}) => {
  if (!ticketId || !text?.trim()) return null;

  const uploadedFiles = [];
  for (const file of files) {
    try {
      const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const fileRef = storageRef(storage, `ticket-comments/${fileId}`);
      const uploadResult = await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      uploadedFiles.push({
        name: file.name,
        url: downloadUrl,
        size: `${(file.size / 1024).toFixed(0)} KB`,
        type: file.type
      });
    } catch (uploadErr) {
      console.warn("Failed to upload comment file:", file.name, uploadErr);
    }
  }

  const commentObj = {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    text: text.trim(),
    authorName: user?.displayName || user?.name || user?.email?.split('@')[0] || 'Staff Member',
    authorEmail: user?.email || '',
    authorRole: user?.role || 'staff',
    authorPhoto: user?.photoURL || null,
    isInternal: Boolean(isInternal),
    changeStatusToWaiting: Boolean(changeStatusToWaiting),
    attachments: uploadedFiles,
    createdAt: new Date().toISOString()
  };

  const isRequesterUser = user?.role === 'requester';
  const newStatus = changeStatusToWaiting 
    ? 'waiting' 
    : (isRequesterUser && ticket?.status === 'waiting' ? 'in_progress' : (ticket?.status || 'new'));

  const historyEntry = {
    status: newStatus,
    timestamp: new Date().toISOString(),
    updatedBy: commentObj.authorName,
    note: isInternal
      ? `🔒 Internal technician note added`
      : changeStatusToWaiting
        ? `Response added & status set to Waiting on Requester`
        : isRequesterUser
          ? `Requester replied: "${text.trim().slice(0, 50)}${text.length > 50 ? '...' : ''}"`
          : `Response sent to requester: "${text.trim().slice(0, 50)}${text.length > 50 ? '...' : ''}"`
  };

  const updatePayload = {
    comments: arrayUnion(commentObj),
    statusHistory: arrayUnion(historyEntry),
    updatedAt: serverTimestamp()
  };

  if (newStatus !== ticket?.status) {
    updatePayload.status = newStatus;
  }

  const ticketRef = doc(db, 'tickets', ticketId);
  await updateDoc(ticketRef, updatePayload);

  // Send email notification for public responses
  if (!isInternal && ticket) {
    try {
      const { sendTicketNotification } = await import('./notificationService');
      await sendTicketNotification({
        type: isRequesterUser ? 'requester_reply' : 'comment',
        ticket: { ...ticket, status: newStatus },
        comment: commentObj,
        newStatus: newStatus,
        newStatusLabel: newStatus === 'waiting' ? 'Waiting on Requester' : undefined,
        actor: user,
        webhookUrl: catalog?.emailWebhookUrl
      });
    } catch (notifErr) {
      console.warn("Could not dispatch comment notification:", notifErr);
    }
  }

  return commentObj;
};

// Update ticket status and dispatch email notification
export const updateTicketStatus = async ({
  ticketId,
  ticket,
  newStatus,
  statusLabel,
  user,
  note = '',
  catalog = null
}) => {
  const ticketRef = doc(db, 'tickets', ticketId);
  const statusEntry = {
    status: newStatus,
    timestamp: new Date().toISOString(),
    updatedBy: user?.displayName || user?.email || 'Staff Member',
    note: note || `Status updated to ${statusLabel || newStatus}`
  };

  await updateDoc(ticketRef, {
    status: newStatus,
    statusHistory: arrayUnion(statusEntry),
    updatedAt: serverTimestamp()
  });

  // Dispatch email notification to requester
  if (ticket && ticket.createdByEmail) {
    try {
      const { sendTicketNotification } = await import('./notificationService');
      await sendTicketNotification({
        type: 'status_change',
        ticket: { ...ticket, status: newStatus },
        newStatus: newStatus,
        newStatusLabel: statusLabel,
        actor: user,
        webhookUrl: catalog?.emailWebhookUrl
      });
    } catch (notifErr) {
      console.warn("Could not dispatch status change email:", notifErr);
    }
  }

  return statusEntry;
};

// ============================================================================
// FLEET & DEVICE INVENTORY + LENOVO LIVE WARRANTY LOOKUP
// ============================================================================

/**
 * Parses Lenovo's HTML specification table (<table class='ModelSpecification'>...)
 * into both a structured key-value object and a clean summary string.
 */
export const parseLenovoSpecification = (specHtml) => {
  if (!specHtml || typeof specHtml !== 'string') {
    return { summary: '', map: {} };
  }
  const map = {};
  const rowRegex = /<tr>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/gi;
  let match;
  while ((match = rowRegex.exec(specHtml)) !== null) {
    const key = match[1].replace(/<[^>]+>/g, '').trim();
    const val = match[2]
      .replace(/<br\s*\/?>/gi, ', ')
      .replace(/<[^>]+>/g, '')
      .replace(/^1x\s+/i, '')
      .trim();
    if (key && val) {
      map[key] = val;
    }
  }

  const summaryParts = [];
  if (map['Processor']) summaryParts.push(map['Processor'].replace(/\(.*?\)/g, '').trim());
  if (map['Memory']) summaryParts.push(map['Memory']);
  if (map['Hard Drive']) summaryParts.push(map['Hard Drive']);
  if (map['Monitor']) summaryParts.push(map['Monitor']);
  if (map['Operating System']) summaryParts.push(map['Operating System'].replace(/\(.*?\)/g, '').trim());

  return {
    summary: summaryParts.join(' • '),
    map
  };
};

/**
 * Queries Lenovo's pcsupport.lenovo.com getIbaseInfo endpoint directly by serial number.
 * Returns normalized device model, purchase date, warranty dates, tier, and hardware specs.
 */
export const lookupLenovoWarranty = async (serialNumber) => {
  const cleanSerial = (serialNumber || '').trim().toUpperCase();
  if (!cleanSerial) {
    throw new Error('Please enter a valid Serial Number.');
  }

  const response = await fetch('https://pcsupport.lenovo.com/us/en/api/v4/upsell/redport/getIbaseInfo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serialNumber: cleanSerial,
      machineType: '',
      country: 'us',
      language: 'en'
    })
  });

  if (!response.ok) {
    throw new Error(`Lenovo lookup returned HTTP ${response.status}`);
  }

  const json = await response.json();
  if (!json || json.code !== 0 || !json.data || !json.data.machineInfo) {
    throw new Error(json?.msg?.desc || `No Lenovo device found for serial "${cleanSerial}".`);
  }

  const { machineInfo, currentWarranty, baseWarranties = [], upgradeWarranties = [], contractWarranties = [] } = json.data;
  const parsedSpecs = parseLenovoSpecification(machineInfo.specification);

  // Determine best / latest warranty across base, upgrade, and contract warranties
  const allWarranties = [
    ...(currentWarranty ? [currentWarranty] : []),
    ...upgradeWarranties,
    ...contractWarranties,
    ...baseWarranties
  ];

  let latestEndDate = currentWarranty?.endDate || '';
  let earliestStartDate = currentWarranty?.startDate || machineInfo.baseStartDate || machineInfo.popDate || '';
  let bestWarranty = currentWarranty || allWarranties[0] || {};

  allWarranties.forEach((w) => {
    if (w.endDate && (!latestEndDate || w.endDate > latestEndDate)) {
      latestEndDate = w.endDate;
      bestWarranty = w;
    }
    if (w.startDate && (!earliestStartDate || w.startDate < earliestStartDate)) {
      earliestStartDate = w.startDate;
    }
  });

  const now = new Date();
  const endDateObj = latestEndDate ? new Date(latestEndDate + 'T23:59:59') : null;
  const remainingDays = endDateObj ? Math.max(0, Math.ceil((endDateObj - now) / (1000 * 60 * 60 * 24))) : 0;
  const inWarranty = remainingDays > 0;

  // Clean up product name for display
  let cleanName = machineInfo.productName || `Lenovo ${machineInfo.type || ''}`;
  if (!cleanName.toLowerCase().includes('lenovo')) {
    cleanName = `Lenovo ${cleanName}`;
  }

  // Purchase date priority: popDate (proof of purchase) -> baseStartDate -> shipDate -> buildDate
  const purchaseDate = machineInfo.popDate || machineInfo.baseStartDate || machineInfo.shipDate || machineInfo.buildDate || '';

  return {
    found: true,
    vendor: 'Lenovo',
    serial: machineInfo.serial || cleanSerial,
    name: cleanName,
    mtm: machineInfo.product || '',
    machineType: machineInfo.type || '',
    buildDate: machineInfo.buildDate || '',
    shipDate: machineInfo.shipDate || '',
    purchaseDate,
    eosDate: machineInfo.eosDate || '',
    productImage: machineInfo.productImage || '',
    specs: parsedSpecs.summary || '',
    specsMap: parsedSpecs.map || {},
    warrantyName: bestWarranty.name || 'Standard Warranty',
    warrantyTier: bestWarranty.deliveryTypeName || bestWarranty.deliveryType || 'Depot Support',
    warrantyDescription: bestWarranty.description || '',
    warrantyStartDate: earliestStartDate,
    warrantyEndDate: latestEndDate,
    warrantyRemainingDays: remainingDays,
    warrantyStatus: inWarranty ? 'In Warranty' : 'Out of Warranty',
    inWarranty,
    pcsupportUrl: `https://pcsupport.lenovo.com/us/en/Search?query=${encodeURIComponent(cleanSerial)}`
  };
};

// Subscribe to fleet inventory items in Firestore
export const subscribeToInventory = (callback) => {
  const invCol = collection(db, 'inventory');
  return onSnapshot(invCol, (snapshot) => {
    const items = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));
    // Sort by newest or name
    items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    callback(items);
  }, (err) => {
    console.warn("Inventory listener error:", err);
    callback([]);
  });
};

// Create or update a single inventory device
export const saveInventoryDevice = async (deviceData) => {
  const { id, ...rest } = deviceData;
  // Compute 5-year replacement date if purchaseDate is provided
  let replacementDate = rest.replacementDate || '';
  const cycleYears = Number(rest.replacementCycleYears) || 5;
  if (rest.purchaseDate) {
    const dt = new Date(rest.purchaseDate + 'T12:00:00');
    if (!isNaN(dt.getTime())) {
      dt.setFullYear(dt.getFullYear() + cycleYears);
      replacementDate = dt.toISOString().split('T')[0];
    }
  }

  const payload = {
    ...rest,
    replacementCycleYears: cycleYears,
    replacementDate,
    updatedAt: serverTimestamp()
  };

  if (id && !String(id).startsWith('seed-')) {
    const docRef = doc(db, 'inventory', id);
    await setDoc(docRef, payload, { merge: true });
    return { id, ...payload };
  } else {
    payload.createdAt = serverTimestamp();
    const docRef = await addDoc(collection(db, 'inventory'), payload);
    return { id: docRef.id, ...payload };
  }
};

// Delete an inventory device
export const deleteInventoryDevice = async (deviceId) => {
  if (!deviceId) return;
  await deleteDoc(doc(db, 'inventory', deviceId));
};

