import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Wrench, 
  Sparkles, 
  Laptop, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Save, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  Sliders,
  Tag,
  MapPin,
  User,
  Layers,
  Mail,
  Send,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Download,
  FileText,
  FileSpreadsheet,
  FileUp,
  Info
} from 'lucide-react';
import { saveCatalogSettings } from '../services/firebase';
import { sendTestNotificationEmail } from '../services/notificationService';
import { AREAS as DEFAULT_AREAS, BUILDINGS as DEFAULT_BUILDINGS, DEFAULT_PLACES } from '../data/categoriesData';

// --- CSV Parsing & Export Helpers ---
function parseCsvContent(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const rows = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    let delimiter = ',';
    if (line.includes('\t')) delimiter = '\t';
    else if (!line.includes(',') && line.includes(';')) delimiter = ';';

    const tokens = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        tokens.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    tokens.push(current.trim());
    const cleaned = tokens.map((t) => t.replace(/^["']|["']$/g, '').trim()).filter(Boolean);
    if (cleaned.length > 0) rows.push(cleaned);
  }
  return rows;
}

function extractRoomsFromCsvRows(rows) {
  if (!rows || rows.length === 0) return [];
  const headerCandidates = rows[0].map((c) => c.toLowerCase());
  const roomColIdx = headerCandidates.findIndex((h) => 
    h.includes('room') || h.includes('facility') || h.includes('location') || h.includes('classroom') || h.includes('name')
  );
  let startIndex = 0;
  let targetCol = 0;
  if (roomColIdx !== -1) {
    targetCol = roomColIdx;
    startIndex = 1;
  } else if (headerCandidates.some((h) => h.includes('campus') || h.includes('building') || h.includes('wing'))) {
    startIndex = 1;
  }
  const extracted = [];
  for (let i = startIndex; i < rows.length; i++) {
    const val = rows[i][targetCol] || rows[i][0];
    if (val && val.trim()) extracted.push(val.trim());
  }
  return Array.from(new Set(extracted));
}

function extractAssetsFromCsvRows(rows) {
  if (!rows || rows.length === 0) return [];
  const headerCandidates = rows[0].map((c) => c.toLowerCase());
  const colIdx = headerCandidates.findIndex((h) => 
    h.includes('asset') || h.includes('item') || h.includes('category') || h.includes('name') || h.includes('type')
  );
  let startIndex = 0;
  let targetCol = 0;
  if (colIdx !== -1) {
    targetCol = colIdx;
    startIndex = 1;
  }
  const extracted = [];
  for (let i = startIndex; i < rows.length; i++) {
    const val = rows[i][targetCol] || rows[i][0];
    if (val && val.trim()) extracted.push(val.trim());
  }
  return Array.from(new Set(extracted));
}

function extractIssuesFromCsvRows(rows) {
  if (!rows || rows.length === 0) return [];
  const headerCandidates = rows[0].map((c) => c.toLowerCase());
  const colIdx = headerCandidates.findIndex((h) => 
    h.includes('issue') || h.includes('problem') || h.includes('description') || h.includes('title')
  );
  let startIndex = 0;
  let targetCol = 0;
  if (colIdx !== -1) {
    targetCol = colIdx;
    startIndex = 1;
  }
  const extracted = [];
  for (let i = startIndex; i < rows.length; i++) {
    const val = rows[i][targetCol] || rows[i][0];
    if (val && val.trim()) extracted.push(val.trim());
  }
  return Array.from(new Set(extracted));
}

function triggerCsvDownload(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadSampleRoomsTemplate() {
  const sample = `Room Name,Wing / Area
Room 101,Main Academic Wing
Room 102,Main Academic Wing
Room 103,Science Wing
Science Lab 1,Science Wing
Gymnasium,Athletics Complex
Main Office,Administrative Building
Cafeteria,Commons
Media Center,Library
Baseball Field,Athletics Complex
Restrooms,Main Hallway`;
  triggerCsvDownload('sample_campus_rooms_template.csv', sample);
}

function downloadSampleAssetsTemplate(areaName = 'Department') {
  const sample = `Asset Category Name
Smartboard / Interactive Display
Student Chromebook
Staff Desktop Workstation
Network Printer / Copier
Classroom Projector
Document Camera`;
  triggerCsvDownload(`sample_${areaName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_assets_template.csv`, sample);
}

export default function FieldCustomizer({ catalog, onCatalogUpdate }) {
  const [activeTab, setActiveTab] = useState('buildings'); // 'buildings' | 'facilities' | 'housekeeping' | 'itsm' | 'notifications'
  const [places, setPlaces] = useState(catalog?.places || DEFAULT_PLACES);
  const [buildings, setBuildings] = useState(catalog?.buildings || DEFAULT_PLACES.map(p => p.name));
  const [areas, setAreas] = useState(catalog?.areas || DEFAULT_AREAS);

  // Email & Notifications settings
  const [emailWebhookUrl, setEmailWebhookUrl] = useState(catalog?.emailWebhookUrl || '');
  const [testRecipient, setTestRecipient] = useState('jruble@wcatrojans.org');
  const [isSavingEmailSettings, setIsSavingEmailSettings] = useState(false);
  const [emailSaveSuccess, setEmailSaveSuccess] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (catalog?.places) {
      setPlaces(catalog.places);
      setBuildings(catalog.places.map(p => p.name));
    } else if (catalog?.buildings) {
      setBuildings(catalog.buildings);
    }
    if (catalog?.areas) setAreas(catalog.areas);
    if (catalog?.emailWebhookUrl !== undefined) {
      setEmailWebhookUrl(catalog.emailWebhookUrl);
    }
  }, [catalog]);

  // Place / Campus editing states
  const [editingPlace, setEditingPlace] = useState(null);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [quickRoomInputs, setQuickRoomInputs] = useState({});
  const [newPlaceData, setNewPlaceData] = useState({
    name: '',
    address: '',
    type: 'School Campus',
    leadTech: 'Support Team',
    roomsCount: 25,
    wings: 'Main Classrooms, Library, Cafeteria, Gymnasium',
    roomsText: 'Baseball Field, Gymnasium, Cafeteria, Main Office, Media Center, Science Lab, Room 101, Room 102, Restrooms'
  });

  // Department edit states
  const [newAssetText, setNewAssetText] = useState('');
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editAssetText, setEditAssetText] = useState('');

  const [newIssueText, setNewIssueText] = useState('');
  const [editingIssueIndex, setEditingIssueIndex] = useState(null);
  const [editIssueText, setEditIssueText] = useState('');

  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // CSV Import / Export states
  const [importModal, setImportModal] = useState(null); // { type: 'rooms' | 'assets' | 'issues', targetPlaceId, areaId }
  const [importTargetPlaceId, setImportTargetPlaceId] = useState('centennial');
  const [importMode, setImportMode] = useState('append'); // 'append' | 'replace'
  const [importMethod, setImportMethod] = useState('file'); // 'file' | 'paste'
  const [importFileName, setImportFileName] = useState('');
  const [rawImportText, setRawImportText] = useState('');
  const [importItems, setImportItems] = useState([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Open CSV Import Helpers
  const openRoomsImportModal = (placeId = 'centennial') => {
    setImportTargetPlaceId(placeId);
    setImportModal({ type: 'rooms', targetPlaceId: placeId });
    setImportMode('append');
    setImportMethod('file');
    setImportFileName('');
    setRawImportText('');
    setImportItems([]);
  };

  const openAssetsImportModal = (areaId) => {
    setImportModal({ type: 'assets', areaId });
    setImportMode('append');
    setImportMethod('file');
    setImportFileName('');
    setRawImportText('');
    setImportItems([]);
  };

  const openIssuesImportModal = (areaId) => {
    setImportModal({ type: 'issues', areaId });
    setImportMode('append');
    setImportMethod('file');
    setImportFileName('');
    setRawImportText('');
    setImportItems([]);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setRawImportText(text);
        processRawText(text, importModal?.type);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteTextChange = (e) => {
    const text = e.target.value;
    setRawImportText(text);
    processRawText(text, importModal?.type);
  };

  const processRawText = (text, type) => {
    const rows = parseCsvContent(text);
    let items = [];
    if (type === 'rooms') {
      items = extractRoomsFromCsvRows(rows);
    } else if (type === 'assets') {
      items = extractAssetsFromCsvRows(rows);
    } else if (type === 'issues') {
      items = extractIssuesFromCsvRows(rows);
    }
    setImportItems(items);
  };

  const handleRemoveImportItem = (indexToRemove) => {
    setImportItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleDirectCsvLoadForNewPlace = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        const rows = parseCsvContent(text);
        const extracted = extractRoomsFromCsvRows(rows);
        if (extracted.length > 0) {
          setNewPlaceData((prev) => ({
            ...prev,
            roomsText: extracted.join(', ')
          }));
          showToast(`✓ Loaded ${extracted.length} rooms from CSV!`);
        } else {
          alert('Could not find any rooms in the uploaded CSV file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDirectCsvLoadForEditPlace = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        const rows = parseCsvContent(text);
        const extracted = extractRoomsFromCsvRows(rows);
        if (extracted.length > 0) {
          setEditingPlace((prev) => ({
            ...prev,
            roomsText: extracted.join(', ')
          }));
          showToast(`✓ Loaded ${extracted.length} rooms from CSV!`);
        } else {
          alert('Could not find any rooms in the uploaded CSV file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const exportCampusRoomsCsv = (place) => {
    const lines = ['Campus,Room Name'];
    (place.rooms || []).forEach((room) => {
      lines.push(`"${(place.name || '').replace(/"/g, '""')}","${room.replace(/"/g, '""')}"`);
    });
    triggerCsvDownload(`${(place.name || 'Campus').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_rooms.csv`, lines.join('\n'));
  };

  const exportDepartmentAssetsCsv = (area) => {
    const lines = ['Department,Asset Category'];
    (area.assetTypes || []).forEach((asset) => {
      lines.push(`"${(area.name || '').replace(/"/g, '""')}","${(asset.name || '').replace(/"/g, '""')}"`);
    });
    triggerCsvDownload(`${(area.id || 'department')}_asset_categories.csv`, lines.join('\n'));
  };

  const handleExecuteImport = () => {
    if (!importItems || importItems.length === 0) {
      alert('No valid items found to import.');
      return;
    }
    setIsProcessingImport(true);

    try {
      if (importModal?.type === 'rooms') {
        const targetPlace = places.find((p) => p.id === importTargetPlaceId) || places[0];
        if (!targetPlace) {
          alert('Please select a valid campus.');
          setIsProcessingImport(false);
          return;
        }

        let finalRooms = [];
        if (importMode === 'replace') {
          finalRooms = importItems;
        } else {
          const existing = targetPlace.rooms || [];
          const combined = [...existing];
          importItems.forEach((item) => {
            if (!combined.includes(item)) combined.push(item);
          });
          finalRooms = combined;
        }

        const updated = places.map((p) =>
          p.id === targetPlace.id
            ? {
                ...p,
                rooms: finalRooms,
                roomsCount: finalRooms.length
              }
            : p
        );

        setPlaces(updated);
        setBuildings(updated.map((p) => p.name));
        persistChanges(updated, areas);
        showToast(`✓ Successfully imported ${importItems.length} rooms into ${targetPlace.name}!`);
        setImportModal(null);
      } else if (importModal?.type === 'assets') {
        const currentArea = areas.find((a) => a.id === importModal.areaId) || activeArea;
        if (!currentArea) {
          setIsProcessingImport(false);
          return;
        }

        const existingNames = new Set((currentArea.assetTypes || []).map((a) => a.name.toLowerCase()));
        const newAssets = [...(currentArea.assetTypes || [])];
        let addedCount = 0;

        importItems.forEach((item) => {
          if (!existingNames.has(item.toLowerCase())) {
            newAssets.push({
              id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: item
            });
            existingNames.add(item.toLowerCase());
            addedCount++;
          }
        });

        const updatedAreas = areas.map((a) =>
          a.id === currentArea.id
            ? {
                ...a,
                assetTypes: newAssets
              }
            : a
        );

        setAreas(updatedAreas);
        persistChanges(places, updatedAreas);
        showToast(`✓ Imported ${addedCount} asset categories into ${currentArea.name}!`);
        setImportModal(null);
      } else if (importModal?.type === 'issues') {
        const currentArea = areas.find((a) => a.id === importModal.areaId) || activeArea;
        if (!currentArea) {
          setIsProcessingImport(false);
          return;
        }

        const existingIssues = new Set((currentArea.predefinedIssues || []).map((i) => i.toLowerCase()));
        const newIssues = [...(currentArea.predefinedIssues || [])];
        let addedCount = 0;

        importItems.forEach((item) => {
          if (!existingIssues.has(item.toLowerCase())) {
            newIssues.push(item);
            existingIssues.add(item.toLowerCase());
            addedCount++;
          }
        });

        const updatedAreas = areas.map((a) =>
          a.id === currentArea.id
            ? {
                ...a,
                predefinedIssues: newIssues
              }
            : a
        );

        setAreas(updatedAreas);
        persistChanges(places, updatedAreas);
        showToast(`✓ Imported ${addedCount} pre-defined issues into ${currentArea.name}!`);
        setImportModal(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error during import: ' + err.message);
    } finally {
      setIsProcessingImport(false);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const persistChanges = async (updatedPlaces, updatedAreas) => {
    setSaving(true);
    try {
      const placesToSave = updatedPlaces || places;
      const buildingsToSave = placesToSave.map(p => p.name);
      const payload = {
        places: placesToSave,
        buildings: buildingsToSave,
        areas: updatedAreas || areas,
        emailWebhookUrl: emailWebhookUrl.trim()
      };
      await saveCatalogSettings(payload);
      if (onCatalogUpdate) onCatalogUpdate(payload);
      showToast('Changes saved to live system!');
    } catch (err) {
      console.error(err);
      alert('Error saving changes. Please check permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmailSettings = async (e) => {
    if (e) e.preventDefault();
    setIsSavingEmailSettings(true);
    setEmailSaveSuccess(false);
    try {
      const payload = {
        places,
        buildings: places.map(p => p.name),
        areas,
        emailWebhookUrl: emailWebhookUrl.trim()
      };
      await saveCatalogSettings(payload);
      if (onCatalogUpdate) onCatalogUpdate(payload);
      setEmailSaveSuccess(true);
      showToast('Email & Notification settings saved!');
      setTimeout(() => setEmailSaveSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert('Error saving email settings: ' + err.message);
    } finally {
      setIsSavingEmailSettings(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient || !testRecipient.includes('@')) {
      alert('Please enter a valid recipient email address.');
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await sendTestNotificationEmail({
        recipientEmail: testRecipient.trim(),
        webhookUrl: emailWebhookUrl.trim() || null
      });

      if (res?.webhookDispatched) {
        setTestResult({
          success: true,
          message: `✓ Test email notification successfully dispatched via Google Apps Script to ${testRecipient.trim()}! Please check your inbox and spam folder.`
        });
      } else if (res?.webhookError) {
        setTestResult({
          success: false,
          message: `⚠️ Outbound Dispatch Error: ${res.webhookError}`
        });
      } else {
        setTestResult({
          success: true,
          message: `Notification queued in Firestore mail collection for ${testRecipient.trim()}. If you have a Webhook URL, ensure it is saved.`
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `Failed to send test email: ${err.message}`
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // --- Place / Building Handlers ---
  const handleSavePlaceEdit = (e) => {
    e.preventDefault();
    if (!editingPlace.name.trim()) return;

    // Parse rooms from textarea
    const parsedRooms = editingPlace.roomsText
      ? editingPlace.roomsText.split(/[\n,]+/).map(r => r.trim()).filter(Boolean)
      : (editingPlace.rooms || []);

    const updatedPlace = {
      ...editingPlace,
      rooms: parsedRooms,
      roomsCount: parsedRooms.length
    };

    const updated = places.map((p) => p.id === editingPlace.id ? updatedPlace : p);
    setPlaces(updated);
    setBuildings(updated.map(p => p.name));
    setEditingPlace(null);
    persistChanges(updated, areas);
  };

  const handleAddPlaceSubmit = (e) => {
    e.preventDefault();
    if (!newPlaceData.name.trim()) return;

    const parsedRooms = newPlaceData.roomsText
      ? newPlaceData.roomsText.split(/[\n,]+/).map(r => r.trim()).filter(Boolean)
      : ['Main Office', 'Cafeteria', 'Gymnasium', 'Room 101', 'Room 102'];

    const newPlace = {
      id: `place_${Date.now()}`,
      name: newPlaceData.name.trim(),
      address: newPlaceData.address.trim(),
      type: newPlaceData.type.trim() || 'School Campus',
      leadTech: newPlaceData.leadTech.trim() || 'Support Team',
      wings: newPlaceData.wings.trim(),
      rooms: parsedRooms,
      roomsCount: parsedRooms.length
    };
    const updated = [...places, newPlace];
    setPlaces(updated);
    setBuildings(updated.map(p => p.name));
    setShowAddPlaceModal(false);
    setNewPlaceData({
      name: '',
      address: '',
      type: 'School Campus',
      leadTech: 'Support Team',
      roomsCount: 25,
      wings: 'Main Classrooms, Library, Cafeteria, Gymnasium',
      roomsText: 'Baseball Field, Gymnasium, Cafeteria, Main Office, Media Center, Science Lab, Room 101, Room 102, Restrooms'
    });
    persistChanges(updated, areas);
  };

  const handleAddRoomToPlace = (placeId) => {
    const roomName = (quickRoomInputs[placeId] || '').trim();
    if (!roomName) return;

    const updated = places.map((p) => {
      if (p.id === placeId) {
        const existingRooms = p.rooms || [];
        if (existingRooms.includes(roomName)) return p;
        const newRooms = [...existingRooms, roomName];
        return {
          ...p,
          rooms: newRooms,
          roomsCount: newRooms.length
        };
      }
      return p;
    });

    setPlaces(updated);
    setQuickRoomInputs((prev) => ({ ...prev, [placeId]: '' }));
    persistChanges(updated, areas);
  };

  const handleRemoveRoomFromPlace = (placeId, roomNameToRemove) => {
    const updated = places.map((p) => {
      if (p.id === placeId) {
        const existingRooms = p.rooms || [];
        const newRooms = existingRooms.filter((r) => r !== roomNameToRemove);
        return {
          ...p,
          rooms: newRooms,
          roomsCount: newRooms.length
        };
      }
      return p;
    });

    setPlaces(updated);
    persistChanges(updated, areas);
  };

  const handleDeletePlace = (placeId, placeName) => {
    if (places.length <= 1) {
      alert('You must have at least one building.');
      return;
    }
    const confirmDelete = window.confirm(`Remove "${placeName}" from Places and Buildings?`);
    if (!confirmDelete) return;
    const updated = places.filter((p) => p.id !== placeId);
    setPlaces(updated);
    setBuildings(updated.map(p => p.name));
    persistChanges(updated, areas);
  };

  // --- Department Asset Handlers ---
  const getActiveArea = () => areas.find((a) => a.id === activeTab);

  const handleAddAsset = (e) => {
    e.preventDefault();
    const trimmed = newAssetText.trim();
    if (!trimmed) return;
    
    const updatedAreas = areas.map((area) => {
      if (area.id !== activeTab) return area;
      const newAsset = {
        id: `custom_${Date.now()}`,
        name: trimmed
      };
      return {
        ...area,
        assetTypes: [...area.assetTypes, newAsset]
      };
    });

    setAreas(updatedAreas);
    setNewAssetText('');
    persistChanges(places, updatedAreas);
  };

  const handleSaveAssetEdit = (assetId) => {
    const trimmed = editAssetText.trim();
    if (!trimmed) return;

    const updatedAreas = areas.map((area) => {
      if (area.id !== activeTab) return area;
      return {
        ...area,
        assetTypes: area.assetTypes.map((ast) => 
          ast.id === assetId ? { ...ast, name: trimmed } : ast
        )
      };
    });

    setAreas(updatedAreas);
    setEditingAssetId(null);
    persistChanges(places, updatedAreas);
  };

  const handleDeleteAsset = (assetId) => {
    const active = getActiveArea();
    if (active.assetTypes.length <= 1) {
      alert('You must keep at least one asset category.');
      return;
    }

    const updatedAreas = areas.map((area) => {
      if (area.id !== activeTab) return area;
      return {
        ...area,
        assetTypes: area.assetTypes.filter((ast) => ast.id !== assetId)
      };
    });

    setAreas(updatedAreas);
    persistChanges(places, updatedAreas);
  };

  // --- Department Pre-Defined Issue Handlers ---
  const handleAddIssue = (e) => {
    e.preventDefault();
    const trimmed = newIssueText.trim();
    if (!trimmed) return;

    const updatedAreas = areas.map((area) => {
      if (area.id !== activeTab) return area;
      const withoutNotListed = area.predefinedIssues.filter((iss) => iss !== 'Issue Not Listed');
      return {
        ...area,
        predefinedIssues: [...withoutNotListed, trimmed, 'Issue Not Listed']
      };
    });

    setAreas(updatedAreas);
    setNewIssueText('');
    persistChanges(places, updatedAreas);
  };

  const handleSaveIssueEdit = (index) => {
    const trimmed = editIssueText.trim();
    if (!trimmed) return;

    const updatedAreas = areas.map((area) => {
      if (area.id !== activeTab) return area;
      const issues = [...area.predefinedIssues];
      issues[index] = trimmed;
      return {
        ...area,
        predefinedIssues: issues
      };
    });

    setAreas(updatedAreas);
    setEditingIssueIndex(null);
    persistChanges(places, updatedAreas);
  };

  const handleDeleteIssue = (index) => {
    const active = getActiveArea();
    const target = active.predefinedIssues[index];
    if (target === 'Issue Not Listed') {
      alert('"Issue Not Listed" is required for custom requests and cannot be removed.');
      return;
    }

    const updatedAreas = areas.map((area) => {
      if (area.id !== activeTab) return area;
      return {
        ...area,
        predefinedIssues: area.predefinedIssues.filter((_, i) => i !== index)
      };
    });

    setAreas(updatedAreas);
    persistChanges(places, updatedAreas);
  };

  const handleResetDefaults = () => {
    const confirmReset = window.confirm("Reset all buildings, places, asset lists, and pre-defined issues to original defaults?");
    if (!confirmReset) return;
    setPlaces(DEFAULT_PLACES);
    setBuildings(DEFAULT_PLACES.map(p => p.name));
    setAreas(DEFAULT_AREAS);
    persistChanges(DEFAULT_PLACES, DEFAULT_AREAS);
    showToast('Reset to original defaults.');
  };

  const activeArea = getActiveArea();

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Fields & Department Customizer
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Manage school campuses, physical addresses, asset categories, and pre-defined issue choices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {toastMsg && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300 animate-fade-in">
              <CheckCircle className="w-4 h-4" />
              <span>{toastMsg}</span>
            </div>
          )}
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('buildings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'buildings'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4 text-amber-400" />
          <span>Buildings & Places ({places.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('facilities')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'facilities'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Facilities & Maintenance</span>
        </button>

        <button
          onClick={() => setActiveTab('housekeeping')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'housekeeping'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Housekeeping & Custodial</span>
        </button>

        <button
          onClick={() => setActiveTab('itsm')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'itsm'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>ITSM / Technology</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'notifications'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Mail className="w-4 h-4 text-purple-300" />
          <span>Email & Notifications</span>
        </button>
      </div>

      {/* --- TAB 1: BUILDINGS & PLACES --- */}
      {activeTab === 'buildings' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Campus Buildings & Locations</h3>
              <p className="text-xs text-slate-500">
                Configure district school campuses, physical addresses, lead technicians, and room zones.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openRoomsImportModal(places[0]?.id || 'centennial')}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1.5 shadow-sm"
                title="Bulk Import Campus Rooms from CSV File"
              >
                <Upload className="w-4 h-4 text-amber-600" />
                <span>Import Rooms CSV</span>
              </button>

              <button
                onClick={() => setShowAddPlaceModal(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Campus / Building</span>
              </button>
            </div>
          </div>

          {/* Places & Buildings List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {places.map((place) => (
              <div
                key={place.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-amber-300 transition-all space-y-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">{place.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 uppercase tracking-wider">
                        {place.type || 'School Campus'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingPlace({ ...place, roomsText: (place.rooms || []).join(', ') })}
                      className="p-2 text-slate-500 hover:text-amber-600 hover:bg-slate-200/80 rounded-xl transition-colors"
                      title="Edit Campus Details & Rooms"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePlace(place.id, place.name)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Delete Campus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="font-semibold text-slate-800 truncate">{place.address || 'Address not specified'}</span>
                </div>

                {/* Attached Rooms & Facilities Section */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-700 flex items-center gap-1">
                      <span>Attached Rooms & Facilities</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                        {(place.rooms || []).length}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openRoomsImportModal(place.id)}
                        className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                        title={`Import Rooms CSV into ${place.name}`}
                      >
                        <Upload className="w-3 h-3 text-amber-600" />
                        <span>Import CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => exportCampusRoomsCsv(place)}
                        className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                        title={`Export ${place.name} Rooms as CSV`}
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Room Chips */}
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 scrollbar-thin">
                    {(place.rooms || []).length > 0 ? (
                      place.rooms.map((room, rIdx) => (
                        <span
                          key={rIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200 group hover:bg-amber-50 hover:border-amber-300 transition-colors"
                        >
                          <span>{room}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRoomFromPlace(place.id, room)}
                            className="text-slate-400 hover:text-red-600 ml-0.5 rounded-full p-0.5"
                            title={`Remove ${room}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No rooms or facilities added yet.</span>
                    )}
                  </div>

                  {/* Quick Add Room or Facility Input */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder="e.g. Baseball Field, Room 301, Gym..."
                      value={quickRoomInputs[place.id] || ''}
                      onChange={(e) => setQuickRoomInputs((prev) => ({ ...prev, [place.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRoomToPlace(place.id);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddRoomToPlace(place.id)}
                      disabled={!(quickRoomInputs[place.id] || '').trim()}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                  <span>Lead Contact: <strong className="text-slate-800">{place.leadTech || 'Support Team'}</strong></span>
                  <span>{place.wings || 'Main Campus Facilities'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TABS 2, 3, 4: DEPARTMENT ASSETS & PRE-DEFINED ISSUES --- */}
      {activeTab !== 'buildings' && activeArea && (
        <div className="space-y-6">
          {/* Section 1: Asset Categories */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>{activeArea.name}</span>
                  <span className="text-xs font-normal text-slate-500">— Asset Categories</span>
                </h3>
                <p className="text-xs text-slate-500">
                  These choices populate the "Asset Category" dropdown when submitting a {activeArea.shortName} ticket.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => openAssetsImportModal(activeArea.id)}
                  className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1.5 shadow-sm"
                  title={`Bulk Import Asset Categories for ${activeArea.name} from CSV`}
                >
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>Import CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportDepartmentAssetsCsv(activeArea)}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 font-bold rounded-xl transition-colors shadow-sm"
                  title={`Export ${activeArea.name} Asset Categories as CSV`}
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* Add Asset Form */}
                <form onSubmit={handleAddAsset} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Smartboards, Sinks, Bleachers..."
                    value={newAssetText}
                    onChange={(e) => setNewAssetText(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 w-full sm:w-60"
                  />
                  <button
                    type="submit"
                    disabled={!newAssetText.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Asset Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeArea.assetTypes.map((asset) => {
                const isEditing = editingAssetId === asset.id;

                return (
                  <div
                    key={asset.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2 group hover:border-slate-300 transition-all"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editAssetText}
                          onChange={(e) => setEditAssetText(e.target.value)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-amber-400 bg-white flex-1 focus:ring-1 focus:ring-amber-500 font-medium"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveAssetEdit(asset.id)}
                          className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingAssetId(null)}
                          className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 truncate">
                          <Tag className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                            {asset.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingAssetId(asset.id);
                              setEditAssetText(asset.name);
                            }}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Rename Asset"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Pre-Defined Issues */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>{activeArea.name}</span>
                  <span className="text-xs font-normal text-slate-500">— Pre-Defined Issues ("Select the Issue")</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Quick-select buttons displayed to requesters for common problems.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => openIssuesImportModal(activeArea.id)}
                  className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1.5 shadow-sm"
                  title={`Bulk Import Pre-Defined Issues for ${activeArea.name} from CSV`}
                >
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>Import CSV</span>
                </button>

                {/* Add Issue Form */}
                <form onSubmit={handleAddIssue} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Broken wheel on cart..."
                    value={newIssueText}
                    onChange={(e) => setNewIssueText(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 w-full sm:w-60"
                  />
                  <button
                    type="submit"
                    disabled={!newIssueText.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Issues Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeArea.predefinedIssues.map((issue, idx) => {
                const isEditing = editingIssueIndex === idx;
                const isNotListed = issue === 'Issue Not Listed';

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 group transition-all ${
                      isNotListed
                        ? 'border-amber-300 bg-amber-50/50'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editIssueText}
                          onChange={(e) => setEditIssueText(e.target.value)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-amber-400 bg-white flex-1 focus:ring-1 focus:ring-amber-500 font-medium"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveIssueEdit(idx)}
                          className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingIssueIndex(null)}
                          className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                          <span className={`text-xs sm:text-sm font-semibold truncate ${
                            isNotListed ? 'text-amber-950 font-bold' : 'text-slate-800'
                          }`}>
                            {issue}
                          </span>
                        </div>

                        {!isNotListed && (
                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingIssueIndex(idx);
                                setEditIssueText(issue);
                              }}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-200 rounded-lg transition-colors"
                              title="Edit Issue"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteIssue(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Issue"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: EMAIL & NOTIFICATIONS SETTINGS --- */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-600" />
                  <span>Email Notifications & Webhooks</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Configure automatic email notifications on status changes, Incident IQ responses, and requester replies.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Notification Engine Active
                </span>
              </div>
            </div>

            {/* Notification Triggers & Privacy Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <Send className="w-4 h-4 text-blue-600" />
                  <span>Status Updates</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  When a technician updates ticket status (In Progress, Waiting on Requester, Resolved, Closed), an email is automatically sent to the submitter with ticket details and deep-link.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Option 2: Visible to Requester</span>
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  When a technician posts a public response with the switch ON, the requester receives a branded email containing the technician's comment and an action button to reply.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Option 1: Tech Internal Notes</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  When the switch is OFF, the comment is strictly marked as internal. <strong>No emails are triggered</strong>, and the note is 100% invisible to requesters.
                </p>
              </div>
            </div>

            {/* Webhook Configuration Form */}
            <form onSubmit={handleSaveEmailSettings} className="space-y-4 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800">
                  Outbound Google Apps Script Webhook URL (Optional)
                </label>
                <p className="text-xs text-slate-500">
                  By default, notifications are processed via the Firebase Cloud Function (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">sendTicketNotification</code>) and queued in Firestore (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">mail</code> collection). If you have deployed the Google Apps Script Web App from <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">google-apps-script/WCA_Helpdesk_Email_Dispatcher.gs</code>, paste its Web App URL below for direct Gmail delivery.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <input
                    type="url"
                    value={emailWebhookUrl}
                    onChange={(e) => setEmailWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={isSavingEmailSettings}
                    className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingEmailSettings ? 'Saving...' : 'Save Webhook URL'}</span>
                  </button>
                </div>
                {emailSaveSuccess && (
                  <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Settings saved successfully!
                  </p>
                )}
              </div>
            </form>

            {/* Test Email Delivery Widget */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-600" />
                <span>Send Test Notification Email</span>
              </h4>
              <p className="text-xs text-slate-500">
                Test the email dispatcher by sending a sample ticket notification to any WCA email address.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="recipient@wcatrojans.org"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isSendingTest ? 'Sending...' : 'Send Test Notification'}</span>
                </button>
              </div>
              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 max-w-xl ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Google Apps Script Integration Guide */}
            <div className="pt-4 border-t border-slate-100 bg-slate-50/50 rounded-xl p-4 space-y-2 border border-slate-200 text-xs text-slate-600">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-slate-600" />
                <span>Google Apps Script Outbound & Inbound Dispatcher File</span>
              </div>
              <p>
                A ready-to-deploy Google Apps Script is included in the codebase at:
                <br />
                <code className="text-slate-800 font-bold bg-white px-2 py-0.5 rounded border border-slate-200 mt-1 inline-block">
                  google-apps-script/WCA_Helpdesk_Email_Dispatcher.gs
                </code>
              </p>
              <p className="text-[11px] text-slate-500 leading-normal">
                Deploy it in Google Apps Script under <strong className="text-slate-700">Deploy &gt; New deployment &gt; Web app</strong> (Execute as: Me / Who has access: Anyone) to enable zero-cost native Gmail sending for all notifications.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT PLACE IN CUSTOMIZER --- */}
      {editingPlace && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-600" />
                <span>Edit Campus / Building</span>
              </h3>
              <button 
                onClick={() => setEditingPlace(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlaceEdit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Campus / Building Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingPlace.name}
                  onChange={(e) => setEditingPlace({ ...editingPlace, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  value={editingPlace.address || ''}
                  onChange={(e) => setEditingPlace({ ...editingPlace, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Facility Type
                  </label>
                  <input
                    type="text"
                    value={editingPlace.type || ''}
                    onChange={(e) => setEditingPlace({ ...editingPlace, type: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Lead Tech / Contact
                  </label>
                  <input
                    type="text"
                    value={editingPlace.leadTech || ''}
                    onChange={(e) => setEditingPlace({ ...editingPlace, leadTech: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Attached Rooms & Facilities</span>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-amber-700 hover:text-amber-800 font-bold bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg cursor-pointer border border-amber-200 transition-colors inline-flex items-center gap-1 shadow-2xs">
                      <Upload className="w-3 h-3 text-amber-600" />
                      <span>Load Rooms from CSV</span>
                      <input
                        type="file"
                        accept=".csv,.txt,.tsv"
                        onChange={handleDirectCsvLoadForEditPlace}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-slate-400 font-normal">Separate with commas</span>
                  </div>
                </label>
                <textarea
                  rows={3}
                  value={editingPlace.roomsText || ''}
                  onChange={(e) => setEditingPlace({ ...editingPlace, roomsText: e.target.value })}
                  placeholder="e.g. Baseball Field, Gymnasium, Cafeteria, Room 101, Room 102"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Classrooms, Wings & Specialized Zones
                </label>
                <textarea
                  rows={2}
                  value={editingPlace.wings || ''}
                  onChange={(e) => setEditingPlace({ ...editingPlace, wings: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPlace(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD PLACE IN CUSTOMIZER --- */}
      {showAddPlaceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-600" />
                <span>Add Campus / Building</span>
              </h3>
              <button 
                onClick={() => setShowAddPlaceModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPlaceSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Campus / Building Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPlaceData.name}
                  onChange={(e) => setNewPlaceData({ ...newPlaceData, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. WCA South Elementary"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  value={newPlaceData.address}
                  onChange={(e) => setNewPlaceData({ ...newPlaceData, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Kensington, MN 56343"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Facility Type
                  </label>
                  <input
                    type="text"
                    value={newPlaceData.type}
                    onChange={(e) => setNewPlaceData({ ...newPlaceData, type: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Lead Tech
                  </label>
                  <input
                    type="text"
                    value={newPlaceData.leadTech}
                    onChange={(e) => setNewPlaceData({ ...newPlaceData, leadTech: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Initial Rooms & Facilities</span>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-amber-700 hover:text-amber-800 font-bold bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg cursor-pointer border border-amber-200 transition-colors inline-flex items-center gap-1 shadow-2xs">
                      <Upload className="w-3 h-3 text-amber-600" />
                      <span>Load Rooms from CSV</span>
                      <input
                        type="file"
                        accept=".csv,.txt,.tsv"
                        onChange={handleDirectCsvLoadForNewPlace}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-slate-400 font-normal">Separate with commas</span>
                  </div>
                </label>
                <textarea
                  rows={2}
                  value={newPlaceData.roomsText || ''}
                  onChange={(e) => setNewPlaceData({ ...newPlaceData, roomsText: e.target.value })}
                  placeholder="e.g. Baseball Field, Gymnasium, Cafeteria, Room 101, Room 102"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Classrooms, Wings & Specialized Zones
                </label>
                <textarea
                  rows={2}
                  value={newPlaceData.wings}
                  onChange={(e) => setNewPlaceData({ ...newPlaceData, wings: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPlaceModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-sm"
                >
                  Create Campus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- UNIVERSAL CSV IMPORT MODAL --- */}
      {importModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 animate-fade-in space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {importModal.type === 'rooms' && 'Import Campus Rooms & Facilities'}
                    {importModal.type === 'assets' && 'Import Department Asset Categories'}
                    {importModal.type === 'issues' && 'Import Pre-Defined Issues'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Load entries from a CSV/Excel file or paste spreadsheet columns directly
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs sm:text-sm">
              {/* If type === rooms, Campus Selector */}
              {importModal.type === 'rooms' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Target Campus / Building
                  </label>
                  <select
                    value={importTargetPlaceId}
                    onChange={(e) => setImportTargetPlaceId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-semibold bg-white text-slate-800"
                  >
                    {places.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name} ({place.rooms?.length || 0} existing rooms)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Import Mode: Append vs Replace */}
              {importModal.type === 'rooms' && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="block font-bold text-slate-700 mb-2">Import Strategy</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${importMode === 'append' ? 'bg-amber-50/70 border-amber-300 text-slate-900 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <input
                        type="radio"
                        name="importMode"
                        value="append"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <span>Append / Merge</span>
                        <p className="text-[11px] font-normal text-slate-500">Adds new items without removing current rooms</p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${importMode === 'replace' ? 'bg-amber-50/70 border-amber-300 text-slate-900 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <span>Replace List</span>
                        <p className="text-[11px] font-normal text-slate-500">Overwrites all current rooms with the imported list</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Input Method Switcher */}
              <div>
                <div className="flex items-center gap-1 border-b border-slate-200 mb-3">
                  <button
                    type="button"
                    onClick={() => setImportMethod('file')}
                    className={`px-3 py-1.5 font-bold text-xs border-b-2 transition-colors flex items-center gap-1.5 ${importMethod === 'file' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File (.csv, .tsv, .txt)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMethod('paste')}
                    className={`px-3 py-1.5 font-bold text-xs border-b-2 transition-colors flex items-center gap-1.5 ${importMethod === 'paste' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Paste Spreadsheet Data</span>
                  </button>
                </div>

                {importMethod === 'file' ? (
                  <div className="space-y-2">
                    <label className="border-2 border-dashed border-slate-300 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/30 transition-colors rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer text-center group">
                      <FileUp className="w-8 h-8 text-slate-400 group-hover:text-amber-500 mb-2 transition-colors" />
                      <span className="font-bold text-slate-700 text-xs sm:text-sm">Click to select CSV or spreadsheet file</span>
                      <span className="text-[11px] text-slate-400 mt-0.5">Supports .csv, .tsv, or tab/comma-delimited text</span>
                      {importFileName && (
                        <div className="mt-3 px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>{importFileName}</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept=".csv,.txt,.tsv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Paste Data Directly
                    </label>
                    <textarea
                      rows={5}
                      value={rawImportText}
                      onChange={handlePasteTextChange}
                      placeholder="Paste one room/item per line, or copy-paste rows & columns directly from Excel or Google Sheets..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Sample Template & Auto-Detection Note */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-blue-900 text-xs">
                <div className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>Column headers (e.g. <i>Room Name</i>, <i>Asset Category</i>) are auto-detected.</span>
                </div>
                {importModal.type === 'rooms' && (
                  <button
                    type="button"
                    onClick={downloadSampleRoomsTemplate}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white px-2 py-1 rounded-lg border border-blue-200 shadow-2xs"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Sample CSV Template</span>
                  </button>
                )}
                {importModal.type === 'assets' && (
                  <button
                    type="button"
                    onClick={() => downloadSampleAssetsTemplate(getActiveArea()?.name)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white px-2 py-1 rounded-lg border border-blue-200 shadow-2xs"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Sample CSV Template</span>
                  </button>
                )}
              </div>

              {/* Parsed Items Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700 text-xs">
                    Items Detected for Import ({importItems.length})
                  </span>
                  {importItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setImportItems([])}
                      className="text-[11px] text-red-600 hover:text-red-700 font-bold"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {importItems.length > 0 ? (
                  <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-1.5">
                    {importItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold shadow-2xs group"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImportItem(idx)}
                          className="text-slate-400 hover:text-red-600 p-0.5"
                          title="Remove item"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                    No items detected yet. Upload a CSV file or paste spreadsheet rows above.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => setImportModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importItems.length === 0 || isProcessingImport}
                onClick={handleExecuteImport}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold shadow-sm text-xs sm:text-sm flex items-center gap-2"
              >
                {isProcessingImport ? (
                  <span>Importing...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Import ({importItems.length} Items)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
