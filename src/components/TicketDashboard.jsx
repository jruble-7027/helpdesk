import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  UserCheck,
  Briefcase,
  Building,
  ShieldAlert,
  Send,
  Trash2,
  Wifi,
  Monitor,
  Printer,
  Phone,
  Bell,
  Plus,
  RotateCcw,
  Tag,
  Lock,
  Eye,
  EyeOff,
  Paperclip,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  AlignLeft,
  Check,
  ChevronDown,
  Reply,
  FileText,
  X,
  Settings,
  Circle,
  Edit3,
  QrCode,
  CalendarClock,
  Copy,
  DollarSign,
  ShieldCheck,
  Package
} from 'lucide-react';
import { 
  db, 
  deleteTicket, 
  subscribeToStaffMembers, 
  assignTicket,
  addTicketComment,
  updateTicketStatus,
  updateTicketLogistics,
  subscribeToInventory,
  submitTicket,
  saveCatalogSettings,
  signInWithGoogle
} from '../services/firebase';
import { canModifyTicket, canCloseTicket, ROLES } from '../data/rolesData';
import { DEFAULT_PLACES } from '../data/categoriesData';

const STATUS_CONFIG = {
  new: { label: 'New', badge: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
  assigned: { label: 'Assigned', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300', dot: 'bg-indigo-500' },
  in_progress: { label: 'In Progress', badge: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
  waiting: { label: 'Waiting on Requester', badge: 'bg-purple-100 text-purple-800 border-purple-300', dot: 'bg-purple-500' },
  scheduled_break: { label: 'Scheduled for Break / Summer', badge: 'bg-cyan-100 text-cyan-800 border-cyan-300', dot: 'bg-cyan-500' },
  resolved: { label: 'Resolved', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
  closed: { label: 'Closed', badge: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-500' }
};

const CANNED_REPLIES = {
  itsm: [
    { label: '🔄 Restart & Test', text: 'Please restart your computer completely and test again. Let us know if the issue persists!' },
    { label: '💻 Loaner Issued', text: 'We have issued a loaner device while your assigned computer is being diagnosed/serviced.' },
    { label: '🔑 Password Reset', text: 'Your account password/permissions have been reset. Please sign in and verify access.' },
    { label: '📦 Lenovo Warranty Part', text: 'A warranty replacement part has been ordered from Lenovo Support. We will update you as soon as it arrives.' },
    { label: '✅ Resolved & Verified', text: 'This IT request has been resolved and verified working. Please reply if you need anything else!' }
  ],
  facilities: [
    { label: '🛠️ Parts on Order', text: 'Replacement parts have been ordered for this repair. We will complete the work as soon as they arrive.' },
    { label: '📅 Scheduled for Break', text: 'To avoid disrupting classes, this maintenance work has been scheduled for the upcoming school break.' },
    { label: '👷 Contractor Scheduled', text: 'An outside service vendor/contractor has been scheduled to inspect and complete this repair.' },
    { label: '✅ Repair Completed', text: 'Maintenance repair has been completed and tested. Thank you for reporting this!' }
  ],
  housekeeping: [
    { label: '🧻 Supplies Restocked', text: 'Requested paper goods, soap, and classroom/restroom supplies have been restocked.' },
    { label: '✨ Cleaned & Sanitized', text: 'The area has been cleaned, sanitized, and inspected by our custodial team.' },
    { label: '🧹 Spill / Floor Care Done', text: 'Cleanup has been completed and wet-floor signage placed until dry.' }
  ]
};

const DEFAULT_PM_SCHEDULES = [
  {
    id: 'pm-hvac-filters',
    areaId: 'facilities',
    areaName: 'Facilities & Maintenance',
    title: 'PM: Monthly HVAC Air Filter Replacement & Belt Inspection',
    frequency: 'Monthly',
    location: 'Centennial Campus',
    room: 'All Rooftop & Mechanical Units',
    assetType: 'HVAC / Heating & Cooling',
    urgency: 'medium',
    description: 'Preventive Maintenance: Inspect and replace MERV-13 HVAC return filters, check thermostat calibration, and inspect condensate drain lines.'
  },
  {
    id: 'pm-emergency-lights',
    areaId: 'facilities',
    areaName: 'Facilities & Maintenance',
    title: 'PM: Monthly Fire Extinguisher & Exit Lighting Safety Walk',
    frequency: 'Monthly',
    location: 'Wesleyan Campus',
    room: 'All Corridors & Exits',
    assetType: 'Electrical / Lighting / Power',
    urgency: 'high',
    description: 'Preventive Maintenance: 30-second push-test on all emergency exit signs/lights and visual gauge inspection on corridor fire extinguishers.'
  },
  {
    id: 'pm-gym-floors',
    areaId: 'housekeeping',
    areaName: 'Housekeeping & Custodial',
    title: 'PM: Weekly Gymnasium Hardwood Floor Auto-Scrub & Tack',
    frequency: 'Weekly',
    location: 'Centennial Campus',
    room: 'Gymnasium',
    assetType: 'Gym / Cafeteria / Common Area',
    urgency: 'medium',
    description: 'Preventive Maintenance: Dust mop and auto-scrub gymnasium court surface, sanitize bleachers, and restock athletic locker rooms.'
  },
  {
    id: 'pm-restroom-deep',
    areaId: 'housekeeping',
    areaName: 'Housekeeping & Custodial',
    title: 'PM: Weekly Restroom Deep Descale & Dispenser Audit',
    frequency: 'Weekly',
    location: 'Centennial Campus',
    room: 'Restrooms',
    assetType: 'Restroom Supplies & Sanitation',
    urgency: 'medium',
    description: 'Preventive Maintenance: High-pressure sanitize restroom tile/grout, descale fixtures, check soap/towel dispenser batteries, and refill floor drain traps.'
  },
  {
    id: 'pm-ups-closets',
    areaId: 'itsm',
    areaName: 'ITSM / Technology Support',
    title: 'PM: Quarterly IDF/MDF Server Closet UPS & Filter Check',
    frequency: 'Quarterly',
    location: 'Centennial Campus',
    room: 'Main Office',
    assetType: 'Wi-Fi / Network / Internet',
    urgency: 'medium',
    description: 'Preventive Maintenance: Check UPS battery health & runtime logs, verify closet ambient temperature, and clean switch intake dust filters.'
  },
  {
    id: 'pm-classroom-av',
    areaId: 'itsm',
    areaName: 'ITSM / Technology Support',
    title: 'PM: Quarterly Classroom Promethean & Projector Firmware Check',
    frequency: 'Quarterly',
    location: 'Centennial Campus',
    room: 'Room 101',
    assetType: 'Smartboard / Projector / Classroom AV',
    urgency: 'low',
    description: 'Preventive Maintenance: Test HDMI/USB-C touch inputs, clean projector air filters, and apply latest panel OTA updates.'
  }
];

const getUrgencyKey = (urgency) => {
  const u = (urgency || '').toLowerCase();
  if (u === 'emergency' || u === 'critical') return 'critical';
  if (u === 'high') return 'high';
  if (u === 'medium') return 'medium';
  return 'low';
};

const getPriorityMeta = (urgency) => {
  const k = getUrgencyKey(urgency);
  if (k === 'critical') {
    return {
      key: 'critical',
      score: 100,
      label: 'Critical',
      pillBg: 'bg-red-600 text-white',
      badgeBg: 'bg-red-100 text-red-800 border-red-300'
    };
  }
  if (k === 'high') {
    return {
      key: 'high',
      score: 75,
      label: 'High',
      pillBg: 'bg-orange-500 text-white',
      badgeBg: 'bg-orange-100 text-orange-800 border-orange-300'
    };
  }
  if (k === 'medium') {
    return {
      key: 'medium',
      score: 50,
      label: 'Medium',
      pillBg: 'bg-amber-400 text-slate-950 font-bold',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300'
    };
  }
  return {
    key: 'low',
    score: 25,
    label: 'Low',
    pillBg: 'bg-emerald-500 text-white',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  };
};

const getInitials = (nameOrEmail) => {
  if (!nameOrEmail) return 'WC';
  const clean = nameOrEmail.trim();
  if (clean.includes('@')) {
    const prefix = clean.split('@')[0];
    return prefix.slice(0, 2).toUpperCase();
  }
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Recently';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date.getTime())) return 'Recently';
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const isToday = (timestamp) => {
  if (!timestamp) return false;
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() &&
         date.getMonth() === now.getMonth() &&
         date.getDate() === now.getDate();
};

const isThisWeek = (timestamp) => {
  if (!timestamp) return false;
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
};

const getAssetCategoryIcon = (assetType = '', title = '', areaId = '') => {
  const text = `${assetType} ${title}`.toLowerCase();
  if (text.includes('wifi') || text.includes('wi-fi') || text.includes('network') || text.includes('ethernet')) {
    return Wifi;
  }
  if (text.includes('display') || text.includes('promethean') || text.includes('smart') || text.includes('tv') || text.includes('screen') || text.includes('projector') || text.includes('monitor')) {
    return Monitor;
  }
  if (text.includes('printer') || text.includes('copier') || text.includes('toner')) {
    return Printer;
  }
  if (text.includes('phone') || text.includes('intercom') || text.includes('voip')) {
    return Phone;
  }
  if (text.includes('laptop') || text.includes('chromebook') || text.includes('workstation') || text.includes('desktop') || areaId === 'itsm') {
    return Laptop;
  }
  if (areaId === 'housekeeping') {
    return Sparkles;
  }
  return Wrench;
};

export default function TicketDashboard({ user, userProfile, catalog, onCatalogUpdate, filterByMyTickets = false, onNewTicket }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const role = userProfile?.role || 'requester';
  const isRequester = role === 'requester';
  
  // Set default initial area based on role
  const getDefaultArea = () => {
    if (role === 'facilities_tech') return 'facilities';
    if (role === 'housekeeping_tech') return 'housekeeping';
    if (role === 'it_tech') return 'itsm';
    return 'all';
  };

  const [selectedArea, setSelectedArea] = useState(getDefaultArea());
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // KPI Interactive Filtering state
  const [kpiFilter, setKpiFilter] = useState('all'); // 'all' | 'assigned_to_me' | 'assigned_to_others' | 'unassigned' | 'resolved'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 'critical' | 'high' | 'medium' | 'low'

  // Staff & Technician Assignment state
  const [staffMembers, setStaffMembers] = useState([]);
  const [inventoryDevices, setInventoryDevices] = useState([]);
  const [myTicketsSubTab, setMyTicketsSubTab] = useState('all');

  // Maintenance Logistics & Loaner Device state (Ticket Drawer)
  const [poNumberInput, setPoNumberInput] = useState('');
  const [costInput, setCostInput] = useState('');
  const [partsUsedInput, setPartsUsedInput] = useState('');
  const [loanerTagInput, setLoanerTagInput] = useState('');
  const [loanerReturnedInput, setLoanerReturnedInput] = useState(false);
  const [savingLogistics, setSavingLogistics] = useState(false);

  // QR Code Room & Equipment Sticker Generator Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const placesList = catalog?.places?.length > 0 ? catalog.places : DEFAULT_PLACES;
  const [qrAreaId, setQrAreaId] = useState('housekeeping');
  const [qrPlaceId, setQrPlaceId] = useState(placesList[0]?.id || 'centennial');
  const [qrRoom, setQrRoom] = useState(placesList[0]?.rooms?.[0] || 'Gymnasium');
  const [qrAssetTag, setQrAssetTag] = useState('');
  const [qrCopied, setQrCopied] = useState(false);

  // Preventive Maintenance (PM) Schedules Modal State
  const [showPmModal, setShowPmModal] = useState(false);
  const [spawningPmId, setSpawningPmId] = useState(null);
  const [newPmTitle, setNewPmTitle] = useState('');
  const [newPmAreaId, setNewPmAreaId] = useState('facilities');
  const [newPmFrequency, setNewPmFrequency] = useState('Monthly');
  const [newPmLocation, setNewPmLocation] = useState('Centennial Campus');
  const [newPmRoom, setNewPmRoom] = useState('Gymnasium');

  // Incident IQ Comment Composer & Notification State
  const [commentText, setCommentText] = useState('');
  const [visibleToRequester, setVisibleToRequester] = useState(true); // Toggle 1: true = Option 2 (visible to requester), false = Option 1 (internal tech note)
  const [changeToWaiting, setChangeToWaiting] = useState(false); // Toggle 2: Change to "Waiting on requester"
  const [commentFiles, setCommentFiles] = useState([]);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentSuccessMsg, setCommentSuccessMsg] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef(null);

  // Subscribe to Staff members & Fleet Inventory
  useEffect(() => {
    const unsubStaff = subscribeToStaffMembers((members) => {
      setStaffMembers(members);
    });
    const unsubInv = subscribeToInventory((items) => {
      setInventoryDevices(items || []);
    });
    return () => {
      if (unsubStaff) unsubStaff();
      if (unsubInv) unsubInv();
    };
  }, []);

  // Sync logistics inputs when selectedTicket changes
  useEffect(() => {
    if (!selectedTicket) return;
    setPoNumberInput(selectedTicket.poNumber || '');
    setCostInput(selectedTicket.estimatedCost || '');
    setPartsUsedInput(selectedTicket.partsUsed || '');
    setLoanerTagInput(selectedTicket.loanerTag || '');
    setLoanerReturnedInput(Boolean(selectedTicket.loanerReturned));
  }, [selectedTicket?.id]);

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
          setSelectedTicket((prev) => {
            if (!prev) return null;
            const updated = fetched.find((t) => t.id === prev.id);
            return updated || prev;
          });
          setLoading(false);
        }
      }, (err) => {
        console.warn("Firestore query warning:", err);
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

  // Auto-open ticket from URL query param (e.g. ?ticket=T-5991 or doc id)
  useEffect(() => {
    if (tickets.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const ticketParam = params.get('ticket');
    if (ticketParam) {
      const match = tickets.find((t) => t.id === ticketParam || t.ticketNumber === ticketParam);
      if (match) {
        setSelectedTicket(match);
        // Ensure filters do not hide the ticket in the queue list
        if (match.areaId) {
          setSelectedArea(match.areaId);
        } else {
          setSelectedArea('all');
        }
        setKpiFilter('all');
        setSelectedStatus('all');

        // Reset scroll position of drawer when opening
        setTimeout(() => {
          const detailEl = document.getElementById('ticket-detail-panel');
          if (detailEl) {
            detailEl.scrollTop = 0;
          }
        }, 100);
      }
    }
  }, [tickets]);

  // Escape key & body scroll lock for Incident IQ slide-out drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedTicket) {
        setSelectedTicket(null);
      }
    };
    if (selectedTicket) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTicket]);

  // Status update with automated email notification
  const handleUpdateStatus = async (ticketId, newStatus) => {
    if (!canModify(selectedTicket?.areaId)) {
      alert("You do not have permission to modify tickets in this area.");
      return;
    }

    if (newStatus === 'closed' && !canClose(selectedTicket?.areaId)) {
      alert("Only assigned technicians or system administrators can close tickets.");
      return;
    }

    setIsUpdating(true);
    try {
      const statusEntry = await updateTicketStatus({
        ticketId,
        ticket: selectedTicket,
        newStatus,
        statusLabel: STATUS_CONFIG[newStatus]?.label || newStatus,
        user,
        note: `Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`,
        catalog
      });

      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prev) => ({
          ...prev,
          status: newStatus,
          statusHistory: [...(prev.statusHistory || []), statusEntry]
        }));
      }

      setCommentSuccessMsg(`✓ Status changed to "${STATUS_CONFIG[newStatus]?.label || newStatus}" • Email notification sent`);
      setTimeout(() => setCommentSuccessMsg(''), 4500);
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Error updating status. Please verify permissions.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Incident IQ Formatting toolbar handler
  const handleFormatText = (format) => {
    const textarea = document.getElementById('incidentiq-comment-textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = commentText.substring(start, end);
    let replacement = '';

    switch (format) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        break;
      case 'underline':
        replacement = `__${selected || 'underlined text'}__`;
        break;
      case 'strikethrough':
        replacement = `~~${selected || 'strikethrough text'}~~`;
        break;
      case 'link':
        replacement = `[${selected || 'link title'}](https://...)`;
        break;
      case 'bullet':
        replacement = `\n• ${selected || 'list item'}`;
        break;
      case 'numbered':
        replacement = `\n1. ${selected || 'list item'}`;
        break;
      case 'clear':
        replacement = selected.replace(/[*_~`#]/g, '');
        break;
      default:
        replacement = selected;
    }

    const updatedText = commentText.substring(0, start) + replacement + commentText.substring(end);
    setCommentText(updatedText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 10);
  };

  // Comment file selection
  const handleCommentFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setCommentFiles((prev) => [...prev, ...files]);
    }
  };

  const handleRemoveCommentFile = (index) => {
    setCommentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Add Comment (Technician / Staff - Option 1 vs Option 2)
  const handleAddComment = async (e) => {
    if (e) e.preventDefault();
    if (!commentText.trim() && commentFiles.length === 0) return;
    if (!selectedTicket) return;

    setIsPostingComment(true);
    try {
      const isInternal = !visibleToRequester;
      const newComment = await addTicketComment({
        ticketId: selectedTicket.id,
        ticket: selectedTicket,
        text: commentText,
        isInternal: isInternal,
        changeStatusToWaiting: changeToWaiting,
        files: commentFiles,
        user,
        catalog
      });

      const successMsg = isInternal 
        ? '🔒 Internal technician note saved (hidden from requester)' 
        : `✓ Public response posted • Email sent to ${selectedTicket.createdByEmail || selectedTicket.requester?.email || 'requester'}`;

      setCommentSuccessMsg(successMsg);
      setCommentText('');
      setCommentFiles([]);
      setChangeToWaiting(false);
      setTimeout(() => setCommentSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Failed to post comment:', err);
      alert('Error posting response. Please check network/permissions.');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Requester Reply (Staff submitter replying to technician)
  const handleRequesterReply = async (e) => {
    if (e) e.preventDefault();
    if (!commentText.trim() && commentFiles.length === 0) return;
    if (!selectedTicket) return;

    setIsPostingComment(true);
    try {
      await addTicketComment({
        ticketId: selectedTicket.id,
        ticket: selectedTicket,
        text: commentText,
        isInternal: false, // Requesters are always public
        changeStatusToWaiting: false,
        files: commentFiles,
        user,
        catalog
      });

      setCommentSuccessMsg('✓ Reply posted & technician notified!');
      setCommentText('');
      setCommentFiles([]);
      setTimeout(() => setCommentSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Failed to post reply:', err);
      alert('Error posting reply.');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleAssignTicket = async (assigneeEmail) => {
    if (!selectedTicket) return;
    setIsUpdating(true);
    try {
      const targetUser = staffMembers.find((s) => s.email?.toLowerCase() === assigneeEmail?.toLowerCase()) || null;
      await assignTicket(selectedTicket.id, targetUser, user, selectedTicket, catalog);

      const historyEntry = {
        status: targetUser ? 'assigned' : 'new',
        timestamp: new Date().toISOString(),
        updatedBy: user?.displayName || user?.email || 'Staff Dispatcher',
        note: targetUser 
          ? `Ticket assigned to ${targetUser.displayName || targetUser.email}` 
          : 'Ticket unassigned'
      };

      setSelectedTicket((prev) => ({
        ...prev,
        assignedToEmail: targetUser ? targetUser.email : null,
        assignedToName: targetUser ? (targetUser.displayName || targetUser.email) : null,
        assignedToUid: targetUser ? (targetUser.uid || targetUser.id) : null,
        status: targetUser ? (prev.status === 'new' ? 'assigned' : prev.status) : prev.status,
        statusHistory: [...(prev.statusHistory || []), historyEntry]
      }));
    } catch (err) {
      console.error("Failed to assign ticket:", err);
      alert("Failed to assign technician. Please verify permissions.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSelectedTicket = async () => {
    if (!selectedTicket) return;
    const confirm = window.confirm(`Permanently delete ticket "${selectedTicket.title}"?`);
    if (!confirm) return;
    try {
      await deleteTicket(selectedTicket.id);
      setSelectedTicket(null);
    } catch (err) {
      console.error('Failed to delete ticket:', err);
      alert('Failed to delete ticket. Please check permissions.');
    }
  };

  const handlePrintTicket = (ticket = selectedTicket) => {
    const target = ticket || selectedTicket;
    if (!target) return;
    if (!selectedTicket || selectedTicket.id !== target.id) {
      setSelectedTicket(target);
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Permission checkers
  const canModify = (ticketAreaId) => canModifyTicket(role, ticketAreaId);
  const canClose = (ticketAreaId) => canCloseTicket(role, ticketAreaId);

  // 1-Tap Quick Claim (Assign to Current User) from Ticket Row or Drawer
  const handleQuickClaimTicket = async (e, ticket) => {
    if (e) e.stopPropagation();
    if (!user || !ticket || !canModify(ticket.areaId)) return;
    setIsUpdating(true);
    try {
      const selfAssignee = {
        uid: user.uid,
        email: user.email,
        displayName: userProfile?.displayName || user.displayName || user.email
      };
      await assignTicket(ticket.id, selfAssignee, user, ticket, catalog);
      if (selectedTicket && selectedTicket.id === ticket.id) {
        setSelectedTicket((prev) => ({
          ...prev,
          assignedToEmail: selfAssignee.email,
          assignedToName: selfAssignee.displayName,
          assignedToUid: selfAssignee.uid,
          status: prev.status === 'new' ? 'assigned' : prev.status
        }));
      }
      setCommentSuccessMsg(`✓ Claimed ticket & assigned to ${selfAssignee.displayName}`);
      setTimeout(() => setCommentSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Quick claim error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // 1-Tap Quick Resolve from Ticket Row
  const handleQuickResolveRow = async (e, ticket) => {
    if (e) e.stopPropagation();
    if (!ticket || !canModify(ticket.areaId)) return;
    setIsUpdating(true);
    try {
      await updateTicketStatus({
        ticketId: ticket.id,
        ticket,
        newStatus: 'resolved',
        statusLabel: 'Resolved',
        user,
        note: 'Quick-resolved from ticket queue',
        catalog
      });
    } catch (err) {
      console.error('Quick resolve error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Save Facilities PO # / Cost / Parts Used & IT Loaner Device Logistics
  const handleSaveLogistics = async () => {
    if (!selectedTicket || !canModify(selectedTicket.areaId)) return;
    setSavingLogistics(true);
    try {
      const logisticsPayload = {
        poNumber: poNumberInput.trim(),
        estimatedCost: costInput.trim(),
        partsUsed: partsUsedInput.trim(),
        loanerTag: loanerTagInput.trim(),
        loanerReturned: Boolean(loanerReturnedInput)
      };
      await updateTicketLogistics(selectedTicket.id, logisticsPayload, user);
      setSelectedTicket((prev) => (prev ? { ...prev, ...logisticsPayload } : prev));
      setCommentSuccessMsg('✓ Maintenance logistics, PO # & loaner details saved');
      setTimeout(() => setCommentSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving logistics:', err);
      alert('Could not save logistics details.');
    } finally {
      setSavingLogistics(false);
    }
  };

  // Match Submitter's Assigned Fleet Device(s) from Inventory
  const requesterFleetDevices = useMemo(() => {
    if (!selectedTicket || !inventoryDevices || inventoryDevices.length === 0) return [];
    const reqEmail = (selectedTicket.createdByEmail || selectedTicket.requester?.email || '').toLowerCase().trim();
    const reqName = (selectedTicket.createdByName || selectedTicket.requester?.name || '').toLowerCase().trim();
    const ticketTag = (selectedTicket.assetTag || '').toLowerCase().trim();

    return inventoryDevices.filter((dev) => {
      const devEmail = (dev.assignedUserEmail || '').toLowerCase().trim();
      const devUser = (dev.assignedUser || '').toLowerCase().trim();
      const devSerial = (dev.serial || '').toLowerCase().trim();
      const devTag = (dev.tag || '').toLowerCase().trim();

      if (ticketTag && ticketTag !== 'n/a' && (devSerial === ticketTag || devTag === ticketTag)) return true;
      if (reqEmail && reqEmail !== 'guest@wcatrojans.org' && (devEmail === reqEmail || devUser.includes(reqEmail))) return true;
      if (reqName && reqName.length > 3 && reqName !== 'wca staff / guest' && devUser && (devUser.includes(reqName) || reqName.includes(devUser))) return true;
      return false;
    });
  }, [selectedTicket, inventoryDevices]);

  // Preventive Maintenance (PM) Schedules List & Actions
  const pmSchedules = catalog?.pmSchedules?.length > 0 ? catalog.pmSchedules : DEFAULT_PM_SCHEDULES;

  const handleSpawnPmTicket = async (pm) => {
    if (!pm) return;
    setSpawningPmId(pm.id);
    try {
      const ticketNumber = `PM-${Date.now().toString().slice(-6)}`;
      await submitTicket({
        ticketNumber,
        areaId: pm.areaId,
        areaName: pm.areaName || (pm.areaId === 'facilities' ? 'Facilities & Maintenance' : pm.areaId === 'housekeeping' ? 'Housekeeping & Custodial' : 'ITSM / Technology Support'),
        location: pm.location || 'Centennial Campus',
        building: pm.location || 'Centennial Campus',
        room: pm.room || 'General',
        roomLocation: pm.room || 'General',
        assetType: pm.assetType || 'Preventive Maintenance',
        assetTag: `PM-${pm.frequency?.toUpperCase() || 'SCHED'}`,
        selectedIssue: pm.title,
        title: pm.title,
        description: pm.description || `${pm.frequency} Preventive Maintenance Work Order`,
        urgency: pm.urgency || 'medium',
        isPreventiveMaintenance: true,
        pmFrequency: pm.frequency || 'Monthly',
        createdByEmail: user?.email || 'pm-scheduler@wcatrojans.org',
        createdByName: user?.displayName || 'PM Scheduler',
        createdById: user?.uid || 'pm-system'
      }, []);
    } catch (err) {
      console.error('Error spawning PM ticket:', err);
      alert('Failed to spawn PM ticket.');
    } finally {
      setSpawningPmId(null);
    }
  };

  const handleAddPmSchedule = async (e) => {
    e.preventDefault();
    if (!newPmTitle.trim()) return;
    const areaNameMap = {
      facilities: 'Facilities & Maintenance',
      housekeeping: 'Housekeeping & Custodial',
      itsm: 'ITSM / Technology Support'
    };
    const newItem = {
      id: `pm-${Date.now()}`,
      areaId: newPmAreaId,
      areaName: areaNameMap[newPmAreaId] || 'Facilities & Maintenance',
      title: newPmTitle.trim().startsWith('PM:') ? newPmTitle.trim() : `PM: ${newPmTitle.trim()}`,
      frequency: newPmFrequency,
      location: newPmLocation,
      room: newPmRoom.trim() || 'General',
      assetType: 'Preventive Maintenance',
      urgency: 'medium',
      description: `${newPmFrequency} Preventive Maintenance task at ${newPmLocation} (${newPmRoom.trim() || 'General'}).`
    };
    const updatedList = [...pmSchedules, newItem];
    const updatedCatalog = { ...catalog, pmSchedules: updatedList };
    if (onCatalogUpdate) onCatalogUpdate(updatedCatalog);
    try {
      await saveCatalogSettings(updatedCatalog);
      setNewPmTitle('');
    } catch (err) {
      console.error('Error saving PM schedule:', err);
    }
  };

  const handleDeletePmSchedule = async (pmId) => {
    const updatedList = pmSchedules.filter((item) => item.id !== pmId);
    const updatedCatalog = { ...catalog, pmSchedules: updatedList };
    if (onCatalogUpdate) onCatalogUpdate(updatedCatalog);
    try {
      await saveCatalogSettings(updatedCatalog);
    } catch (err) {
      console.error('Error deleting PM schedule:', err);
    }
  };

  // QR Room & Equipment Sticker Deep-Link Builder
  const selectedQrPlace = placesList.find((p) => p.id === qrPlaceId) || placesList[0];
  const qrRoomsForPlace = selectedQrPlace?.rooms?.length > 0 ? selectedQrPlace.rooms : ['Gymnasium', 'Cafeteria', 'Restrooms', 'Main Office', 'Room 101'];
  const qrOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://wca-tickets-58f6c.web.app';
  const qrDeepLinkUrl = `${qrOrigin}/?area=${encodeURIComponent(qrAreaId)}&campus=${encodeURIComponent(selectedQrPlace?.id || 'centennial')}&room=${encodeURIComponent(qrRoom)}${qrAssetTag.trim() ? `&tag=${encodeURIComponent(qrAssetTag.trim())}` : ''}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(qrDeepLinkUrl)}`;

  const handleCopyQrLink = () => {
    navigator.clipboard?.writeText(qrDeepLinkUrl);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2500);
  };

  const userEmailLower = (user?.email || '').toLowerCase().trim();
  const userUid = user?.uid;

  // Counts for My Tickets subtabs
  const assignedToMeCount = tickets.filter((t) => {
    const assignedEmail = (t.assignedToEmail || '').toLowerCase().trim();
    const assignedUid = t.assignedToUid || t.assignedTo?.uid;
    return (userEmailLower && assignedEmail === userEmailLower) || (userUid && assignedUid === userUid);
  }).length;

  const submittedByMeCount = tickets.filter((t) => {
    const creatorEmail = (t.createdByEmail || t.requester?.email || '').toLowerCase().trim();
    const creatorUid = t.createdById || t.userId || t.requester?.uid;
    return (userEmailLower && creatorEmail === userEmailLower) || (userUid && creatorUid === userUid);
  }).length;

  // Department counts
  const counts = {
    all: tickets.length,
    facilities: tickets.filter((t) => t.areaId === 'facilities').length,
    housekeeping: tickets.filter((t) => t.areaId === 'housekeeping').length,
    itsm: tickets.filter((t) => t.areaId === 'itsm').length,
    emergency: tickets.filter((t) => t.urgency === 'emergency' && t.status !== 'resolved' && t.status !== 'closed').length
  };

  // Department-scoped tickets for KPI cards (Incident IQ style)
  const deptTickets = useMemo(() => {
    return tickets.filter((t) => selectedArea === 'all' || t.areaId === selectedArea);
  }, [tickets, selectedArea]);

  const kpiData = useMemo(() => {
    const active = deptTickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed');
    const resolved = deptTickets.filter((t) => t.status === 'resolved' || t.status === 'closed');

    const countByPriority = (items) => {
      const countsMap = { critical: 0, high: 0, medium: 0, low: 0 };
      items.forEach((t) => {
        const key = getUrgencyKey(t.urgency);
        countsMap[key] = (countsMap[key] || 0) + 1;
      });
      return countsMap;
    };

    const assignedToMe = active.filter(
      (t) => (t.assignedToEmail || '').toLowerCase() === userEmailLower
    );
    const assignedToOthers = active.filter(
      (t) => t.assignedToEmail && (t.assignedToEmail || '').toLowerCase() !== userEmailLower
    );
    const unassigned = active.filter((t) => !t.assignedToEmail);

    const todayResolved = resolved.filter((t) => isToday(t.updatedAt || t.createdAt));
    const thisWeekResolved = resolved.filter((t) => isThisWeek(t.updatedAt || t.createdAt));

    return {
      assignedToMe: {
        total: assignedToMe.length,
        breakdown: countByPriority(assignedToMe)
      },
      assignedToOthers: {
        total: assignedToOthers.length,
        breakdown: countByPriority(assignedToOthers)
      },
      unassigned: {
        total: unassigned.length,
        breakdown: countByPriority(unassigned)
      },
      resolved: {
        today: todayResolved.length,
        thisWeek: thisWeekResolved.length,
        total: resolved.length
      }
    };
  }, [deptTickets, userEmailLower]);

  // Extract recent activities from ticket histories for the live notification stream
  const recentActivities = useMemo(() => {
    const list = [];
    deptTickets.forEach((t) => {
      if (t.statusHistory && Array.isArray(t.statusHistory)) {
        t.statusHistory.forEach((hist) => {
          list.push({
            ticket: t,
            timestamp: hist.timestamp || t.createdAt,
            updatedBy: hist.updatedBy || 'Staff Member',
            note: hist.note,
            status: hist.status
          });
        });
      } else {
        list.push({
          ticket: t,
          timestamp: t.createdAt,
          updatedBy: t.createdByName || t.createdByEmail || 'Requester',
          note: 'Ticket submitted',
          status: t.status || 'new'
        });
      }
    });

    return list
      .sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 15);
  }, [deptTickets]);

  // Filter tickets for main list
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filterByMyTickets) {
        if (!user) return false;

        const ticketEmail = (t.createdByEmail || t.requester?.email || '').toLowerCase().trim();
        const creatorUid = t.createdById || t.userId || t.requester?.uid;
        const isSubmitted = (userEmailLower && ticketEmail === userEmailLower) || (userUid && creatorUid === userUid);

        const assignedEmail = (t.assignedToEmail || '').toLowerCase().trim();
        const assignedUid = t.assignedToUid || t.assignedTo?.uid;
        const isAssigned = (userEmailLower && assignedEmail === userEmailLower) || (userUid && assignedUid === userUid);

        if (role !== 'requester') {
          if (myTicketsSubTab === 'assigned' && !isAssigned) return false;
          if (myTicketsSubTab === 'submitted' && !isSubmitted) return false;
          if (myTicketsSubTab === 'all' && !isAssigned && !isSubmitted) return false;
        } else {
          if (!isSubmitted) return false;
        }
      }

      // Department filter is ONLY applied in normal Ticket Queue view, NOT in My Tickets
      if (!filterByMyTickets) {
        const ticketArea = t.areaId || t.department;
        if (selectedArea !== 'all' && ticketArea !== selectedArea) {
          return false;
        }
      }

      if (selectedStatus !== 'all' && t.status !== selectedStatus) {
        return false;
      }

      // KPI interactive filter
      if (!filterByMyTickets) {
        if (kpiFilter === 'assigned_to_me') {
          if ((t.assignedToEmail || '').toLowerCase() !== userEmailLower || t.status === 'resolved' || t.status === 'closed') {
            return false;
          }
        } else if (kpiFilter === 'assigned_to_others') {
          if (!t.assignedToEmail || (t.assignedToEmail || '').toLowerCase() === userEmailLower || t.status === 'resolved' || t.status === 'closed') {
            return false;
          }
        } else if (kpiFilter === 'unassigned') {
          if (t.assignedToEmail || t.status === 'resolved' || t.status === 'closed') {
            return false;
          }
        } else if (kpiFilter === 'resolved') {
          if (t.status !== 'resolved' && t.status !== 'closed') {
            return false;
          }
        }

        if (priorityFilter !== 'all') {
          if (getUrgencyKey(t.urgency) !== priorityFilter) {
            return false;
          }
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = (t.ticketNumber || '').toLowerCase().includes(q);
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchRoom = (t.roomLocation || t.room || '').toLowerCase().includes(q);
        const matchBuilding = (t.location || t.building || '').toLowerCase().includes(q);
        const matchUser = (t.createdByName || t.createdByEmail || '').toLowerCase().includes(q);
        const matchAsset = (t.assetType || t.assetTag || '').toLowerCase().includes(q);
        const matchAssignee = (t.assignedToName || t.assignedToEmail || '').toLowerCase().includes(q);
        return matchNum || matchTitle || matchDesc || matchRoom || matchBuilding || matchUser || matchAsset || matchAssignee;
      }
      return true;
    }).sort((a, b) => {
      // Prioritize highest priority first (Incident IQ style)
      const priorityRank = { critical: 4, high: 3, medium: 2, low: 1 };
      const rankA = priorityRank[getUrgencyKey(a.urgency)] || 2;
      const rankB = priorityRank[getUrgencyKey(b.urgency)] || 2;
      if (rankB !== rankA) return rankB - rankA;
      const dateA = new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [tickets, filterByMyTickets, user, userEmailLower, userUid, role, myTicketsSubTab, selectedArea, selectedStatus, kpiFilter, priorityFilter, searchQuery]);

  const handleToggleKpiFilter = (filterType) => {
    if (kpiFilter === filterType && priorityFilter === 'all') {
      setKpiFilter('all');
    } else {
      setKpiFilter(filterType);
      setPriorityFilter('all');
    }
  };

  const handleKpiPillClick = (filterType, priority) => {
    setKpiFilter(filterType);
    setPriorityFilter(priority);
  };

  const kpiFilterLabels = {
    assigned_to_me: 'Assigned to Me',
    assigned_to_others: 'Assigned to Others',
    unassigned: 'Unassigned Queue',
    resolved: 'Resolved by Team'
  };

  const getAreaLabel = () => {
    if (selectedArea === 'itsm') return 'ITSM / Technology Support';
    if (selectedArea === 'facilities') return 'Facilities & Maintenance';
    if (selectedArea === 'housekeeping') return 'Housekeeping & Custodial';
    return 'All District Departments';
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Metrics Row (Department Switcher) */}
      {!filterByMyTickets && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div 
            onClick={() => { setSelectedArea('all'); setKpiFilter('all'); setPriorityFilter('all'); }}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedArea === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
            }`}
          >
            <div className="text-xs font-semibold opacity-75">All Tickets</div>
            <div className="text-2xl font-extrabold mt-1">{counts.all}</div>
          </div>

          <div 
            onClick={() => { setSelectedArea('facilities'); setKpiFilter('all'); setPriorityFilter('all'); }}
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
            onClick={() => { setSelectedArea('housekeeping'); setKpiFilter('all'); setPriorityFilter('all'); }}
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
            onClick={() => { setSelectedArea('itsm'); setKpiFilter('all'); setPriorityFilter('all'); }}
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

          <div 
            onClick={() => { setSelectedArea('all'); setSelectedStatus('all'); setPriorityFilter('critical'); }}
            className="col-span-2 sm:col-span-1 p-4 rounded-xl border bg-red-50 border-red-200 text-red-900 cursor-pointer hover:bg-red-100 transition-colors"
          >
            <div className="text-xs font-semibold flex items-center gap-1.5 text-red-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Active Emergencies</span>
            </div>
            <div className="text-2xl font-extrabold mt-1 text-red-700">{counts.emergency}</div>
          </div>
        </div>
      )}

      {/* Incident IQ Style KPI Summary Grid */}
      {!filterByMyTickets && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Assigned to Me */}
          <div
            onClick={() => handleToggleKpiFilter('assigned_to_me')}
            className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer shadow-sm hover:shadow-md ${
              kpiFilter === 'assigned_to_me' 
                ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/20' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned to me</div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">{kpiData.assignedToMe.total}</span>
              <span className="text-xs text-slate-500 font-medium">tickets</span>
            </div>

            <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-slate-100 text-center">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleKpiPillClick('assigned_to_me', 'critical'); }}
                className={`p-1 rounded-lg transition-all ${priorityFilter === 'critical' && kpiFilter === 'assigned_to_me' ? 'ring-2 ring-red-600 bg-red-50' : 'hover:bg-slate-50'}`}
              >
                <div className="text-[10px] font-semibold text-slate-400">Critical</div>
                <div className="mt-0.5 inline-block text-[11px] font-extrabold px-1.5 py-0.2 rounded-full bg-red-600 text-white min-w-[20px]">
                  {kpiData.assignedToMe.breakdown.critical}
                </div>
              </button>

              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleKpiPillClick('assigned_to_me', 'high'); }}
                className={`p-1 rounded-lg transition-all ${priorityFilter === 'high' && kpiFilter === 'assigned_to_me' ? 'ring-2 ring-orange-500 bg-orange-50' : 'hover:bg-slate-50'}`}
              >
                <div className="text-[10px] font-semibold text-slate-400">High</div>
                <div className="mt-0.5 inline-block text-[11px] font-extrabold px-1.5 py-0.2 rounded-full bg-orange-500 text-white min-w-[20px]">
                  {kpiData.assignedToMe.breakdown.high}
                </div>
              </button>

              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleKpiPillClick('assigned_to_me', 'medium'); }}
                className={`p-1 rounded-lg transition-all ${priorityFilter === 'medium' && kpiFilter === 'assigned_to_me' ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:bg-slate-50'}`}
              >
                <div className="text-[10px] font-semibold text-slate-400">Medium</div>
                <div className="mt-0.5 inline-block text-[11px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 min-w-[20px]">
                  {kpiData.assignedToMe.breakdown.medium}
                </div>
              </button>

              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleKpiPillClick('assigned_to_me', 'low'); }}
                className={`p-1 rounded-lg transition-all ${priorityFilter === 'low' && kpiFilter === 'assigned_to_me' ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'hover:bg-slate-50'}`}
              >
                <div className="text-[10px] font-semibold text-slate-400">Low</div>
                <div className="mt-0.5 inline-block text-[11px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-500 text-white min-w-[20px]">
                  {kpiData.assignedToMe.breakdown.low}
                </div>
              </button>
            </div>
          </div>

          {/* Card 2: Assigned to Others */}
          <div
            onClick={() => handleToggleKpiFilter('assigned_to_others')}
            className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer shadow-sm hover:shadow-md ${
              kpiFilter === 'assigned_to_others' 
                ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/20' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned to others</div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">{kpiData.assignedToOthers.total}</span>
              <span className="text-xs text-slate-500 font-medium">tickets</span>
            </div>

            <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-slate-100 text-center">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleKpiPillClick('assigned_to_others', 'critical'); }}
                className={`p-1 rounded-lg transition-all ${priorityFilter === 'critical' && kpiFilter === 'assigned_to_others' ? 'ring-2 ring-red-600 bg-red-50' : 'hover:bg-slate-50'}`}
              >
                <div className="text-[10px] font-semibold text-slate-400">Critical</div>
                <div className="mt-0.5 inline-block text-[11px] font-extrabold px-1.5 py-0.2 rounded-full bg-red-600 text-white min-w-[20px]">
                  {kpiData.assignedToOthers.breakdown.critical}
                </div>
              </button>

              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleKpiPillClick('assigned_to_others', 'high'); }}
                className={`p-1 rounded-lg transition-all ${priorityFilter === 'high' && kpiFilter === 'assigned_to_others' ? 'ring-2 ring-orange-500 bg-orange-50' : 'hover:bg-slate-50'}`}
              >
                <div className="text-[10px] font-semibold text-slate-400">High</div>
                <div className="mt-0.5 inline-block text-[11px] font-extrabold px-1.5 py-0.2 rounded-full bg-orange-500 text-white min-w-[20px]">
                  {kpiData.assignedToOthers.breakdown.high}
                </div>
              </button>

              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleKpiPillClick('assigned_to_others', 'medium'); }}
                className={`p-1 rounded-lg transition-all ${priorityFilter === 'medium' && kpiFilter === 'assigned_to_others' ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:bg-slate-50'}`}
              >
                <div className="text-[10px] font-semibold text-slate-400">Medium</div>
                <div className="mt-0.5 inline-block text-[11px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 min-w-[20px]">
                  {kpiData.assignedToOthers.breakdown.medium}
                </div>
              </button>

              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleKpiPillClick('assigned_to_others', 'low'); }}
                className={`p-1 rounded-lg transition-all ${priorityFilter === 'low' && kpiFilter === 'assigned_to_others' ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'hover:bg-slate-50'}`}
              >
                <div className="text-[10px] font-semibold text-slate-400">Low</div>
                <div className="mt-0.5 inline-block text-[11px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-500 text-white min-w-[20px]">
                  {kpiData.assignedToOthers.breakdown.low}
                </div>
              </button>
            </div>
          </div>

          {/* Card 3: Unassigned */}
          <div
            onClick={() => handleToggleKpiFilter('unassigned')}
            className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer shadow-sm hover:shadow-md ${
              kpiFilter === 'unassigned' 
                ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/20' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unassigned</div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">{kpiData.unassigned.total}</span>
              <span className="text-xs text-slate-500 font-medium">tickets</span>
            </div>

            <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-slate-100 text-center">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleKpiPillClick('unassigned', 'critical'); }}
                className={`p-1 rounded-lg transition-all ${priorityFilter === 'critical' && kpiFilter === 'unassigned' ? 'ring-2 ring-red-600 bg-red-50' : 'hover:bg-slate-50'}`}
              >
                <div className="text-[10px] font-semibold text-slate-400">Critical</div>
                <div className="mt-0.5 inline-block text-[11px] font-extrabold px-1.5 py-0.2 rounded-full bg-red-600 text-white min-w-[20px]">
                  {kpiData.unassigned.breakdown.critical}
                </div>
              </button>

              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleKpiPillClick('unassigned', 'high'); }}
                className={`p-1 rounded-lg transition-all ${priorityFilter === 'high' && kpiFilter === 'unassigned' ? 'ring-2 ring-orange-500 bg-orange-50' : 'hover:bg-slate-50'}`}
              >
                <div className="text-[10px] font-semibold text-slate-400">High</div>
                <div className="mt-0.5 inline-block text-[11px] font-extrabold px-1.5 py-0.2 rounded-full bg-orange-500 text-white min-w-[20px]">
                  {kpiData.unassigned.breakdown.high}
                </div>
              </button>

              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleKpiPillClick('unassigned', 'medium'); }}
                className={`p-1 rounded-lg transition-all ${priorityFilter === 'medium' && kpiFilter === 'unassigned' ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:bg-slate-50'}`}
              >
                <div className="text-[10px] font-semibold text-slate-400">Medium</div>
                <div className="mt-0.5 inline-block text-[11px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 min-w-[20px]">
                  {kpiData.unassigned.breakdown.medium}
                </div>
              </button>

              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleKpiPillClick('unassigned', 'low'); }}
                className={`p-1 rounded-lg transition-all ${priorityFilter === 'low' && kpiFilter === 'unassigned' ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'hover:bg-slate-50'}`}
              >
                <div className="text-[10px] font-semibold text-slate-400">Low</div>
                <div className="mt-0.5 inline-block text-[11px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-500 text-white min-w-[20px]">
                  {kpiData.unassigned.breakdown.low}
                </div>
              </button>
            </div>
          </div>

          {/* Card 4: Resolved */}
          <div
            onClick={() => handleToggleKpiFilter('resolved')}
            className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer shadow-sm hover:shadow-md ${
              kpiFilter === 'resolved' 
                ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/20' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resolved by team</div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">{kpiData.resolved.today}</span>
              <span className="text-xs text-slate-500 font-medium">today</span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-slate-800">{kpiData.resolved.thisWeek}</span>
                <span className="text-[11px]">this week</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-slate-800">{kpiData.resolved.total}</span>
                <span className="text-[11px]">total</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Title Header for My Tickets */}
      {filterByMyTickets && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              {role !== 'requester' ? 'My Assigned & Submitted Tickets' : 'My Submitted Tickets'}
            </h2>
            <p className="text-sm text-slate-600">
              {role !== 'requester' 
                ? 'Quickly view tickets assigned to your technician queue or requests you submitted.' 
                : 'Track status updates and communication from technicians on your requests.'}
            </p>
          </div>

          {/* Sub-tabs for Staff / Technicians */}
          {role !== 'requester' && (
            <div className="inline-flex rounded-xl bg-slate-200/80 p-1 border border-slate-300 self-start sm:self-auto shadow-inner">
              <button
                onClick={() => setMyTicketsSubTab('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  myTicketsSubTab === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-1 ring-amber-400'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/50'
                }`}
              >
                All Tickets ({assignedToMeCount + submittedByMeCount})
              </button>
              <button
                onClick={() => setMyTicketsSubTab('assigned')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  myTicketsSubTab === 'assigned'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-1 ring-amber-400'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assigned to Me ({assignedToMeCount})</span>
              </button>
              <button
                onClick={() => setMyTicketsSubTab('submitted')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  myTicketsSubTab === 'submitted'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-1 ring-amber-400'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Submitted by Me ({submittedByMeCount})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active KPI Filter Banner */}
      {!filterByMyTickets && (kpiFilter !== 'all' || priorityFilter !== 'all') && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-600" />
            <span>
              Active Filter: <strong>{kpiFilterLabels[kpiFilter] || kpiFilter}</strong>
              {priorityFilter !== 'all' && <> • Priority: <strong className="uppercase">{priorityFilter}</strong></>}
              {' '}({filteredTickets.length} tickets matching)
            </span>
          </div>
          <button
            onClick={() => { setKpiFilter('all'); setPriorityFilter('all'); }}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* Section Header with Queue Title and Action Toolbar */}
      {!filterByMyTickets && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">Highest Priority Tickets</h3>
            <p className="text-xs text-slate-500">Your prioritized queue in {getAreaLabel()}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {!isRequester && (
              <>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-xs flex items-center gap-1.5 transition-all"
                  title="Print Scan-to-Report QR Code Room & Equipment Stickers"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  <span>QR Room Stickers</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPmModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-xs flex items-center gap-1.5 transition-all"
                  title="Manage & Spawn Recurring Preventive Maintenance Work Orders"
                >
                  <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                  <span>PM Schedules</span>
                </button>
              </>
            )}
            {onNewTicket && (
              <button
                onClick={() => onNewTicket(selectedArea)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 transition-all hover:shadow"
              >
                <Plus className="w-4 h-4" />
                <span>NEW TICKET</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search tickets, rooms, assets, staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium bg-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="scheduled_break">Scheduled for Break / Summer</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium bg-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical (100)</option>
            <option value="high">High (75)</option>
            <option value="medium">Medium (50)</option>
            <option value="low">Low (25)</option>
          </select>
        </div>
      </div>

      {/* Main Content Layout: Priority Queue (Left) & Notifications (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ticket List (Left Column) - Stays full width and never squished */}
        <div className="lg:col-span-8 space-y-3">
          {filterByMyTickets && !user ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm space-y-4">
              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <User className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-black text-slate-900">Sign in to View Your Tickets</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Please sign in with your Wesleyan Christian Academy Google account to track your submitted requests and assigned tickets.
                </p>
              </div>
              <button
                onClick={() => signInWithGoogle().catch((err) => console.error(err))}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black rounded-xl shadow-md transition-all cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Sign In with Google</span>
              </button>
            </div>
          ) : loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading support queue...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                {filterByMyTickets ? 'No Tickets Found for Your Account' : 'No Tickets Found'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {filterByMyTickets
                  ? myTicketsSubTab === 'assigned'
                    ? 'You currently have no tickets assigned to you.'
                    : myTicketsSubTab === 'submitted'
                    ? "You haven't submitted any tickets yet."
                    : 'You have no tickets submitted by or assigned to your account.'
                  : 'There are no tickets matching your current department or priority filters.'}
              </p>
              {filterByMyTickets && onNewTicket && (
                <button
                  onClick={onNewTicket}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Submit a New Ticket</span>
                </button>
              )}
              {!filterByMyTickets && (kpiFilter !== 'all' || priorityFilter !== 'all' || selectedStatus !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setKpiFilter('all');
                    setPriorityFilter('all');
                    setSelectedStatus('all');
                    setSearchQuery('');
                  }}
                  className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors"
                >
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              const isEmergency = ticket.urgency === 'emergency' || ticket.urgency === 'critical';
              const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.new;
              const priorityMeta = getPriorityMeta(ticket.urgency);
              const AssetIcon = getAssetCategoryIcon(ticket.assetType, ticket.title, ticket.areaId);
              const userCanModifyRow = canModify(ticket.areaId);
              const isResolvedOrClosed = ticket.status === 'resolved' || ticket.status === 'closed';

              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`bg-white rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer hover:shadow-md ${
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-400/40 shadow-sm'
                      : isEmergency
                        ? 'border-red-300 bg-red-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Icon & Title info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        ticket.areaId === 'facilities'
                          ? 'bg-amber-100 text-amber-700'
                          : ticket.areaId === 'housekeeping'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}>
                        <AssetIcon className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
                          <span>{ticket.assetType || ticket.assetCategory || 'Support'}</span>
                          <span>&gt;</span>
                          <span className="text-slate-700 font-semibold">{ticket.selectedIssue || 'General Issue'}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 truncate hover:text-amber-600 transition-colors">
                          {ticket.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 flex-wrap">
                          <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            {ticket.ticketNumber || (ticket.id ? `#${ticket.id.slice(-6)}` : '#TICK')}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot || 'bg-slate-400'}`} />
                            <span className="text-slate-600 font-medium">{status.label}</span>
                          </span>
                          <span>•</span>
                          <span>{formatRelativeTime(ticket.updatedAt || ticket.createdAt)}</span>
                          {ticket.assignedToName && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-700 font-medium bg-indigo-50 px-1.5 py-0.2 rounded flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                <span>{ticket.assignedToName}</span>
                              </span>
                            </>
                          )}
                          {ticket.poNumber && (
                            <span className="text-amber-800 font-bold bg-amber-100/80 border border-amber-200 px-1.5 py-0.2 rounded">
                              PO: {ticket.poNumber}
                            </span>
                          )}
                          {ticket.loanerTag && (
                            <span className={`font-bold px-1.5 py-0.2 rounded border ${ticket.loanerReturned ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                              💻 Loaner: {ticket.loanerTag}{ticket.loanerReturned ? ' (Returned)' : ''}
                            </span>
                          )}
                        </div>

                        {/* Housekeeping Supply Badges on Row */}
                        {ticket.suppliesNeeded && ticket.suppliesNeeded.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {ticket.suppliesNeeded.map((sup) => (
                              <span key={sup} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {sup}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: 1-Tap Mobile Actions, Priority Score Pill & Requester Info */}
                    <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
                      {/* 1-Tap Claim & Quick Resolve for Technicians / Custodians */}
                      {userCanModifyRow && !isResolvedOrClosed && (
                        <div className="flex items-center gap-1">
                          {!ticket.assignedToEmail && user && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={(e) => handleQuickClaimTicket(e, ticket)}
                              title="1-Tap Claim: Assign this ticket to me"
                              className="px-2 py-1 rounded-lg text-[11px] font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                            >
                              Claim
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={(e) => handleQuickResolveRow(e, ticket)}
                            title="1-Tap Quick Resolve"
                            className="px-2 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span className="hidden md:inline">Resolve</span>
                          </button>
                        </div>
                      )}

                      {/* Priority Pill */}
                      <div className="text-center">
                        <span className={`inline-block font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg ${priorityMeta.pillBg} shadow-sm`} title={`Priority: ${priorityMeta.label}`}>
                          {priorityMeta.score}
                        </span>
                      </div>

                      {/* Requester Avatar & Info */}
                      <div className="hidden sm:flex items-center gap-2 text-right min-w-[120px] justify-end">
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[110px]">
                            {ticket.createdByName || ticket.requester?.name || 'Requester'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]">
                            {ticket.location || ticket.building || 'Inbound'} • {ticket.room || ticket.roomLocation || 'General'}
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-amber-400 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-slate-700 shadow-inner">
                          {getInitials(ticket.createdByName || ticket.requester?.name || ticket.createdByEmail)}
                        </div>
                      </div>

                      {/* Quick Print Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintTicket(ticket);
                        }}
                        title="Print Work Order / Ticket"
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Printer className="w-4 h-4 text-slate-500 hover:text-amber-600" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Incident IQ "Your Notifications / Recent Activity" Feed (Always Visible in Grid) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 sticky top-20">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Your Notifications</h3>
                <p className="text-[11px] text-slate-500">Live ticket updates & technician activity</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Live
            </span>
          </div>

          {recentActivities.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No recent activity in this department.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
              {recentActivities.map((act, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedTicket(act.ticket)}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-amber-50/40 hover:border-amber-200 transition-all cursor-pointer text-xs space-y-1 group"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-800 group-hover:text-amber-700 transition-colors">
                      {act.updatedBy}
                    </span>
                    <span>{formatRelativeTime(act.timestamp)}</span>
                  </div>
                  <div className="text-slate-700 font-medium line-clamp-2">
                    {act.note || `Status changed to ${STATUS_CONFIG[act.status]?.label || act.status}`}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono pt-1">
                    <span className="font-bold text-amber-600">
                      {act.ticket.ticketNumber || (act.ticket.id ? `#${act.ticket.id.slice(-6)}` : '#TICK')}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[180px]">{act.ticket.title}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Incident IQ Style Slide-Out Ticket Detail Drawer (Rolls out from the side, full comfortable view) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          {/* Backdrop Blur Overlay */}
          <div 
            onClick={() => setSelectedTicket(null)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div 
              id="ticket-detail-panel"
              className="pointer-events-auto w-screen max-w-2xl lg:max-w-3xl xl:max-w-4xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right h-full overflow-hidden"
            >
              {/* Sticky Top Bar with Close Button, Ticket Number, Category & Admin Delete */}
              <div className="bg-[#0b1c2d] text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded">
                    {selectedTicket.ticketNumber || (selectedTicket.id ? `TICK-${selectedTicket.id.slice(-6)}` : 'TICK')}
                  </span>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider hidden sm:inline">
                    {selectedTicket.area || selectedTicket.category || 'Ticket Detail'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintTicket(selectedTicket)}
                    title="Print Work Order / Ticket Summary"
                    className="px-2.5 py-1.5 text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 font-bold text-xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Print</span>
                  </button>
                  {role === 'admin' && (
                    <button
                      onClick={handleDeleteSelectedTicket}
                      title="Permanently Delete Ticket (Admin Only)"
                      className="px-2.5 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedTicket(null)}
                    title="Close Ticket View (Esc)"
                    className="px-2.5 py-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 font-bold text-xs"
                  >
                    <span className="hidden sm:inline text-slate-400 font-mono text-[11px]">ESC</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Drawer Body Content */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 leading-tight">
                    {selectedTicket.title}
                  </h3>
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>Submitted by <strong className="text-slate-700">{selectedTicket.createdByName || selectedTicket.requester?.name || selectedTicket.createdByEmail}</strong></span>
                      <span>•</span>
                      <span>{formatRelativeTime(selectedTicket.createdAt)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePrintTicket(selectedTicket)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-bold transition-colors"
                      title="Print this Ticket / Work Order"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-600" />
                      <span>Print Work Order</span>
                    </button>
                  </div>
                </div>

            {/* Assign Technician Selector (Permitted Users Only) */}
            {canModify(selectedTicket.areaId) ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-500" />
                    <span>Assign Technician</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {user && (selectedTicket.assignedToEmail || '').toLowerCase() !== (user.email || '').toLowerCase() && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={(e) => handleQuickClaimTicket(e, selectedTicket)}
                        className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 rounded-full transition-colors"
                      >
                        + Claim Ticket (Assign to Me)
                      </button>
                    )}
                    {selectedTicket.assignedToEmail ? (
                      <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full">
                        Assigned
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                        Unassigned
                      </span>
                    )}
                  </div>
                </div>

                <select
                  value={selectedTicket.assignedToEmail || ''}
                  disabled={isUpdating}
                  onChange={(e) => handleAssignTicket(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">-- Unassigned (Department Queue) --</option>
                  {staffMembers.map((staff) => (
                    <option key={staff.id || staff.email} value={staff.email}>
                      {staff.displayName || staff.email} ({ROLES[staff.role]?.label || staff.role})
                    </option>
                  ))}
                </select>

                {selectedTicket.assignedToName && (
                  <p className="mt-2 text-[11px] text-slate-600 flex items-center gap-1">
                    <span>Handling technician:</span>
                    <strong className="text-slate-900">{selectedTicket.assignedToName}</strong>
                    <span className="text-slate-400">({selectedTicket.assignedToEmail})</span>
                  </p>
                )}
              </div>
            ) : selectedTicket.assignedToName ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Assigned Technician:</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>{selectedTicket.assignedToName}</span>
                </span>
              </div>
            ) : null}

            {/* Quick Status Update Selector (Permitted Users Only) */}
            {canModify(selectedTicket.areaId) ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Update Ticket Status
                  </label>
                  {!canClose(selectedTicket.areaId) && (
                    <span className="text-[10px] text-amber-600 font-medium">
                      (Closing restricted to assigned tech/admin)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const isActive = selectedTicket.status === key;
                    const isClosingRestricted = key === 'closed' && !canClose(selectedTicket.areaId);

                    return (
                      <button
                        key={key}
                        disabled={isUpdating || isClosingRestricted}
                        onClick={() => handleUpdateStatus(selectedTicket.id, key)}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center ${
                          isActive
                            ? `${cfg.badge} ring-2 ring-slate-900 shadow-sm`
                            : isClosingRestricted
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Current Status:</span>
                <span className={`px-2.5 py-1 rounded-full font-bold border ${STATUS_CONFIG[selectedTicket.status]?.badge}`}>
                  {STATUS_CONFIG[selectedTicket.status]?.label || selectedTicket.status}
                </span>
              </div>
            )}

            {/* Auto-Linked Submitter Fleet Device(s) from Inventory (IT & Staff View) */}
            {!isRequester && requesterFleetDevices.length > 0 && (
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-blue-600" />
                    <span>Submitter&apos;s Assigned Fleet Device ({requesterFleetDevices.length})</span>
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    Auto-Linked from Inventory
                  </span>
                </div>
                <div className="space-y-2">
                  {requesterFleetDevices.map((dev) => {
                    const serialClean = (dev.serial || '').trim();
                    const isLenovo = (dev.vendor || dev.name || '').toLowerCase().includes('lenovo');
                    return (
                      <div key={dev.id || dev.serial} className="p-3 bg-white rounded-xl border border-blue-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                            <span>{dev.name}</span>
                            {dev.tag && <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">{dev.tag}</span>}
                            {dev.warrantyStatus && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                dev.warrantyStatus === 'In Warranty'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                <ShieldCheck className="w-3 h-3 inline mr-0.5" />
                                {dev.warrantyStatus}{dev.warrantyEndDate ? ` (exp. ${dev.warrantyEndDate})` : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span>Serial: <strong className="font-mono text-slate-900">{serialClean || 'N/A'}</strong></span>
                            {dev.purchaseDate && <span>Purchased: <strong>{dev.purchaseDate}</strong></span>}
                            {dev.replacementDate && <span>5-Yr Replace: <strong className="text-amber-700">{dev.replacementDate}</strong></span>}
                          </div>
                          {dev.specs && (
                            <div className="text-[11px] text-slate-500 truncate max-w-xl">{dev.specs}</div>
                          )}
                        </div>
                        {serialClean && isLenovo && (
                          <a
                            href={`https://pcsupport.lenovo.com/us/en/Search?query=${encodeURIComponent(serialClean)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shrink-0 self-start sm:self-center"
                          >
                            <span>Lenovo Support</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Housekeeping Supplies Requested Banner (if any) */}
            {selectedTicket.suppliesNeeded && selectedTicket.suppliesNeeded.length > 0 && (
              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Supplies Requested for Restock</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTicket.suppliesNeeded.map((sup) => (
                    <span key={sup} className="px-2.5 py-1 rounded-lg bg-white text-emerald-900 border border-emerald-300 text-xs font-bold shadow-2xs">
                      {sup}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Maintenance Logistics: PO #, Parts Cost & IT Loaner Tracker (Staff/Techs) */}
            {canModify(selectedTicket.areaId) && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>
                      {selectedTicket.areaId === 'itsm'
                        ? 'IT Loaner Device & Repair Logistics (PO # / Cost)'
                        : 'Maintenance Logistics, Parts Used & WCA PO #'}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={savingLogistics}
                    onClick={handleSaveLogistics}
                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-2xs transition-colors disabled:opacity-50"
                  >
                    {savingLogistics ? 'Saving...' : 'Save Logistics'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">WCA PO # / Invoice</label>
                    <input
                      type="text"
                      placeholder="e.g. PO #000142"
                      value={poNumberInput}
                      onChange={(e) => setPoNumberInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Est. Parts / Service Cost ($)</label>
                    <input
                      type="text"
                      placeholder="e.g. 145.00"
                      value={costInput}
                      onChange={(e) => setCostInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Parts / Materials Used</label>
                    <input
                      type="text"
                      placeholder="e.g. 2x MERV-13 Filters, Ballast"
                      value={partsUsedInput}
                      onChange={(e) => setPartsUsedInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                    />
                  </div>
                </div>

                {selectedTicket.areaId === 'itsm' && (
                  <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-[11px] font-bold text-blue-800 whitespace-nowrap">💻 Loaner Device Tag:</span>
                      <input
                        type="text"
                        placeholder="e.g. LOANER-L13-02 or Serial #"
                        value={loanerTagInput}
                        onChange={(e) => setLoanerTagInput(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-semibold text-slate-800"
                      />
                    </div>
                    <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={loanerReturnedInput}
                        onChange={(e) => setLoanerReturnedInput(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Loaner Returned by User</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Ticket Info Details */}
            <div className="text-xs space-y-2 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Department:</span>
                <span className="font-semibold">{selectedTicket.areaName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Location:</span>
                <span className="font-semibold text-slate-800">{selectedTicket.location || selectedTicket.building}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Room / Facility:</span>
                <span className="font-semibold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {selectedTicket.room || selectedTicket.roomLocation}
                </span>
              </div>
              {selectedTicket.locationAddress && (
                <div className="flex justify-between py-1 border-b border-slate-100 text-[11px] text-slate-500">
                  <span>Address:</span>
                  <span className="text-slate-600">{selectedTicket.locationAddress}</span>
                </div>
              )}
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
              {selectedTicket.assignedToName && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Assigned To:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTicket.assignedToName} ({selectedTicket.assignedToEmail})
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Requester:</span>
                <span className="font-semibold">
                  {selectedTicket.createdByName || selectedTicket.requester?.name || selectedTicket.createdByEmail || selectedTicket.requester?.email || 'Staff Requester'} 
                  {' '}({selectedTicket.createdByEmail || selectedTicket.requester?.email || 'N/A'})
                </span>
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

            {/* Notification & Feedback Banner */}
            {commentSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between animate-fadeIn shadow-sm">
                <span>{commentSuccessMsg}</span>
                <button onClick={() => setCommentSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Conversation Thread & Activity Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                  <span>Activity &amp; Ticket Conversation</span>
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedTicket.comments?.length || 0} Comments
                </span>
              </div>

              {/* Thread History Box */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {/* Initial Submission Card */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-700">
                      {selectedTicket.createdByName || selectedTicket.requester?.name || 'Requester'} (Submitted)
                    </span>
                    <span>{formatRelativeTime(selectedTicket.createdAt)}</span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Ticket created in <strong>{selectedTicket.areaName}</strong> at <strong>{selectedTicket.location || selectedTicket.building}</strong> ({selectedTicket.room || selectedTicket.roomLocation}).
                  </div>
                </div>

                {/* Combined Comments & History */}
                {selectedTicket.comments && selectedTicket.comments
                  .filter((c) => !(isRequester && c.isInternal)) // Strict privacy: requesters never see internal notes
                  .map((c, idx) => (
                    <div
                      key={c.id || idx}
                      className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                        c.isInternal
                          ? 'bg-amber-50/70 border-amber-300 border-l-4 border-l-amber-500 shadow-sm'
                          : 'bg-white border-slate-200 border-l-4 border-l-blue-500 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${
                            c.isInternal ? 'bg-amber-200 text-amber-900' : 'bg-blue-100 text-blue-900'
                          }`}>
                            {getInitials(c.authorName || c.authorEmail)}
                          </div>
                          <span className="font-bold text-slate-800">{c.authorName}</span>
                          <span className="text-[10px] text-slate-400">({ROLES[c.authorRole]?.label || c.authorRole})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {c.isInternal ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[9px] bg-amber-100 text-amber-800 border border-amber-300">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Internal Tech Note</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Eye className="w-2.5 h-2.5" />
                              <span>Visible to Requester</span>
                            </span>
                          )}
                          <span className="text-slate-400 text-[10px]">{formatRelativeTime(c.createdAt)}</span>
                        </div>
                      </div>

                      <div className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {c.text}
                      </div>

                      {/* Comment Attachments */}
                      {c.attachments && c.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                          {c.attachments.map((att, aIdx) => (
                            <a
                              key={aIdx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] text-slate-700 font-medium transition-colors"
                            >
                              <Paperclip className="w-3 h-3 text-slate-500" />
                              <span className="truncate max-w-[140px]">{att.name}</span>
                              {att.size && <span className="text-[9px] text-slate-400">({att.size})</span>}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                {/* Status Milestones Log */}
                {selectedTicket.statusHistory && selectedTicket.statusHistory.map((item, idx) => (
                  <div key={`hist_${idx}`} className="p-2 rounded-lg bg-slate-50/80 border border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span className="font-medium text-slate-700 truncate max-w-[240px]">
                      🔄 {item.updatedBy}: {item.note || `Status updated to ${item.status}`}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatRelativeTime(item.timestamp)}</span>
                  </div>
                ))}
              </div>

              {/* Bidirectional Composer */}
              {/* Option A: Incident IQ Response & Technician Note Composer (Staff/Technicians/Admins) */}
              {!isRequester ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white mt-4">
                  {/* Incident IQ Header & Formatting Toolbar */}
                  <div className="bg-slate-50/80 border-b border-slate-200 px-3 py-2 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-slate-500">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      <div className="h-4 w-px bg-slate-200" />
                    </div>

                    <div className="flex items-center gap-1 text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleFormatText('bold')}
                        title="Bold (Ctrl+B)"
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 font-bold transition-colors"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormatText('italic')}
                        title="Italic (Ctrl+I)"
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 italic transition-colors"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormatText('underline')}
                        title="Underline"
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 underline transition-colors"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormatText('strikethrough')}
                        title="Strikethrough"
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 line-through transition-colors"
                      >
                        <Strikethrough className="w-3.5 h-3.5" />
                      </button>
                      <div className="h-4 w-px bg-slate-200 mx-1" />
                      <button
                        type="button"
                        onClick={() => handleFormatText('link')}
                        title="Insert Link"
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach Image / File"
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                      <div className="h-4 w-px bg-slate-200 mx-1" />
                      <button
                        type="button"
                        onClick={() => handleFormatText('numbered')}
                        title="Numbered List"
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormatText('bullet')}
                        title="Bulleted List"
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormatText('clear')}
                        title="Clear Formatting"
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-500 font-mono text-[10px] transition-colors"
                      >
                        T<sub className="text-[8px]">x</sub>
                      </button>
                    </div>
                  </div>

                  {/* 1-Click Canned Reply Chips (Tailored by Department) */}
                  <div className="px-3 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                      Quick Reply:
                    </span>
                    {(CANNED_REPLIES[selectedTicket.areaId] || CANNED_REPLIES.itsm).map((tpl) => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() => setCommentText((prev) => (prev ? `${prev}\n${tpl.text}` : tpl.text))}
                        className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-colors shadow-2xs"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>

                  {/* Main Textarea */}
                  <textarea
                    id="incidentiq-comment-textarea"
                    rows={4}
                    placeholder={
                      visibleToRequester
                        ? "Type a response visible to the requester (an automated email notification will be sent)..."
                        : "Type an internal technician note (Option 1: Notes for other technicians to see, hidden from requester)..."
                    }
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none resize-y min-h-[110px]"
                  />

                  {/* Attachment Chips Preview */}
                  {commentFiles.length > 0 && (
                    <div className="px-3.5 pb-2 flex flex-wrap gap-2">
                      {commentFiles.map((file, idx) => (
                        <div key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium">
                          <Paperclip className="w-3 h-3 text-amber-700" />
                          <span className="truncate max-w-[150px]">{file.name}</span>
                          <span className="text-[10px] text-amber-600">({(file.size / 1024).toFixed(0)} KB)</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCommentFile(idx)}
                            className="text-amber-700 hover:text-red-600 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Middle Controls Row: Browse & Incident IQ Toggle Switches */}
                  <div className="px-3.5 py-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/40">
                    {/* Browse Files Button */}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleCommentFileSelect}
                        multiple
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-md text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        <Paperclip className="w-3 h-3 text-slate-500" />
                        <span>BROWSE</span>
                      </button>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        or drag file(s) onto comment box above to attach
                      </span>
                    </div>

                    {/* Incident IQ Dual Toggles */}
                    <div className="flex flex-col gap-2 w-full sm:w-auto items-end">
                      {/* Toggle 1: Visible to requester (Option 2 vs Option 1) */}
                      <div
                        className="flex items-center gap-2.5 cursor-pointer select-none"
                        onClick={() => setVisibleToRequester(!visibleToRequester)}
                      >
                        <span className={`text-xs font-semibold ${visibleToRequester ? 'text-slate-800' : 'text-amber-800 font-bold'}`}>
                          {visibleToRequester ? 'Visible to requestor' : 'Notes for technicians only (Internal)'}
                        </span>
                        <div
                          className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                            visibleToRequester ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                              visibleToRequester ? 'translate-x-4.5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Toggle 2: Change to "Waiting on requester" */}
                      <div
                        className="flex items-center gap-2.5 cursor-pointer select-none"
                        onClick={() => setChangeToWaiting(!changeToWaiting)}
                      >
                        <span className="text-xs font-semibold text-slate-700">
                          Change to "Waiting on requestor"
                        </span>
                        <div
                          className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                            changeToWaiting ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                              changeToWaiting ? 'translate-x-4.5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Bar: Incident IQ Cancel & Add Comment Pill Button */}
                  <div className="px-3.5 py-2.5 border-t border-slate-200 flex items-center justify-between bg-white">
                    {/* Left subtle toolbar icons */}
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Settings className="w-3.5 h-3.5 hover:text-slate-600 cursor-pointer" />
                      <Clock className="w-3.5 h-3.5 hover:text-slate-600 cursor-pointer" />
                      <Circle className="w-3.5 h-3.5 hover:text-slate-600 cursor-pointer" />
                      <Plus className="w-3.5 h-3.5 hover:text-slate-600 cursor-pointer" />
                      <Edit3 className="w-3.5 h-3.5 hover:text-slate-600 cursor-pointer" />
                      <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                    </div>

                    {/* Right action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCommentText('');
                          setCommentFiles([]);
                          setChangeToWaiting(false);
                        }}
                        disabled={isPostingComment}
                        className="px-3 py-1.5 rounded-full border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                      >
                        ✕ CANCEL
                      </button>

                      <button
                        type="button"
                        onClick={handleAddComment}
                        disabled={isPostingComment || (!commentText.trim() && commentFiles.length === 0)}
                        className="px-4 py-1.5 rounded-full bg-[#0088ff] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isPostingComment ? 'Posting...' : 'ADD COMMENT'}</span>
                        <ChevronDown className="w-3 h-3 opacity-80" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Option B: Requester Reply Composer (Staff Submitter Experience) */
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Reply className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reply to Technician</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Response visible to support staff
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Provide additional details, answer the technician's question, or reply here..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />

                  {/* Attachment Chips */}
                  {commentFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {commentFiles.map((file, idx) => (
                        <div key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-900 rounded text-xs">
                          <Paperclip className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{file.name}</span>
                          <button type="button" onClick={() => handleRemoveCommentFile(idx)} className="text-blue-700 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleCommentFileSelect}
                        multiple
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-xs font-semibold text-slate-700 flex items-center gap-1"
                      >
                        <Paperclip className="w-3 h-3 text-slate-500" />
                        <span>Attach File</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleRequesterReply}
                      disabled={isPostingComment || (!commentText.trim() && commentFiles.length === 0)}
                      className="px-4 py-1.5 bg-[#0b1c2d] hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3 h-3 text-amber-400" />
                      <span>{isPostingComment ? 'Sending...' : 'Send Reply'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* --- PRINTABLE TICKET WORK ORDER (Hidden on screen, rendered exclusively when printing) --- */}
  {selectedTicket && (
    <div id="printable-ticket-content" className="hidden print:block font-sans text-slate-900 bg-white">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xl font-black uppercase tracking-tight text-slate-950">
              Wesleyan Christian Academy
            </div>
            <div className="text-sm font-bold text-slate-600">
              Service & Maintenance Helpdesk • Official Work Order Record
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Printed on {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-black text-slate-900">
              {selectedTicket.ticketNumber || (selectedTicket.id ? `TICK-${selectedTicket.id.slice(-6)}` : 'TICK')}
            </div>
            <div className="inline-block mt-1 px-2.5 py-0.5 border border-slate-900 font-extrabold uppercase text-xs tracking-wider">
              Status: {STATUS_CONFIG[selectedTicket.status]?.label || selectedTicket.status}
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Title */}
      <div className="mb-5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          Issue / Work Order Title
        </div>
        <div className="text-xl font-extrabold text-slate-900 border-b border-slate-200 pb-2">
          {selectedTicket.title}
        </div>
      </div>

      {/* Structured Data Grid */}
      <div className="grid grid-cols-2 gap-3.5 mb-6 text-xs border border-slate-300 rounded p-4 bg-slate-50/50 print-avoid-break">
        <div>
          <div className="font-bold text-slate-500 uppercase text-[10px]">Department</div>
          <div className="text-sm font-bold text-slate-900">{selectedTicket.area || selectedTicket.areaName || selectedTicket.areaId}</div>
        </div>
        <div>
          <div className="font-bold text-slate-500 uppercase text-[10px]">Priority / Urgency</div>
          <div className="text-sm font-bold text-slate-900 uppercase">{selectedTicket.urgency || 'Normal'}</div>
        </div>
        <div>
          <div className="font-bold text-slate-500 uppercase text-[10px]">Campus / Building</div>
          <div className="text-sm font-semibold text-slate-900">{selectedTicket.location || selectedTicket.building || 'General'}</div>
        </div>
        <div>
          <div className="font-bold text-slate-500 uppercase text-[10px]">Room / Facility Location</div>
          <div className="text-sm font-semibold text-slate-900">{selectedTicket.room || selectedTicket.roomLocation || 'General / Unspecified'}</div>
        </div>
        <div>
          <div className="font-bold text-slate-500 uppercase text-[10px]">Asset Category / Problem Type</div>
          <div className="text-sm font-semibold text-slate-900">{selectedTicket.assetType} &gt; {selectedTicket.selectedIssue || 'Standard'}</div>
        </div>
        <div>
          <div className="font-bold text-slate-500 uppercase text-[10px]">Asset Tag / Serial #</div>
          <div className="text-sm font-mono font-semibold text-slate-900">{selectedTicket.assetTag && selectedTicket.assetTag !== 'N/A' ? selectedTicket.assetTag : 'None / N/A'}</div>
        </div>
        <div>
          <div className="font-bold text-slate-500 uppercase text-[10px]">Submitted By (Requester)</div>
          <div className="text-sm font-semibold text-slate-900">
            {selectedTicket.createdByName || selectedTicket.requester?.name || selectedTicket.createdByEmail}
          </div>
          <div className="text-slate-600 text-[11px]">{selectedTicket.createdByEmail || selectedTicket.requester?.email}</div>
        </div>
        <div>
          <div className="font-bold text-slate-500 uppercase text-[10px]">Assigned Technician</div>
          <div className="text-sm font-semibold text-slate-900">
            {selectedTicket.assignedToName || 'Unassigned / General Queue'}
          </div>
          {selectedTicket.assignedToEmail && (
            <div className="text-slate-600 text-[11px]">{selectedTicket.assignedToEmail}</div>
          )}
        </div>
        <div>
          <div className="font-bold text-slate-500 uppercase text-[10px]">Date Submitted</div>
          <div className="text-sm font-semibold text-slate-900">
            {selectedTicket.createdAt?.toDate ? selectedTicket.createdAt.toDate().toLocaleString() : String(selectedTicket.createdAt || 'N/A')}
          </div>
        </div>
        <div>
          <div className="font-bold text-slate-500 uppercase text-[10px]">Last Status Update</div>
          <div className="text-sm font-semibold text-slate-900">
            {selectedTicket.updatedAt?.toDate ? selectedTicket.updatedAt.toDate().toLocaleString() : String(selectedTicket.updatedAt || 'N/A')}
          </div>
        </div>
      </div>

      {/* Full Description */}
      <div className="mb-6 print-avoid-break">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 border-b border-slate-300 pb-1">
          Detailed Description & Request Details
        </div>
        <div className="p-3.5 border border-slate-300 rounded text-xs leading-relaxed whitespace-pre-wrap font-mono text-slate-800 bg-white">
          {selectedTicket.description}
        </div>
      </div>

      {/* Activity / Comments Thread */}
      {selectedTicket.comments && selectedTicket.comments.length > 0 && (
        <div className="mb-6 print-avoid-break">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2 border-b border-slate-300 pb-1">
            Technician Notes & Conversation Log ({selectedTicket.comments.length})
          </div>
          <div className="space-y-2 text-xs">
            {selectedTicket.comments.map((c, i) => (
              <div key={i} className="p-2.5 border border-slate-200 rounded bg-slate-50/50">
                <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>{c.authorName || c.authorEmail} {c.isInternal ? '[INTERNAL TECH NOTE]' : ''}</span>
                  <span className="font-normal text-slate-500">{c.timestamp ? new Date(c.timestamp).toLocaleString() : ''}</span>
                </div>
                <div className="text-slate-800 whitespace-pre-wrap">{c.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Work Order Completion & Sign-Off Section */}
      <div className="border-2 border-slate-800 rounded p-4 mb-6 print-avoid-break">
        <div className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3 border-b border-slate-400 pb-1 flex justify-between items-center">
          <span>Technician Work Order Completion & Sign-Off</span>
          <span className="text-[10px] font-normal text-slate-500">For physical work orders & maintenance audits</span>
        </div>

        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
          <div>
            <span className="text-slate-600">Work Completed By:</span>
            <div className="mt-4 border-b border-slate-400" />
          </div>
          <div>
            <span className="text-slate-600">Date & Time Completed:</span>
            <div className="mt-4 border-b border-slate-400" />
          </div>

          <div className="col-span-2">
            <span className="text-slate-600">Resolution / Work Performed Summary:</span>
            <div className="mt-6 border-b border-slate-300" />
            <div className="mt-6 border-b border-slate-300" />
          </div>

          <div>
            <span className="text-slate-600">Parts / Materials Consumed:</span>
            {selectedTicket.partsUsed ? (
              <div className="mt-1 font-bold text-slate-900 border-b border-slate-400 pb-1">{selectedTicket.partsUsed}</div>
            ) : (
              <div className="mt-4 border-b border-slate-400" />
            )}
          </div>
          <div>
            <span className="text-slate-600">WCA PO # / Cost / Hours:</span>
            {selectedTicket.poNumber || selectedTicket.estimatedCost ? (
              <div className="mt-1 font-bold text-slate-900 border-b border-slate-400 pb-1">
                {selectedTicket.poNumber || ''} {selectedTicket.estimatedCost ? `($${selectedTicket.estimatedCost})` : ''}
              </div>
            ) : (
              <div className="mt-4 border-b border-slate-400" />
            )}
          </div>

          <div>
            <span className="text-slate-600">Technician Signature:</span>
            <div className="mt-5 border-b border-slate-400" />
          </div>
          <div>
            <span className="text-slate-600">Requester / Supervisor Sign-off:</span>
            <div className="mt-5 border-b border-slate-400" />
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
        Wesleyan Christian Academy Helpdesk • https://wca-tickets-58f6c.web.app • Ticket #{selectedTicket.ticketNumber || selectedTicket.id}
      </div>
    </div>
  )}

  {/* --- QR CODE ROOM & EQUIPMENT STICKER GENERATOR MODAL --- */}
  {showQrModal && (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-[#0b1c2d] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">Scan-to-Report QR Room &amp; Equipment Stickers</h3>
              <p className="text-[11px] text-slate-300">Print QR stickers for classrooms, restrooms, copiers, or athletic facilities</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowQrModal(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">1. Target Department</label>
              <select
                value={qrAreaId}
                onChange={(e) => setQrAreaId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white text-slate-900"
              >
                <option value="housekeeping">Housekeeping &amp; Custodial</option>
                <option value="facilities">Facilities &amp; Maintenance</option>
                <option value="itsm">ITSM / Technology Support</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">2. Campus Location</label>
              <select
                value={qrPlaceId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setQrPlaceId(nextId);
                  const found = placesList.find((p) => p.id === nextId);
                  if (found?.rooms?.length > 0) setQrRoom(found.rooms[0]);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white text-slate-900"
              >
                {placesList.map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">3. Room / Restroom / Facility</label>
              <select
                value={qrRoom}
                onChange={(e) => setQrRoom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white text-slate-900"
              >
                {qrRoomsForPlace.map((rm) => (
                  <option key={rm} value={rm}>{rm}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">4. Equipment Tag / Serial (Optional)</label>
              <input
                type="text"
                placeholder="e.g. COPIER-2F or Promethean"
                value={qrAssetTag}
                onChange={(e) => setQrAssetTag(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white text-slate-900"
              />
            </div>
          </div>

          {/* Printable Sticker Preview Card */}
          <div className="p-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col sm:flex-row items-center gap-5">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
              <img
                src={qrImageUrl}
                alt="Room QR Code"
                className="w-36 h-36 object-contain"
              />
            </div>
            <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
              <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                Wesleyan Christian Academy • Scan to Report
              </div>
              <h4 className="text-lg font-black text-slate-900 leading-tight">
                {selectedQrPlace?.name} — {qrRoom}
              </h4>
              <p className="text-xs text-slate-600">
                Scan with your phone camera to report a{' '}
                <strong className="text-slate-900">
                  {qrAreaId === 'housekeeping' ? 'Housekeeping / Restock' : qrAreaId === 'facilities' ? 'Facilities Maintenance' : 'Technology Support'}
                </strong>{' '}
                request with this room pre-filled!
              </p>
              <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={handleCopyQrLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{qrCopied ? '✓ Link Copied!' : 'Copy Direct Link'}</span>
                </button>
                <a
                  href={qrImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Open / Print QR Sticker</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* --- PREVENTIVE MAINTENANCE (PM) SCHEDULES MODAL --- */}
  {showPmModal && (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-[#0b1c2d] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">Recurring Preventive Maintenance (PM) Schedules</h3>
              <p className="text-[11px] text-slate-300">Manage routine Facilities, Housekeeping &amp; IT checks and spawn work orders in 1 click</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPmModal(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Add New PM Template Form */}
          <form onSubmit={handleAddPmSchedule} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              + Add Recurring PM Schedule Template
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
              <input
                type="text"
                required
                placeholder="e.g. Monthly Ice Machine Sanitization & Filter Change"
                value={newPmTitle}
                onChange={(e) => setNewPmTitle(e.target.value)}
                className="sm:col-span-5 px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
              />
              <select
                value={newPmAreaId}
                onChange={(e) => setNewPmAreaId(e.target.value)}
                className="sm:col-span-3 px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
              >
                <option value="facilities">Facilities</option>
                <option value="housekeeping">Housekeeping</option>
                <option value="itsm">IT Support</option>
              </select>
              <select
                value={newPmFrequency}
                onChange={(e) => setNewPmFrequency(e.target.value)}
                className="sm:col-span-2 px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
              >
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annual">Annual</option>
              </select>
              <button
                type="submit"
                className="sm:col-span-2 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black"
              >
                Add PM
              </button>
            </div>
          </form>

          {/* PM Schedule List */}
          <div className="space-y-2.5">
            {pmSchedules.map((pm) => (
              <div
                key={pm.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      pm.areaId === 'facilities'
                        ? 'bg-amber-100 text-amber-800'
                        : pm.areaId === 'housekeeping'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}>
                      {pm.areaId}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      🔁 {pm.frequency}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {pm.location} • {pm.room}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{pm.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2">{pm.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={spawningPmId === pm.id}
                    onClick={() => handleSpawnPmTicket(pm)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition-colors disabled:opacity-50"
                  >
                    {spawningPmId === pm.id ? 'Creating...' : '⚡ Spawn Ticket Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePmSchedule(pm.id)}
                    title="Remove PM Template"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )}
</div>
  );
}