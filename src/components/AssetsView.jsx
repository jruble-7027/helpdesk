import React, { useState } from 'react';
import { 
  Laptop, 
  Search, 
  Filter, 
  Plus, 
  Monitor, 
  Printer, 
  Wifi, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  MapPin,
  User,
  Tag,
  Cpu
} from 'lucide-react';

const INITIAL_ASSETS = [
  {
    id: 'ast-001',
    name: 'Lenovo ThinkStation P350 Workstation',
    tag: '2A0A4687',
    serial: 'MJ0GF76R',
    category: 'Workstations',
    location: 'Centennial Campus - Room 204',
    assignedTo: 'Jonathan Ruble',
    department: 'ITSM / Technology Support',
    status: 'Active',
    specs: 'Intel Core i7-11700, 32GB RAM, 1TB NVMe SSD, Windows 11 Pro',
    icon: Laptop
  },
  {
    id: 'ast-002',
    name: 'Dell Chromebook 3100 11.6"',
    tag: 'CB-2024-8841',
    serial: '8XK9LM2',
    category: 'Chromebooks',
    location: 'High School - Media Center Cart 3',
    assignedTo: 'Student Pool (Grade 10)',
    department: 'ITSM / Technology Support',
    status: 'Active',
    specs: 'Intel Celeron N4020, 4GB RAM, 32GB eMMC, ChromeOS',
    icon: Laptop
  },
  {
    id: 'ast-003',
    name: 'ViewSonic ViewBoard 75" 4K Interactive Display',
    tag: 'IFP-7501',
    serial: 'VS-75-9921',
    category: 'Displays',
    location: 'Elementary Wing - Room 112',
    assignedTo: 'Sarah Jenkins',
    department: 'ITSM / Technology Support',
    status: 'Active',
    specs: '75" 4K UHD, 20-Point Multi-Touch, Android 11 OS, Dual Pens',
    icon: Monitor
  },
  {
    id: 'ast-004',
    name: 'Epson PowerLite 119W Classroom Projector',
    tag: 'PRJ-4092',
    serial: 'EP-119-3382',
    category: 'Displays',
    location: 'High School Wing - Science Lab B',
    assignedTo: 'Marcus Vance',
    department: 'ITSM / Technology Support',
    status: 'Maintenance Due',
    specs: '4,000 Lumens WXGA 3LCD Projector, Ceiling Mount',
    icon: Monitor
  },
  {
    id: 'ast-005',
    name: 'HP Color LaserJet Enterprise MFP M578dn',
    tag: 'PRN-3012',
    serial: 'CNB1L9928',
    category: 'Printers',
    location: 'Centennial - Staff Workroom',
    assignedTo: 'Staff Shared',
    department: 'ITSM / Technology Support',
    status: 'Active',
    specs: '40 ppm Color/Mono, Dual-sided scan, Pin-code secure release',
    icon: Printer
  },
  {
    id: 'ast-006',
    name: 'Cisco Catalyst 9200L 48-Port PoE+ Switch',
    tag: 'NET-IDF-2',
    serial: 'FOC2438X1',
    category: 'Networking',
    location: 'Main Building - 2nd Floor IDF Closet',
    assignedTo: 'Infrastructure',
    department: 'ITSM / Technology Support',
    status: 'Active',
    specs: '48x 1G PoE+ (370W), 4x 10G SFP+ uplinks, Cisco DNA',
    icon: Wifi
  },
  {
    id: 'ast-007',
    name: 'Trane Rooftop HVAC Unit RTU-3',
    tag: 'FAC-RTU-03',
    serial: 'TRN-2019-940',
    category: 'Facilities Equipment',
    location: 'Gymnasium Roof - South',
    assignedTo: 'Facilities Maintenance',
    department: 'Facilities & Maintenance',
    status: 'Active',
    specs: '15-Ton Packaged Rooftop Unit, Economizer, BACnet Controls',
    icon: Cpu
  }
];

export default function AssetsView({ onReportIssue }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAsset, setSelectedAsset] = useState(null);

  const categories = ['All', 'Workstations', 'Chromebooks', 'Displays', 'Printers', 'Networking', 'Facilities Equipment'];

  const filtered = INITIAL_ASSETS.filter((a) => {
    const matchesCategory = selectedCategory === 'All' || a.category === selectedCategory;
    const q = search.toLowerCase();
    const matchesSearch = !search.trim() || 
      a.name.toLowerCase().includes(q) ||
      a.tag.toLowerCase().includes(q) ||
      a.serial.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q) ||
      a.assignedTo.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 shadow-sm">
              <Laptop className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Assets & Device Inventory
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                School district technology hardware, classroom displays, and facility equipment records.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => onReportIssue && onReportIssue('Lenovo ThinkStation P350')}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Ticket for Asset</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by asset tag, serial, model, room, assignee..."
            value={search}
            onChange={(e) => setSearchQuery ? setSearchQuery(e.target.value) : setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-amber-400'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((asset) => {
          const IconComp = asset.icon;
          return (
            <div
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center text-slate-700 group-hover:text-amber-900 transition-colors">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200">
                        {asset.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1 group-hover:text-amber-700 transition-colors line-clamp-1">
                        {asset.name}
                      </h3>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    asset.status === 'Active' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}>
                    {asset.status}
                  </span>
                </div>

                {/* Tags and Metadata */}
                <div className="space-y-1.5 text-xs text-slate-600 my-3">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tag: <strong className="text-slate-900">{asset.tag}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>S/N: {asset.serial}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{asset.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">Assigned: <strong>{asset.assignedTo}</strong></span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-150 line-clamp-2">
                  {asset.specs}
                </p>
              </div>

              {/* Action row */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Click for details</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onReportIssue) onReportIssue(asset.name);
                  }}
                  className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                >
                  <span>Report Issue</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          No matching assets found. Try adjusting your search query or category filter.
        </div>
      )}
    </div>
  );
}
