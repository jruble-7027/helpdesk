import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  db, 
  subscribeToInventory, 
  saveInventoryDevice, 
  deleteInventoryDevice, 
  lookupLenovoWarranty 
} from '../services/firebase';
import { DEFAULT_PLACES } from '../data/categoriesData';
import { 
  Laptop, 
  Search, 
  Plus, 
  Monitor, 
  Printer, 
  Wifi, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  MapPin,
  User,
  Tag,
  Cpu,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  Edit2,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Clock,
  Sparkles,
  X,
  Check,
  FileSpreadsheet,
  Wrench,
  Building2
} from 'lucide-react';

const SEED_FLEET = [
  {
    id: 'seed-lenovo-1',
    name: 'Lenovo E15 Gen 2 (Type 20TD, 20TE) Laptop (ThinkPad)',
    vendor: 'Lenovo',
    mtm: '20TD003KUS',
    tag: '2A0A4687',
    serial: 'MJ0GF76R',
    category: 'Laptops',
    campus: 'Centennial Campus',
    room: 'Room 204',
    location: 'Centennial Campus - Room 204',
    assignedTo: 'Jonathan Ruble',
    assignedEmail: 'jruble@wcatrojans.org',
    status: 'Active',
    purchaseDate: '2022-01-14',
    replacementCycleYears: 5,
    replacementDate: '2027-01-14',
    warrantyName: '1Y Depot',
    warrantyTier: 'Depot Support',
    warrantyStartDate: '2022-01-14',
    warrantyEndDate: '2023-01-13',
    specs: '11th Generation Intel® Core™ i5-1135G7 • 8 GB DDR4-3200 • 256GB PCIe SSD • 15.6 FHD • Windows 10 Pro 64',
    notes: 'Primary IT test unit — verified against pcsupport.lenovo.com'
  }
];

const CATEGORIES = [
  'Laptops',
  'Workstations',
  'Chromebooks',
  'Displays',
  'Printers',
  'Tablets / iPads',
  'Network / Other'
];

const VENDORS = [
  'Lenovo',
  'Dell',
  'HP',
  'Apple',
  'ViewSonic',
  'Epson',
  'ASUS',
  'Acer',
  'Other'
];

