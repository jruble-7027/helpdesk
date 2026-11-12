import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  arrayUnion, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  Sparkles, 
  Laptop, 
  ChevronRight, 
  ExternalLink,
  MessageSquare,
  User,
  Building,
  RefreshCw
} from 'lucide-react';
import { db } from '../services/firebase';

const STATUS_CONFIG = {
  new: { label: 'New', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
  assigned: { label: 'Assigned', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  in_progress: { label: 'In Progress', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  waiting: { label: 'Waiting on Parts/User', badge: 'bg-purple-100 text-purple-800 border-purple-300' },
  resolved: { label: 'Resolved', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  closed: { label: 'Closed', badge: 'bg-slate-100 text-slate-700 border-slate-300' }
};

export default function TicketDashboard({ user, filterByMyTickets = false }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Note adding state
  const [newNote, setNewNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Real-time Firestore subscription
  useEffect(() => {
    let isMounted = true;
    try {
      const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        if (isMounted) {
          setTickets(fetched);
          setLoading(false);
        }
      }, (err) => {
        console.warn("Firestore query warning (may be waiting for live creds or rules):", err);
        if (isMounted) setLoading(false);
      });

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (err) {
      console.warn("Firestore listener init warning:", err);
      setLoading(false);
    }
  }, []);

  const handleUpdateStatus = async (ticketId, newStatus) => {
    setIsUpdating(true);
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      const statusEntry = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        updatedBy: user?.displayName || user?.email || 'Staff Member',
        note: `Status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}`
      };

      await updateDoc(ticketRef, {
        status: newStatus,
        statusHistory: arrayUnion(statusEntry),
        updatedAt: serverTimestamp()
      });

      // Update active selection
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prev) => ({
          ...prev,
          status: newStatus,
          statusHistory: [...(prev.statusHistory || []), statusEntry]
        }));
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Error updating status. Please verify permissions.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedTicket) return;

    setIsUpdating(true);
    try {
      const ticketRef = doc(db, 'tickets', selectedTicket.id);
      const noteEntry = {
        status: selectedTicket.status,
        timestamp: new Date().toISOString(),
        updatedBy: user?.displayName || user?.email || 'Staff Member',
        note: newNote.trim()
      };

      await updateDoc(ticketRef, {
        statusHistory: arrayUnion(noteEntry),
        updatedAt: serverTimestamp()
      });

      setSelectedTicket((prev) => ({
        ...prev,
        statusHistory: [...(prev.statusHistory || []), noteEntry]
      }));
      setNewNote('');
    } catch (error) {
      console.error("Failed to add note:", error);
      alert("Error adding note.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter((t) => {
    if (filterByMyTickets && user?.email && t.createdByEmail !== user.email) {
      return false;
    }
    if (selectedArea !== 'all' && t.areaId !== selectedArea) {
      return false;
    }
    if (selectedStatus !== 'all' && t.status !== selectedStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = (t.ticketNumber || '').toLowerCase().includes(q);
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchRoom = (t.roomLocation || '').toLowerCase().includes(q);
      const matchUser = (t.createdByName || t.createdByEmail || '').toLowerCase().includes(q);
      const matchAsset = (t.assetType || t.assetTag || '').toLowerCase().includes(q);
      return matchNum || matchTitle || matchDesc || matchRoom || matchUser || matchAsset;
    }
    return true;
  });

  // Department counts
  const counts = {
    all: tickets.length,
    facilities: tickets.filter((t) => t.areaId === 'facilities').length,
    housekeeping: tickets.filter((t) => t.areaId === 'housekeeping').length,
    itsm: tickets.filter((t) => t.areaId === 'itsm').length,
    emergency: tickets.filter((t) => t.urgency === 'emergency' && t.status !== 'resolved' && t.status !== 'closed').length
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div 
          onClick={() => setSelectedArea('all')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedArea === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs font-semibold opacity-75">All Tickets</div>
          <div className="text-2xl font-extrabold mt-1">{counts.all}</div>
        </div>

        <div 
          onClick={() => setSelectedArea('facilities')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedArea === 'facilities' ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs font-semibold flex items-center gap-1.5 opacity-90">
            <Wrench className="w-3.5 h-3.5" />
            <span>Facilities</span>
          </div>
          <div className="text-2xl font-extrabold mt-1">{counts.facilities}</div>
        </div>

        <div 
          onClick={() => setSelectedArea('housekeeping')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedArea === 'housekeeping' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs font-semibold flex items-center gap-1.5 opacity-90">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Housekeeping</span>
          </div>
          <div className="text-2xl font-extrabold mt-1">{counts.housekeeping}</div>
        </div>

        <div 
          onClick={() => setSelectedArea('itsm')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedArea === 'itsm' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs font-semibold flex items-center gap-1.5 opacity-90">
            <Laptop className="w-3.5 h-3.5" />
            <span>ITSM</span>
          </div>
          <div className="text-2xl font-extrabold mt-1">{counts.itsm}</div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-xl border bg-red-50 border-red-200 text-red-900">
          <div className="text-xs font-semibold flex items-center gap-1.5 text-red-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Active Emergencies</span>
          </div>
          <div className="text-2xl font-extrabold mt-1 text-red-700">{counts.emergency}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search tickets, rooms, assets, staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium bg-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Ticket List View & Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket List */}
        <div className={selectedTicket ? 'lg:col-span-7 space-y-3' : 'lg:col-span-12 space-y-3'}>
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading support queue...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Tickets Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                There are no tickets matching your current department or status filters.
              </p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              const isEmergency = ticket.urgency === 'emergency';
              const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.new;

              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`bg-white rounded-xl border p-4 sm:p-5 transition-all cursor-pointer hover:shadow-md ${
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-400/40 shadow-sm'
                      : isEmergency
                        ? 'border-red-300 bg-red-50/30'
                        : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {ticket.ticketNumber || 'TICK'}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {ticket.areaName}
                        </span>
                        {isEmergency && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> EMERGENCY
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-slate-900 hover:text-amber-600 transition-colors">
                        {ticket.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {ticket.description}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${status.badge}`}>
                        {status.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ticket.building} • {ticket.roomLocation}</span>
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline text-slate-600 font-medium">{ticket.assetType}</span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      <User className="w-3.5 h-3.5" />
                      <span>{ticket.createdByName}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Ticket Detail Drawer (Right side) */}
        {selectedTicket && (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-6 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedTicket.ticketNumber}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedTicket.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕ Close
              </button>
            </div>

            {/* Quick Status Update Selector */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Update Ticket Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                  const isActive = selectedTicket.status === key;
                  return (
                    <button
                      key={key}
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(selectedTicket.id, key)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center ${
                        isActive
                          ? `${cfg.badge} ring-2 ring-slate-900 shadow-sm`
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ticket Info Details */}
            <div className="text-xs space-y-2 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Department:</span>
                <span className="font-semibold">{selectedTicket.areaName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Location:</span>
                <span className="font-semibold">{selectedTicket.building} • {selectedTicket.roomLocation}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Asset / Category:</span>
                <span className="font-semibold">{selectedTicket.assetType}</span>
              </div>
              {selectedTicket.assetTag && selectedTicket.assetTag !== 'N/A' && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Asset Tag / Serial:</span>
                  <span className="font-mono font-semibold">{selectedTicket.assetTag}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Requester:</span>
                <span className="font-semibold">{selectedTicket.createdByName} ({selectedTicket.createdByEmail})</span>
              </div>
            </div>

            {/* Full Description */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Description
              </h4>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {selectedTicket.description}
              </div>
            </div>

            {/* Photos / Attachments */}
            {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Photos ({selectedTicket.attachments.length})
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {selectedTicket.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block rounded-lg overflow-hidden border border-slate-200 aspect-square"
                    >
                      <img src={att.url} alt={att.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Activity & Note Log */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                <span>Work Notes & Activity</span>
              </h4>

              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {selectedTicket.statusHistory && selectedTicket.statusHistory.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-semibold text-slate-700">{item.updatedBy}</span>
                      <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-slate-700">{item.note}</div>
                  </div>
                ))}
              </div>

              {/* Add Note Input */}
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a technician note or resolution details..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={isUpdating || !newNote.trim()}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
                >
                  Post Note
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
