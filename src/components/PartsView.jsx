import React, { useState } from 'react';
import { 
  Wrench, 
  Search, 
  Plus, 
  Package, 
  AlertCircle, 
  CheckCircle, 
  Tag, 
  Boxes,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';

const INITIAL_PARTS = [
  {
    id: 'prt-001',
    sku: 'LCD-CB3100-11',
    name: 'Dell Chromebook 3100 11.6" Matte LCD Replacement Screen',
    category: 'Technology Parts',
    bin: 'Tech Bin B-04',
    inStock: 14,
    minThreshold: 5,
    unitCost: '$29.50',
    supplier: 'ChromebookParts Inc'
  },
  {
    id: 'prt-002',
    sku: 'PWR-USBC-65W',
    name: '65W USB-C PD Fast Power Adapter & AC Cord (Dell / HP / Lenovo)',
    category: 'Technology Parts',
    bin: 'Tech Bin A-12',
    inStock: 28,
    minThreshold: 10,
    unitCost: '$16.00',
    supplier: 'CDW-G'
  },
  {
    id: 'prt-003',
    sku: 'CBL-HDMI-10FT',
    name: 'HDMI 2.1 Ultra High Speed Cable 10ft (Classroom Displays)',
    category: 'Cables & AV',
    bin: 'AV Rack C-02',
    inStock: 19,
    minThreshold: 8,
    unitCost: '$6.25',
    supplier: 'Monoprice'
  },
  {
    id: 'prt-004',
    sku: 'PEN-VS-DUAL',
    name: 'ViewSonic ViewBoard Interactive Stylus Pen (2-Pack)',
    category: 'Classroom AV',
    bin: 'Tech Bin B-08',
    inStock: 4,
    minThreshold: 6,
    unitCost: '$22.00',
    supplier: 'ViewSonic Education'
  },
  {
    id: 'prt-005',
    sku: 'FLT-MERV13-2025',
    name: 'MERV 13 Commercial HVAC Air Filter 20x25x4',
    category: 'Facilities & HVAC',
    bin: 'Facility Bay W-01',
    inStock: 32,
    minThreshold: 15,
    unitCost: '$14.80',
    supplier: 'Grainger'
  },
  {
    id: 'prt-006',
    sku: 'DR-CLOSER-HD',
    name: 'Heavy-Duty Commercial Grade 1 Surface Door Closer',
    category: 'Facilities Hardware',
    bin: 'Facility Bay D-03',
    inStock: 3,
    minThreshold: 4,
    unitCost: '$89.00',
    supplier: 'School Specialty'
  },
  {
    id: 'prt-007',
    sku: 'LED-T8-4FT-BYPASS',
    name: 'T8 LED Ballast-Bypass Tube Light 4ft 5000K Daylight',
    category: 'Electrical & Lighting',
    bin: 'Facility Bay E-05',
    inStock: 45,
    minThreshold: 20,
    unitCost: '$5.10',
    supplier: 'Grainger'
  },
  {
    id: 'prt-008',
    sku: 'NET-CAT6-14FT-BLU',
    name: 'Cat6 Snagless Gigabit Ethernet Patch Cable 14ft Blue',
    category: 'Networking',
    bin: 'Network Cart NET-01',
    inStock: 52,
    minThreshold: 15,
    unitCost: '$3.20',
    supplier: 'Monoprice'
  }
];

export default function PartsView({ onRequestPart }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Technology Parts', 'Cables & AV', 'Classroom AV', 'Facilities & HVAC', 'Facilities Hardware', 'Electrical & Lighting', 'Networking'];

  const filtered = INITIAL_PARTS.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const q = search.toLowerCase();
    const matchesSearch = !search.trim() ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.bin.toLowerCase().includes(q) ||
      p.supplier.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 shadow-sm">
            <Boxes className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Parts & Supplies Inventory
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Repair components, chargers, display cables, HVAC filters, and facility maintenance hardware.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200">
          Total SKUs Tracked: <strong className="text-slate-900">{INITIAL_PARTS.length}</strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by part name, SKU, bin location, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

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

      {/* Parts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Part Description / SKU</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Bin Location</th>
                <th className="px-5 py-3 text-center">In Stock</th>
                <th className="px-5 py-3">Unit Cost</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((part) => {
                const isLow = part.inStock <= part.minThreshold;
                return (
                  <tr key={part.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{part.name}</div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">SKU: {part.sku}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      {part.category}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700">
                      {part.bin}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-extrabold ${
                        isLow ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {part.inStock} units
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                      {part.unitCost}
                    </td>
                    <td className="px-5 py-3.5">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertCircle className="w-3 h-3" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="w-3 h-3" />
                          Good Stock
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => onRequestPart && onRequestPart(part.name)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-xs font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <span>Request</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