// Compute lifecycle & replacement status based on 5-year default cycle
function getLifecycleInfo(purchaseDate, cycleYears = 5) {
  if (!purchaseDate) {
    return {
      ageYears: null,
      replacementDate: '',
      daysUntilReplacement: null,
      statusKey: 'unknown',
      badgeText: 'No Purchase Date',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
    };
  }

  const start = new Date(purchaseDate + 'T12:00:00');
  if (isNaN(start.getTime())) {
    return {
      ageYears: null,
      replacementDate: '',
      daysUntilReplacement: null,
      statusKey: 'unknown',
      badgeText: 'Invalid Date',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
    };
  }

  const now = new Date();
  const ageMs = now - start;
  const ageYears = Math.max(0, ageMs / (1000 * 60 * 60 * 24 * 365.25));

  const repDateObj = new Date(start);
  repDateObj.setFullYear(repDateObj.getFullYear() + (Number(cycleYears) || 5));
  const replacementDate = repDateObj.toISOString().split('T')[0];
  const daysUntilReplacement = Math.ceil((repDateObj - now) / (1000 * 60 * 60 * 24));

  if (daysUntilReplacement <= 0) {
    return {
      ageYears: ageYears.toFixed(1),
      replacementDate,
      daysUntilReplacement,
      statusKey: 'overdue',
      badgeText: `Replace Now (${ageYears.toFixed(1)} yrs)`,
      badgeClass: 'bg-red-50 text-red-700 border-red-200'
    };
  } else if (daysUntilReplacement <= 365) {
    return {
      ageYears: ageYears.toFixed(1),
      replacementDate,
      daysUntilReplacement,
      statusKey: 'approaching',
      badgeText: `Refresh Soon (${ageYears.toFixed(1)} yrs)`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300'
    };
  } else {
    return {
      ageYears: ageYears.toFixed(1),
      replacementDate,
      daysUntilReplacement,
      statusKey: 'healthy',
      badgeText: `Healthy (${ageYears.toFixed(1)} yrs)`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }
}

// Compute warranty status
function getWarrantyStatusInfo(warrantyEndDate) {
  if (!warrantyEndDate) {
    return {
      inWarranty: false,
      remainingDays: 0,
      label: 'Unknown / Not Synced',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
    };
  }
  const endObj = new Date(warrantyEndDate + 'T23:59:59');
  if (isNaN(endObj.getTime())) {
    return {
      inWarranty: false,
      remainingDays: 0,
      label: warrantyEndDate,
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
    };
  }
  const now = new Date();
  const remainingDays = Math.ceil((endObj - now) / (1000 * 60 * 60 * 24));
  if (remainingDays > 90) {
    return {
      inWarranty: true,
      remainingDays,
      label: `Active (${remainingDays}d left)`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  } else if (remainingDays > 0) {
    return {
      inWarranty: true,
      remainingDays,
      label: `Expiring (${remainingDays}d left)`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300'
    };
  } else {
    return {
      inWarranty: false,
      remainingDays: 0,
      label: `Expired (${warrantyEndDate})`,
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
    };
  }
}

// Generate vendor support lookup URL
function getVendorSupportUrl(vendor, serial) {
  const s = encodeURIComponent((serial || '').trim());
  const v = (vendor || '').toLowerCase();
  if (v.includes('lenovo')) {
    return `https://pcsupport.lenovo.com/us/en/Search?query=${s}`;
  }
  if (v.includes('dell')) {
    return `https://www.dell.com/support/home/en-us/product-support/servicetag/${s}/overview`;
  }
  if (v.includes('hp')) {
    return `https://support.hp.com/us-en/check-warranty`;
  }
  if (v.includes('apple')) {
    return `https://checkcoverage.apple.com/?sn=${s}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${vendor || ''} ${serial || ''} warranty lookup`)}`;
}

// Simple CSV parser
function parseCsvRows(text) {
  if (!text) return [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  return lines.map(line => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  });
}

export default function AssetsView({ catalog, user, userProfile, onReportIssue }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portalUsers, setPortalUsers] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [lifecycleFilter, setLifecycleFilter] = useState('all'); // 'all' | 'healthy' | 'approaching' | 'overdue' | 'in_warranty' | 'out_warranty'

  // Add/Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  // Bulk Sync & CSV Import State
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [syncingRowId, setSyncingRowId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [autoSyncOnImport, setAutoSyncOnImport] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  // Form State
  const emptyForm = {
    serial: '',
    tag: '',
    vendor: 'Lenovo',
    name: '',
    mtm: '',
    category: 'Laptops',
    status: 'Active',
    assignedTo: '',
    assignedEmail: '',
    campus: 'Centennial Campus',
    room: '',
    purchaseDate: '',
    replacementCycleYears: 5,
    warrantyName: '',
    warrantyTier: '',
    warrantyStartDate: '',
    warrantyEndDate: '',
    specs: '',
    notes: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  const placesList = catalog?.places || DEFAULT_PLACES;
  const selectedPlaceObj = placesList.find(p => p.name === formData.campus) || placesList[0];
  const availableRooms = selectedPlaceObj?.rooms || [];

  // Subscribe to Firestore Inventory
  useEffect(() => {
    const unsub = subscribeToInventory((items) => {
      setInventory(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Subscribe to Portal Users for user association dropdown
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPortalUsers(list);
    }, () => {});
    return () => unsub();
  }, []);

  // Combine Firestore items or fallback to seed item if empty
  const displayItems = inventory.length > 0 ? inventory : SEED_FLEET;

  // Enrich items with calculated lifecycle & warranty fields
  const enrichedItems = useMemo(() => {
    return displayItems.map((item) => {
      const lifecycle = getLifecycleInfo(item.purchaseDate, item.replacementCycleYears || 5);
      const warranty = getWarrantyStatusInfo(item.warrantyEndDate);
      return {
        ...item,
        _lifecycle: lifecycle,
        _warranty: warranty
      };
    });
  }, [displayItems]);

  // KPI Metrics
  const kpis = useMemo(() => {
    const total = enrichedItems.length;
    const inWarranty = enrichedItems.filter(i => i._warranty.inWarranty).length;
    const approaching = enrichedItems.filter(i => i._lifecycle.statusKey === 'approaching').length;
    const overdue = enrichedItems.filter(i => i._lifecycle.statusKey === 'overdue').length;
    return { total, inWarranty, approaching, overdue };
  }, [enrichedItems]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return enrichedItems.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (lifecycleFilter === 'healthy' && item._lifecycle.statusKey !== 'healthy') return false;
      if (lifecycleFilter === 'approaching' && item._lifecycle.statusKey !== 'approaching') return false;
      if (lifecycleFilter === 'overdue' && item._lifecycle.statusKey !== 'overdue') return false;
      if (lifecycleFilter === 'in_warranty' && !item._warranty.inWarranty) return false;
      if (lifecycleFilter === 'out_warranty' && item._warranty.inWarranty) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (item.name || '').toLowerCase().includes(q) ||
        (item.serial || '').toLowerCase().includes(q) ||
        (item.tag || '').toLowerCase().includes(q) ||
        (item.assignedTo || '').toLowerCase().includes(q) ||
        (item.assignedEmail || '').toLowerCase().includes(q) ||
        (item.location || '').toLowerCase().includes(q) ||
        (item.campus || '').toLowerCase().includes(q) ||
        (item.room || '').toLowerCase().includes(q) ||
        (item.mtm || '').toLowerCase().includes(q)
      );
    });
  }, [enrichedItems, selectedCategory, lifecycleFilter, searchQuery]);

  // Open modal for Add or Edit
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setLookupMessage(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      serial: item.serial || '',
      tag: item.tag || '',
      vendor: item.vendor || 'Lenovo',
      name: item.name || '',
      mtm: item.mtm || '',
      category: item.category || 'Laptops',
      status: item.status || 'Active',
      assignedTo: item.assignedTo || '',
      assignedEmail: item.assignedEmail || '',
      campus: item.campus || 'Centennial Campus',
      room: item.room || '',
      purchaseDate: item.purchaseDate || '',
      replacementCycleYears: item.replacementCycleYears || 5,
      warrantyName: item.warrantyName || '',
      warrantyTier: item.warrantyTier || '',
      warrantyStartDate: item.warrantyStartDate || '',
      warrantyEndDate: item.warrantyEndDate || '',
      specs: item.specs || '',
      notes: item.notes || ''
    });
    setLookupMessage(null);
    setShowModal(true);
  };

  // Live Lenovo Serial Lookup inside the modal
  const handleModalLenovoLookup = async () => {
    if (!formData.serial.trim()) {
      setLookupMessage({ type: 'error', text: 'Please enter a Lenovo Serial Number first (e.g. MJ0GF76R).' });
      return;
    }
    setLookupLoading(true);
    setLookupMessage(null);
    try {
      const info = await lookupLenovoWarranty(formData.serial);
      setFormData((prev) => ({
        ...prev,
        vendor: 'Lenovo',
        serial: info.serial || prev.serial.toUpperCase(),
        name: info.name || prev.name,
        mtm: info.mtm || prev.mtm,
        purchaseDate: info.purchaseDate || prev.purchaseDate,
        warrantyName: info.warrantyName || prev.warrantyName,
        warrantyTier: info.warrantyTier || prev.warrantyTier,
        warrantyStartDate: info.warrantyStartDate || prev.warrantyStartDate,
        warrantyEndDate: info.warrantyEndDate || prev.warrantyEndDate,
        specs: info.specs || prev.specs
      }));
      setLookupMessage({
        type: 'success',
        text: `Pulled from Lenovo: ${info.name} • Purchased ${info.purchaseDate || 'N/A'} • Warranty ${info.warrantyName} (Ends ${info.warrantyEndDate || 'N/A'})`
      });
    } catch (err) {
      setLookupMessage({
        type: 'error',
        text: err.message || 'Could not retrieve warranty info from pcsupport.lenovo.com.'
      });
    } finally {
      setLookupLoading(false);
    }
  };

  // Save single device
  const handleSaveDevice = async (e) => {
    e.preventDefault();
    if (!formData.serial.trim() && !formData.name.trim()) {
      alert('Please provide at least a Serial Number or Device Model Name.');
      return;
    }
    setSaving(true);
    try {
      const locationStr = formData.room 
        ? `${formData.campus} - ${formData.room}` 
        : formData.campus;

      await saveInventoryDevice({
        ...(editingItem ? { id: editingItem.id } : {}),
        ...formData,
        serial: formData.serial.trim().toUpperCase(),
        location: locationStr
      });
      setShowModal(false);
    } catch (err) {
      console.error('Error saving inventory device:', err);
      alert('Failed to save device: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Sync a single row directly from the table
  const handleSyncSingleRow = async (item) => {
    if (!item.serial) return;
    setSyncingRowId(item.id);
    try {
      const info = await lookupLenovoWarranty(item.serial);
      await saveInventoryDevice({
        ...item,
        vendor: 'Lenovo',
        serial: info.serial,
        name: info.name || item.name,
        mtm: info.mtm || item.mtm,
        purchaseDate: item.purchaseDate || info.purchaseDate,
        warrantyName: info.warrantyName,
        warrantyTier: info.warrantyTier,
        warrantyStartDate: info.warrantyStartDate,
        warrantyEndDate: info.warrantyEndDate,
        specs: info.specs || item.specs
      });
    } catch (err) {
      alert(`Lenovo lookup for ${item.serial} failed: ${err.message}`);
    } finally {
      setSyncingRowId(null);
    }
  };

  // Sync ALL Lenovo devices in the table
  const handleSyncAllLenovo = async () => {
    const lenovoItems = displayItems.filter(
      (i) => (i.vendor || 'Lenovo').toLowerCase().includes('lenovo') && i.serial
    );
    if (lenovoItems.length === 0) {
      alert('No Lenovo devices with serial numbers found to sync.');
      return;
    }
    setSyncingAll(true);
    let successCount = 0;
    for (let idx = 0; idx < lenovoItems.length; idx++) {
      const item = lenovoItems[idx];
      setSyncProgress(`Syncing ${idx + 1}/${lenovoItems.length}: ${item.serial}...`);
      try {
        const info = await lookupLenovoWarranty(item.serial);
        await saveInventoryDevice({
          ...item,
          vendor: 'Lenovo',
          serial: info.serial,
          name: info.name || item.name,
          mtm: info.mtm || item.mtm,
          purchaseDate: item.purchaseDate || info.purchaseDate,
          warrantyName: info.warrantyName,
          warrantyTier: info.warrantyTier,
          warrantyStartDate: info.warrantyStartDate,
          warrantyEndDate: info.warrantyEndDate,
          specs: info.specs || item.specs
        });
        successCount++;
      } catch (err) {
        console.warn(`Could not sync ${item.serial}:`, err);
      }
    }
    setSyncProgress(`Synced ${successCount} of ${lenovoItems.length} Lenovo devices!`);
    setTimeout(() => {
      setSyncingAll(false);
      setSyncProgress('');
    }, 2500);
  };

  // Delete device
  const handleDelete = async (item) => {
    if (String(item.id).startsWith('seed-')) {
      alert('This is a sample preview row. Click "Sync Warranty" or "Edit" to save it to your live database first.');
      return;
    }
    if (!window.confirm(`Remove "${item.name || item.serial}" from fleet inventory?`)) return;
    try {
      await deleteInventoryDevice(item.id);
    } catch (err) {
      console.error('Error deleting device:', err);
    }
  };

  // Download CSV Template
  const handleDownloadTemplate = () => {
    const headers = 'SerialNumber,AssetTag,Vendor,Category,AssignedUser,AssignedEmail,Campus,Room,PurchaseDate,Notes\n';
    const sample = 'MJ0GF76R,2A0A4687,Lenovo,Laptops,Jonathan Ruble,jruble@wcatrojans.org,Centennial Campus,Room 204,2022-01-14,Primary Laptop\n';
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'WCA_Fleet_Inventory_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Fleet to CSV
  const handleExportCsv = () => {
    const headers = [
      'SerialNumber',
      'AssetTag',
      'Vendor',
      'ModelName',
      'MTM',
      'Category',
      'AssignedUser',
      'AssignedEmail',
      'Campus',
      'Room',
      'PurchaseDate',
      'ReplacementDate_5Yr',
      'LifecycleStatus',
      'WarrantyTier',
      'WarrantyStartDate',
      'WarrantyEndDate',
      'WarrantyStatus',
      'Specs',
      'Notes'
    ];

    const rows = filteredItems.map((item) => [
      item.serial || '',
      item.tag || '',
      item.vendor || '',
      item.name || '',
      item.mtm || '',
      item.category || '',
      item.assignedTo || '',
      item.assignedEmail || '',
      item.campus || '',
      item.room || '',
      item.purchaseDate || '',
      item._lifecycle.replacementDate || '',
      item._lifecycle.badgeText || '',
      item.warrantyName || '',
      item.warrantyStartDate || '',
      item.warrantyEndDate || '',
      item._warranty.label || '',
      item.specs || '',
      item.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WCA_Fleet_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle CSV File Upload into textarea
  const handleCsvFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setCsvText(evt.target?.result || '');
    };
    reader.readAsText(file);
  };

  // Process Bulk CSV Import
  const handleBulkCsvImport = async () => {
    const rows = parseCsvRows(csvText);
    if (rows.length === 0) {
      alert('Please upload a CSV file or paste CSV rows first.');
      return;
    }

    setImporting(true);
    setImportStatus('Parsing CSV rows...');

    // Detect if first row is header
    const firstRowLower = rows[0].map(c => c.toLowerCase());
    const hasHeader = firstRowLower.some(c => c.includes('serial') || c.includes('tag') || c.includes('vendor') || c.includes('user'));
    const dataRows = hasHeader ? rows.slice(1) : rows;

    let importedCount = 0;
    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      if (!r || r.length === 0 || !r.some(cell => cell.trim())) continue;

      const serial = (r[0] || '').trim().toUpperCase();
      const tag = (r[1] || '').trim();
      const vendor = (r[2] || 'Lenovo').trim();
      const category = (r[3] || 'Laptops').trim();
      const assignedTo = (r[4] || '').trim();
      const assignedEmail = (r[5] || '').trim();
      const campus = (r[6] || 'Centennial Campus').trim();
      const room = (r[7] || '').trim();
      const purchaseDate = (r[8] || '').trim();
      const notes = (r[9] || '').trim();

      let devicePayload = {
        serial,
        tag,
        vendor,
        name: `${vendor} ${category}`,
        category: CATEGORIES.includes(category) ? category : 'Laptops',
        status: 'Active',
        assignedTo,
        assignedEmail,
        campus,
        room,
        location: room ? `${campus} - ${room}` : campus,
        purchaseDate,
        replacementCycleYears: 5,
        notes
      };

      // Auto-lookup from Lenovo if enabled and vendor is Lenovo
      if (autoSyncOnImport && serial && vendor.toLowerCase().includes('lenovo')) {
        setImportStatus(`Row ${i + 1}/${dataRows.length}: Pulling Lenovo warranty & specs for ${serial}...`);
        try {
          const info = await lookupLenovoWarranty(serial);
          devicePayload = {
            ...devicePayload,
            name: info.name || devicePayload.name,
            mtm: info.mtm || '',
            purchaseDate: purchaseDate || info.purchaseDate || '',
            warrantyName: info.warrantyName || '',
            warrantyTier: info.warrantyTier || '',
            warrantyStartDate: info.warrantyStartDate || '',
            warrantyEndDate: info.warrantyEndDate || '',
            specs: info.specs || ''
          };
        } catch (err) {
          console.warn(`Lenovo lookup skipped for ${serial}:`, err);
        }
      } else {
        setImportStatus(`Row ${i + 1}/${dataRows.length}: Saving ${serial || tag}...`);
      }

      await saveInventoryDevice(devicePayload);
      importedCount++;
    }

    setImportStatus(`Successfully imported ${importedCount} fleet devices!`);
    setTimeout(() => {
      setImporting(false);
      setImportStatus('');
      setCsvText('');
      setShowImportModal(false);
    }, 1800);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Fleet & Device Inventory
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  5-Year Lifecycle
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Track bulk computers, user assignments, 5-year replacement dates, and live Lenovo warranty lookups
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncAllLenovo}
            disabled={syncingAll}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm"
            title="Fetch live warranty & specs from pcsupport.lenovo.com for all Lenovo serials"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${syncingAll ? 'animate-spin' : ''}`} />
            <span>{syncingAll ? syncProgress : 'Sync Lenovo Warranties'}</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Bulk CSV Import</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0b1c2d] hover:bg-slate-800 text-amber-400 font-black text-xs sm:text-sm rounded-xl transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Device / Lookup Serial</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div 
          onClick={() => setLifecycleFilter('all')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer ${
            lifecycleFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200/80 hover:border-slate-300'
          } shadow-sm`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fleet</span>
            <Laptop className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Tracked computers & devices</div>
        </div>

        <div 
          onClick={() => setLifecycleFilter(lifecycleFilter === 'in_warranty' ? 'all' : 'in_warranty')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer ${
            lifecycleFilter === 'in_warranty' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200/80 hover:border-slate-300'
          } shadow-sm`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Warranty</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{kpis.inWarranty}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Covered by vendor support</div>
        </div>

        <div 
          onClick={() => setLifecycleFilter(lifecycleFilter === 'approaching' ? 'all' : 'approaching')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer ${
            lifecycleFilter === 'approaching' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-200/80 hover:border-slate-300'
          } shadow-sm`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year 4 (Refresh Soon)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{kpis.approaching}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Within 12 mos of 5-yr limit</div>
        </div>

        <div 
          onClick={() => setLifecycleFilter(lifecycleFilter === 'overdue' ? 'all' : 'overdue')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer ${
            lifecycleFilter === 'overdue' ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200/80 hover:border-slate-300'
          } shadow-sm`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Replacement Due (5+ Yrs)</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-600">{kpis.overdue}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Reached 5-year lifecycle</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-6 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Serial Number (e.g. MJ0GF76R), Asset Tag, Assigned User, Model, or Room..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['All', ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#0b1c2d] text-amber-400 shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lifecycle Quick Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1">Lifecycle & Warranty Filter:</span>
            {[
              { id: 'all', label: 'All Devices' },
              { id: 'healthy', label: '🟢 Healthy (< 4 Yrs)' },
              { id: 'approaching', label: '🟡 Approaching Refresh (Yr 4)' },
              { id: 'overdue', label: '🔴 Replacement Due (5+ Yrs)' },
              { id: 'in_warranty', label: '🛡️ In Warranty' },
              { id: 'out_warranty', label: '⚠️ Out of Warranty' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setLifecycleFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  lifecycleFilter === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-slate-400 font-medium">
            Showing <strong className="text-slate-700">{filteredItems.length}</strong> of {enrichedItems.length} devices
          </span>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Device & Specs</th>
                <th className="py-3.5 px-4">Serial & Tag</th>
                <th className="py-3.5 px-4">Assigned User & Location</th>
                <th className="py-3.5 px-4">Purchase & 5-Yr Replace</th>
                <th className="py-3.5 px-4">Warranty Coverage</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 text-sm">
              {filteredItems.map((item) => {
                const isLenovo = (item.vendor || 'Lenovo').toLowerCase().includes('lenovo');
                const isSyncingThis = syncingRowId === item.id;
                const supportUrl = getVendorSupportUrl(item.vendor || 'Lenovo', item.serial);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* 1. Device & Specs */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 font-black text-xs border border-slate-200">
                          {(item.vendor || 'LEN').slice(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 leading-snug">
                            {item.name || 'Unnamed Device'}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              {item.category || 'Laptops'}
                            </span>
                            {item.mtm && (
                              <span className="text-[11px] font-mono text-slate-500">
                                MTM: {item.mtm}
                              </span>
                            )}
                          </div>
                          {item.specs && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 flex items-start gap-1" title={item.specs}>
                              <Cpu className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                              <span>{item.specs}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Serial & Asset Tag */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase text-slate-400">S/N:</span>
                          <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.serial || 'N/A'}
                          </span>
                        </div>
                        {item.tag && (
                          <div className="flex items-center gap-1.5">
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span className="font-mono text-xs text-slate-600">{item.tag}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 3. Assigned User & Location */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <User className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <span>{item.assignedTo || 'Unassigned'}</span>
                        </div>
                        {item.assignedEmail && (
                          <div className="text-[11px] text-slate-400 font-mono pl-5">
                            {item.assignedEmail}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{item.location || item.campus || 'Centennial Campus'}</span>
                        </div>
                      </div>
                    </td>

                    {/* 4. Purchase Date & 5-Year Replacement Lifecycle */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${item._lifecycle.badgeClass}`}>
                          {item._lifecycle.badgeText}
                        </span>
                        <div className="text-[11px] text-slate-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Purchased: <strong>{item.purchaseDate || 'Not set'}</strong></span>
                        </div>
                        {item._lifecycle.replacementDate && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Replace By (5-Yr): <strong className="text-slate-800">{item._lifecycle.replacementDate}</strong></span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 5. Warranty Coverage */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${item._warranty.badgeClass}`}>
                          {item._warranty.inWarranty ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <ShieldAlert className="w-3 h-3" />
                          )}
                          {item._warranty.label}
                        </span>
                        {(item.warrantyName || item.warrantyTier) && (
                          <div className="text-[11px] font-semibold text-slate-700">
                            {item.warrantyName} {item.warrantyTier && item.warrantyTier !== item.warrantyName ? `• ${item.warrantyTier}` : ''}
                          </div>
                        )}
                        {item.warrantyEndDate && (
                          <div className="text-[11px] text-slate-400">
                            Ends: {item.warrantyEndDate}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 6. Actions */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {isLenovo && item.serial && (
                          <button
                            onClick={() => handleSyncSingleRow(item)}
                            disabled={isSyncingThis}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all"
                            title="Pull live warranty & specs from pcsupport.lenovo.com"
                          >
                            <RefreshCw className={`w-4 h-4 ${isSyncingThis ? 'animate-spin' : ''}`} />
                          </button>
                        )}

                        {item.serial && (
                          <a
                            href={supportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                            title={`Open ${item.serial} on ${item.vendor || 'Vendor'} Support Site`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-2 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all"
                          title="Edit Device / User Assignment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Delete Device"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Laptop className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No matching fleet devices found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try clearing your search filters, adding a device by Serial Number, or importing a CSV fleet list.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Vendor Portals Footer */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Direct Vendor Portals:</strong> Entering a Lenovo serial automatically queries <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">pcsupport.lenovo.com</code> for model, specs, purchase date & warranty.
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 font-bold">
          <a
            href="https://pcsupport.lenovo.com/us/en/warrantylookup"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            <span>pcsupport.lenovo.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span>•</span>
          <a
            href="https://csp.lenovo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            <span>csp.lenovo.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: ADD / EDIT DEVICE + LIVE LENOVO SERIAL LOOKUP
         ===================================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-[#0b1c2d] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <Laptop className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base tracking-wide">
                  {editingItem ? 'Edit Fleet Device & Assignment' : 'Add Fleet Device & Auto-Lookup Warranty'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDevice} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {/* Step 1: Serial Number + 1-Click Lenovo Lookup Box */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>1. Serial Number & Live Vendor Lookup</span>
                  </label>
                  <span className="text-[11px] text-blue-700 font-semibold">
                    Auto-fills Model, Purchase Date, Warranty & Specs
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-3">
                    <select
                      value={formData.vendor}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={formData.serial}
                      onChange={(e) => setFormData({ ...formData, serial: e.target.value.toUpperCase() })}
                      placeholder="Enter Serial (e.g. MJ0GF76R)"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <button
                      type="button"
                      onClick={handleModalLenovoLookup}
                      disabled={lookupLoading}
                      className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${lookupLoading ? 'animate-spin' : ''}`} />
                      <span>{lookupLoading ? 'Querying Lenovo...' : 'Pull Lenovo Info'}</span>
                    </button>
                  </div>
                </div>

                {lookupMessage && (
                  <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    lookupMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {lookupMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    )}
                    <span>{lookupMessage.text}</span>
                  </div>
                )}
              </div>

              {/* Step 2: Device Identity & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Device / Model Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Lenovo ThinkPad E15 Gen 2"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WCA Asset Tag
                  </label>
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    placeholder="e.g. 2A0A4687"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Machine Type / MTM
                  </label>
                  <input
                    type="text"
                    value={formData.mtm}
                    onChange={(e) => setFormData({ ...formData, mtm: e.target.value })}
                    placeholder="e.g. 20TD003KUS"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operational Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Active">Active / Deployed</option>
                    <option value="In Spare Pool">In Spare Pool</option>
                    <option value="In Repair">In Repair</option>
                    <option value="Retired">Retired / Decommissioned</option>
                  </select>
                </div>
              </div>

              {/* Step 3: User Association & Room Location */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-amber-600" />
                  <span>2. User Assignment & Room Location</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Quick-Select Portal User
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const u = portalUsers.find(x => x.id === e.target.value);
                        if (u) {
                          setFormData({
                            ...formData,
                            assignedTo: u.displayName || u.email,
                            assignedEmail: u.email || ''
                          });
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                    >
                      <option value="">-- Choose from Users --</option>
                      {portalUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName || u.email} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Assigned User Name
                    </label>
                    <input
                      type="text"
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      placeholder="e.g. Jonathan Ruble"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Assigned User Email
                    </label>
                    <input
                      type="email"
                      value={formData.assignedEmail}
                      onChange={(e) => setFormData({ ...formData, assignedEmail: e.target.value })}
                      placeholder="user@wcatrojans.org"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Campus / Building
                    </label>
                    <select
                      value={formData.campus}
                      onChange={(e) => setFormData({ ...formData, campus: e.target.value, room: '' })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                    >
                      {placesList.map((p) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Room / Office
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={availableRooms.includes(formData.room) ? formData.room : ''}
                        onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                        className="w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                      >
                        <option value="">-- Select Room --</option>
                        {availableRooms.map((rm) => (
                          <option key={rm} value={rm}>{rm}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={formData.room}
                        onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                        placeholder="Or type room..."
                        className="w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Purchase Date, 5-Year Replacement & Warranty Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Refresh Cycle (Years)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.replacementCycleYears}
                    onChange={(e) => setFormData({ ...formData, replacementCycleYears: Number(e.target.value) || 5 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Warranty Tier
                  </label>
                  <input
                    type="text"
                    value={formData.warrantyName}
                    onChange={(e) => setFormData({ ...formData, warrantyName: e.target.value })}
                    placeholder="e.g. 1Y Depot / 3Y Premier"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Warranty Expiration
                  </label>
                  <input
                    type="date"
                    value={formData.warrantyEndDate}
                    onChange={(e) => setFormData({ ...formData, warrantyEndDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              {/* Step 5: Specs & Notes */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hardware Specifications (Auto-pulled for Lenovo)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.specs}
                    onChange={(e) => setFormData({ ...formData, specs: e.target.value })}
                    placeholder="CPU, RAM, Storage, Display, OS..."
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Notes / PO Reference
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional PO number or deployment notes..."
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition-all shadow-md shadow-amber-500/20"
                >
                  {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add to Fleet Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: BULK CSV FLEET IMPORT + AUTO LENOVO WARRANTY SYNC
         ===================================================================== */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-[#0b1c2d] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base tracking-wide">
                  Bulk Fleet CSV Import
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-600 font-medium">
                  Columns: <code className="font-mono text-slate-800">SerialNumber, AssetTag, Vendor, Category, AssignedUser, Email, Campus, Room, PurchaseDate</code>
                </span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-blue-600 hover:underline font-bold flex items-center gap-1 flex-shrink-0 ml-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Template</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Upload CSV File or Paste Rows Below
                </label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-2"
                />
                <textarea
                  rows={5}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="MJ0GF76R, 2A0A4687, Lenovo, Laptops, Jonathan Ruble, jruble@wcatrojans.org, Centennial Campus, Room 204, 2022-01-14"
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 bg-blue-50/70 border border-blue-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncOnImport}
                  onChange={(e) => setAutoSyncOnImport(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">
                    Auto-fetch Lenovo Warranty, Model, Purchase Date & Specs during import
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Queries pcsupport.lenovo.com for every Lenovo serial number automatically
                  </span>
                </div>
              </label>

              {importStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${importing ? 'animate-spin' : ''}`} />
                  <span>{importStatus}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkCsvImport}
                  disabled={importing}
                  className="px-5 py-2.5 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-md shadow-amber-500/20"
                >
                  {importing ? 'Importing Fleet...' : 'Import & Sync Fleet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
