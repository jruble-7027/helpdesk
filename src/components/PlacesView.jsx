import React, { useState } from 'react';
import { 
  MapPin, 
  Building2, 
  Search, 
  Sliders, 
  ExternalLink, 
  ChevronRight, 
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  User,
  Layers,
  Phone
} from 'lucide-react';
import { DEFAULT_PLACES } from '../data/categoriesData';

export default function PlacesView({ 
  placesList = [], 
  onSavePlace, 
  onAddPlace, 
  onDeletePlace, 
  onOpenCustomizer, 
  isAdmin 
}) {
  const places = placesList && placesList.length > 0 ? placesList : DEFAULT_PLACES;
  const [search, setSearch] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState(places[0]?.id || 'centennial');
  
  // Edit & Add Modal State
  const [editingPlace, setEditingPlace] = useState(null); // object or null
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPlaceForm, setNewPlaceForm] = useState({
    name: '',
    address: '',
    type: 'School Facility',
    leadTech: 'Support Team',
    roomsCount: 25,
    wings: 'Main Classrooms, Library, Cafeteria, Gymnasium'
  });

  const selectedPlace = places.find((p) => p.id === selectedPlaceId) || places[0];

  const filteredPlaces = places.filter((p) => {
    const q = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.address || '').toLowerCase().includes(q);
  });

  const handleStartEdit = (place) => {
    setEditingPlace({
      id: place.id,
      name: place.name || '',
      address: place.address || '',
      type: place.type || 'School Facility',
      leadTech: place.leadTech || 'Support Team',
      roomsCount: place.roomsCount || 25,
      wings: place.wings || ''
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingPlace.name.trim()) return;
    if (onSavePlace) {
      onSavePlace(editingPlace);
    }
    setEditingPlace(null);
  };

  const handleCreatePlace = (e) => {
    e.preventDefault();
    if (!newPlaceForm.name.trim()) return;
    const newPlace = {
      id: `place_${Date.now()}`,
      ...newPlaceForm
    };
    if (onAddPlace) {
      onAddPlace(newPlace);
    }
    setIsAddingNew(false);
    setSelectedPlaceId(newPlace.id);
    setNewPlaceForm({
      name: '',
      address: '',
      type: 'School Facility',
      leadTech: 'Support Team',
      roomsCount: 25,
      wings: 'Main Classrooms, Library, Cafeteria, Gymnasium'
    });
  };

  const handleDelete = (placeId, placeName) => {
    if (places.length <= 1) {
      alert('You must have at least one campus/building.');
      return;
    }
    const confirmDelete = window.confirm(`Remove "${placeName}" from Places and Buildings?`);
    if (!confirmDelete) return;
    if (onDeletePlace) {
      onDeletePlace(placeId);
    }
    if (selectedPlaceId === placeId) {
      const remaining = places.filter(p => p.id !== placeId);
      if (remaining.length > 0) setSelectedPlaceId(remaining[0].id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 shadow-sm">
            <MapPin className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Places & Campus Buildings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              West Central Area school facilities, addresses, wings, and lead technicians.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <>
              <button
                onClick={() => setIsAddingNew(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Campus</span>
              </button>

              <button
                onClick={onOpenCustomizer}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all"
              >
                <Sliders className="w-4 h-4" />
                <span>Customizer</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Grid: Campuses List & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Campuses List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search campuses & buildings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {filteredPlaces.map((place) => {
            const isSelected = selectedPlace?.id === place.id;
            return (
              <div
                key={place.id}
                onClick={() => setSelectedPlaceId(place.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400/40'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <Building2 className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                    <h3 className="text-sm font-bold leading-tight">{place.name}</h3>
                  </div>
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-300'}`} />
                </div>

                <p className={`text-xs mt-2 flex items-center gap-1.5 truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                  <span className="truncate">{place.address || 'Address not set'}</span>
                </p>

                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className={`px-2 py-0.5 rounded font-semibold ${isSelected ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'}`}>
                    {place.type || 'Facility'}
                  </span>
                  <span className={isSelected ? 'text-slate-400' : 'text-slate-500'}>
                    Tech: <strong>{place.leadTech || 'Support Team'}</strong>
                  </span>
                </div>
              </div>
            );
          })}

          {filteredPlaces.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              No matching campuses found.
            </div>
          )}
        </div>

        {/* Right Column: Selected Campus Details */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {selectedPlace ? (
            <div className="space-y-6">
              
              {/* Campus Header & Action Bar */}
              <div className="border-b border-slate-200 pb-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      {selectedPlace.type || 'School Facility'}
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 mt-1.5">
                      {selectedPlace.name}
                    </h2>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(selectedPlace)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-xs font-bold transition-colors border border-slate-200"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Campus</span>
                      </button>
                      <button
                        onClick={() => handleDelete(selectedPlace.id, selectedPlace.name)}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors border border-slate-200"
                        title="Delete Campus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Campus Address */}
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-150">
                  <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="font-semibold">{selectedPlace.address || 'No physical address configured yet.'}</span>
                </div>
              </div>

              {/* Campus Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Primary Technology & Facility Lead
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-600" />
                    <span>{selectedPlace.leadTech || 'Support Team'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Approximate Rooms & Zones
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>{selectedPlace.roomsCount || '25+'} Dedicated Areas</span>
                  </div>
                </div>
              </div>

              {/* Classrooms & Wings List */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Wings, Labs & Specialized Facilities
                </h3>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {selectedPlace.wings || 'Main Classrooms, Library, Media Center, Cafeteria, Gymnasium, Staff Workroom'}
                  </p>
                </div>
              </div>

              {/* Quick Ticket Hint */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-400">Available on Ticket Forms</div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    "{selectedPlace.name}" is an active choice in the Building/Wing dropdown.
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              Select a campus on the left or add a new one.
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL 1: EDIT CAMPUS / PLACE --- */}
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

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs sm:text-sm">
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
                  placeholder="e.g. Centennial Campus"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  value={editingPlace.address}
                  onChange={(e) => setEditingPlace({ ...editingPlace, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. 1917 N. Centennial St., High Point, NC 27262"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Facility Type
                  </label>
                  <input
                    type="text"
                    value={editingPlace.type}
                    onChange={(e) => setEditingPlace({ ...editingPlace, type: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. High School / Middle School"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Lead Technician / Contact
                  </label>
                  <input
                    type="text"
                    value={editingPlace.leadTech}
                    onChange={(e) => setEditingPlace({ ...editingPlace, leadTech: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. Jonathan Ruble"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Classrooms, Wings & Specialized Rooms
                </label>
                <textarea
                  rows={3}
                  value={editingPlace.wings}
                  onChange={(e) => setEditingPlace({ ...editingPlace, wings: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Science Labs, Media Center, STEM Shop, Auditorium, Gym"
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

      {/* --- MODAL 2: ADD NEW CAMPUS --- */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-600" />
                <span>Add New Campus / Building</span>
              </h3>
              <button 
                onClick={() => setIsAddingNew(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlace} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Campus / Building Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPlaceForm.name}
                  onChange={(e) => setNewPlaceForm({ ...newPlaceForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Sandy Ridge Campus"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  value={newPlaceForm.address}
                  onChange={(e) => setNewPlaceForm({ ...newPlaceForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. 1946 Sandy Ridge Road, Colfax, NC 27235"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Facility Type
                  </label>
                  <input
                    type="text"
                    value={newPlaceForm.type}
                    onChange={(e) => setNewPlaceForm({ ...newPlaceForm, type: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. Primary Elementary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Lead Technician
                  </label>
                  <input
                    type="text"
                    value={newPlaceForm.leadTech}
                    onChange={(e) => setNewPlaceForm({ ...newPlaceForm, leadTech: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. Jonathan Ruble"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Classrooms, Wings & Specialized Rooms
                </label>
                <textarea
                  rows={3}
                  value={newPlaceForm.wings}
                  onChange={(e) => setNewPlaceForm({ ...newPlaceForm, wings: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Classrooms 1-12, Gym, Cafeteria, Computer Lab"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
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
