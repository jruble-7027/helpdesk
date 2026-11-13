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
  Layers
} from 'lucide-react';
import { saveCatalogSettings } from '../services/firebase';
import { AREAS as DEFAULT_AREAS, BUILDINGS as DEFAULT_BUILDINGS, DEFAULT_PLACES } from '../data/categoriesData';

export default function FieldCustomizer({ catalog, onCatalogUpdate }) {
  const [activeTab, setActiveTab] = useState('buildings'); // 'buildings' | 'facilities' | 'housekeeping' | 'itsm'
  const [places, setPlaces] = useState(catalog?.places || DEFAULT_PLACES);
  const [buildings, setBuildings] = useState(catalog?.buildings || DEFAULT_PLACES.map(p => p.name));
  const [areas, setAreas] = useState(catalog?.areas || DEFAULT_AREAS);

  useEffect(() => {
    if (catalog?.places) {
      setPlaces(catalog.places);
      setBuildings(catalog.places.map(p => p.name));
    } else if (catalog?.buildings) {
      setBuildings(catalog.buildings);
    }
    if (catalog?.areas) setAreas(catalog.areas);
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
        areas: updatedAreas || areas
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

            <button
              onClick={() => setShowAddPlaceModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Campus / Building</span>
            </button>
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
                    <span className="text-[10px] text-slate-400 font-medium">Click × to remove</span>
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

              {/* Add Asset Form */}
              <form onSubmit={handleAddAsset} className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="e.g. Smartboards, Sinks, Bleachers..."
                  value={newAssetText}
                  onChange={(e) => setNewAssetText(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
                />
                <button
                  type="submit"
                  disabled={!newAssetText.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Asset</span>
                </button>
              </form>
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

              {/* Add Issue Form */}
              <form onSubmit={handleAddIssue} className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="e.g. Broken wheel on cart..."
                  value={newIssueText}
                  onChange={(e) => setNewIssueText(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
                />
                <button
                  type="submit"
                  disabled={!newIssueText.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Issue</span>
                </button>
              </form>
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
                  <span className="text-[11px] text-slate-400 font-normal">Separate with commas</span>
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
                  <span className="text-[11px] text-slate-400 font-normal">Separate with commas</span>
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
    </div>
  );
}
