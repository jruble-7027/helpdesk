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
  Tag
} from 'lucide-react';
import { saveCatalogSettings } from '../services/firebase';
import { AREAS as DEFAULT_AREAS, BUILDINGS as DEFAULT_BUILDINGS } from '../data/categoriesData';

export default function FieldCustomizer({ catalog, onCatalogUpdate }) {
  const [activeTab, setActiveTab] = useState('buildings'); // 'buildings' | 'facilities' | 'housekeeping' | 'itsm'
  const [buildings, setBuildings] = useState(catalog?.buildings || DEFAULT_BUILDINGS);
  const [areas, setAreas] = useState(catalog?.areas || DEFAULT_AREAS);

  useEffect(() => {
    if (catalog?.buildings) setBuildings(catalog.buildings);
    if (catalog?.areas) setAreas(catalog.areas);
  }, [catalog]);

  // In-place edit states
  const [editingBuildingIndex, setEditingBuildingIndex] = useState(null);
  const [editBuildingText, setEditBuildingText] = useState('');
  const [newBuildingText, setNewBuildingText] = useState('');

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

  const persistChanges = async (updatedBuildings, updatedAreas) => {
    setSaving(true);
    try {
      const payload = {
        buildings: updatedBuildings || buildings,
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

  // --- Building Handlers ---
  const handleAddBuilding = (e) => {
    e.preventDefault();
    const trimmed = newBuildingText.trim();
    if (!trimmed) return;
    if (buildings.includes(trimmed)) {
      alert('A building with this name already exists.');
      return;
    }
    const updated = [...buildings, trimmed];
    setBuildings(updated);
    setNewBuildingText('');
    persistChanges(updated, areas);
  };

  const handleSaveBuildingEdit = (index) => {
    const trimmed = editBuildingText.trim();
    if (!trimmed) return;
    const updated = [...buildings];
    updated[index] = trimmed;
    setBuildings(updated);
    setEditingBuildingIndex(null);
    persistChanges(updated, areas);
  };

  const handleDeleteBuilding = (index) => {
    if (buildings.length <= 1) {
      alert('You must have at least one building.');
      return;
    }
    const confirmDelete = window.confirm(`Remove "${buildings[index]}" from the building list?`);
    if (!confirmDelete) return;
    const updated = buildings.filter((_, i) => i !== index);
    setBuildings(updated);
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
    persistChanges(buildings, updatedAreas);
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
    persistChanges(buildings, updatedAreas);
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
    persistChanges(buildings, updatedAreas);
  };

  // --- Department Pre-Defined Issue Handlers ---
  const handleAddIssue = (e) => {
    e.preventDefault();
    const trimmed = newIssueText.trim();
    if (!trimmed) return;

    const updatedAreas = areas.map((area) => {
      if (area.id !== activeTab) return area;
      // Keep "Issue Not Listed" at the end if present
      const withoutNotListed = area.predefinedIssues.filter((iss) => iss !== 'Issue Not Listed');
      return {
        ...area,
        predefinedIssues: [...withoutNotListed, trimmed, 'Issue Not Listed']
      };
    });

    setAreas(updatedAreas);
    setNewIssueText('');
    persistChanges(buildings, updatedAreas);
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
    persistChanges(buildings, updatedAreas);
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
    persistChanges(buildings, updatedAreas);
  };

  const handleResetDefaults = () => {
    const confirmReset = window.confirm("Reset all buildings, asset lists, and pre-defined issues to original defaults?");
    if (!confirmReset) return;
    setBuildings(DEFAULT_BUILDINGS);
    setAreas(DEFAULT_AREAS);
    persistChanges(DEFAULT_BUILDINGS, DEFAULT_AREAS);
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
            Rename buildings, add or edit asset categories, and customize pre-defined issue choices.
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
          <span>Buildings & Locations ({buildings.length})</span>
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

      {/* --- TAB 1: BUILDINGS & LOCATIONS --- */}
      {activeTab === 'buildings' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Campus Buildings & Facilities</h3>
              <p className="text-xs text-slate-500">
                These options appear in the "Building / Wing" dropdown on all ticket forms.
              </p>
            </div>

            {/* Add Building Form */}
            <form onSubmit={handleAddBuilding} className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Add new building name..."
                value={newBuildingText}
                onChange={(e) => setNewBuildingText(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
              />
              <button
                type="submit"
                disabled={!newBuildingText.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Buildings List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {buildings.map((building, idx) => {
              const isEditing = editingBuildingIndex === idx;

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2 group hover:border-slate-300 transition-all"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editBuildingText}
                        onChange={(e) => setEditBuildingText(e.target.value)}
                        className="px-2.5 py-1 text-xs rounded-lg border border-amber-400 bg-white flex-1 focus:ring-1 focus:ring-amber-500 font-medium"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveBuildingEdit(idx)}
                        className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingBuildingIndex(null)}
                        className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                          {building}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingBuildingIndex(idx);
                            setEditBuildingText(building);
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-200 rounded-lg transition-colors"
                          title="Rename Building"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBuilding(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Building"
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
    </div>
  );
}
