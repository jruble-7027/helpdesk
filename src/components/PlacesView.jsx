import React, { useState } from 'react';
import { 
  MapPin, 
  Building2, 
  Search, 
  Sliders, 
  ExternalLink, 
  ChevronRight, 
  Wrench, 
  Sparkles, 
  Laptop,
  Users
} from 'lucide-react';

const CAMPUS_DATA = [
  {
    id: 'centennial',
    name: 'Centennial Campus',
    type: 'Elementary / Middle Facility',
    address: '301 County Rd 11, Barrett, MN',
    roomsCount: 42,
    leadTech: 'Jonathan Ruble',
    wings: [
      { name: 'Room 204 (IT Staff Lab)', type: 'Tech Office', assetsCount: 18 },
      { name: 'Classrooms 101-118 (Elementary)', type: 'Classrooms', assetsCount: 54 },
      { name: 'Media Center & Maker Space', type: 'Library / Lab', assetsCount: 36 },
      { name: 'Cafeteria & Kitchen Commons', type: 'Food Services', assetsCount: 12 },
      { name: 'Centennial Gymnasium', type: 'Athletics', assetsCount: 8 }
    ]
  },
  {
    id: 'secondary',
    name: 'Secondary High School Wing',
    type: 'High School Facility',
    address: 'School St, Barrett, MN',
    roomsCount: 58,
    leadTech: 'Support Team',
    wings: [
      { name: 'Science Labs A & B', type: 'Laboratories', assetsCount: 28 },
      { name: 'High School Media Center', type: 'Library', assetsCount: 65 },
      { name: 'STEM & Industrial Tech Shop', type: 'Vocational', assetsCount: 22 },
      { name: 'Auditorium & Sound Booth', type: 'Performing Arts', assetsCount: 34 },
      { name: 'Varsity Gymnasium & Fieldhouse', type: 'Athletics', assetsCount: 14 }
    ]
  },
  {
    id: 'elementary',
    name: 'North Elementary Campus',
    type: 'Primary Education',
    address: 'Elbow Lake, MN',
    roomsCount: 35,
    leadTech: 'Support Team',
    wings: [
      { name: 'Kindergarten & Early Childhood Wing', type: 'Classrooms', assetsCount: 24 },
      { name: 'Primary Grades 1-4 Classrooms', type: 'Classrooms', assetsCount: 40 },
      { name: 'Elementary Library & Computer Cart', type: 'Library', assetsCount: 32 },
      { name: 'Multipurpose Room / Gymnasium', type: 'Gym / Commons', assetsCount: 10 }
    ]
  },
  {
    id: 'district',
    name: 'District Administration Office',
    type: 'District Services',
    address: 'Barrett, MN',
    roomsCount: 14,
    leadTech: 'Jonathan Ruble',
    wings: [
      { name: 'Superintendent & Board Room', type: 'Executive', assetsCount: 12 },
      { name: 'Business & Payroll Office', type: 'Finance', assetsCount: 9 },
      { name: 'Central Server Room / Main MDF', type: 'Data Center', assetsCount: 45 }
    ]
  }
];

export default function PlacesView({ onOpenCustomizer, isAdmin }) {
  const [search, setSearch] = useState('');
  const [selectedCampus, setSelectedCampus] = useState(CAMPUS_DATA[0]);

  const filteredCampuses = CAMPUS_DATA.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q);
  });

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
              School facilities, classroom zones, workrooms, and server MDF/IDF locations.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenCustomizer}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"
          >
            <Sliders className="w-4 h-4" />
            <span>Customize Buildings & Fields</span>
          </button>
        )}
      </div>

      {/* Grid of Campuses & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Campuses List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search campuses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {filteredCampuses.map((campus) => {
            const isSelected = selectedCampus?.id === campus.id;
            return (
              <div
                key={campus.id}
                onClick={() => setSelectedCampus(campus)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400/40'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <Building2 className={`w-5 h-5 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                    <h3 className="text-sm font-bold">{campus.name}</h3>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-300'}`} />
                </div>
                <p className={`text-xs mt-1.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {campus.address}
                </p>
                <div className="mt-3 flex items-center gap-3 text-[11px]">
                  <span className={`px-2 py-0.5 rounded ${isSelected ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'}`}>
                    {campus.roomsCount} Rooms / Areas
                  </span>
                  <span className={isSelected ? 'text-slate-400' : 'text-slate-500'}>
                    Lead: {campus.leadTech}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Campus Details */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {selectedCampus ? (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                      {selectedCampus.type}
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                      {selectedCampus.name}
                    </h2>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Total Rooms & Wings</div>
                    <div className="text-xl font-bold text-slate-900">{selectedCampus.roomsCount}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedCampus.address}</span>
                  <span className="text-slate-300">•</span>
                  <span>Primary Support: <strong>{selectedCampus.leadTech}</strong></span>
                </p>
              </div>

              {/* Wings / Classrooms Breakdown */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Classrooms, Wings & Specialized Facilities
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedCampus.wings.map((wing, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-amber-300 transition-colors">
                      <div className="font-bold text-xs text-slate-900">{wing.name}</div>
                      <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                        <span>{wing.type}</span>
                        <span className="font-semibold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                          {wing.assetsCount} devices tracked
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maintenance & Tech Contact */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                    WCA
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Assigned Campus Tech Team</div>
                    <div className="text-xs text-slate-500">Centennial & Secondary District Services</div>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={onOpenCustomizer}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    <span>Configure in Customizer</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              Select a campus on the left to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
