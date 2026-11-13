import React, { useState, useEffect, useMemo } from 'react';
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
  Edit3
} from 'lucide-react';
import { 
  db, 
  deleteTicket, 
  subscribeToStaffMembers, 
  assignTicket,
  addTicketComment,
  updateTicketStatus
} from '../services/firebase';
import { canModifyTicket, canCloseTicket, ROLES } from '../data/rolesData';

const STATUS_CONFIG = {
  new: { label: 'New', badge: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
  assigned: { label: 'Assigned', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300', dot: 'bg-indigo-500' },
  in_progress: { label: 'In Progress', badge: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
  waiting: { label: 'Waiting on Requester', badge: 'bg-purple-100 text-purple-800 border-purple-300', dot: 'bg-purple-500' },
  resolved: { label: 'Resolved', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
  closed: { label: 'Closed', badge: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-500' }
};

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

export default function TicketDashboard({ user, userProfile, catalog, filterByMyTickets = false, onNewTicket }) {
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
  const [myTicketsSubTab, setMyTicketsSubTab] = useState(role !== 'requester' ? 'assigned' : 'submitted');

  // Incident IQ Comment Composer & Notification State
  const [commentText, setCommentText] = useState('');
  const [visibleToRequester, setVisibleToRequester] = useState(true); // Toggle 1: true = Option 2 (visible to requester), false = Option 1 (internal tech note)
  const [changeToWaiting, setChangeToWaiting] = useState(false); // Toggle 2: Change to "Waiting on requester"
  const [commentFiles, setCommentFiles] = useState([]);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentSuccessMsg, setCommentSuccessMsg] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef(null);

  // Subscribe to Staff members for ticket assignment
  useEffect(() => {
    const unsubStaff = subscribeToStaffMembers((members) => {
      setStaffMembers(members);
    });
    return () => {
      if (unsubStaff) unsubStaff();
    };
  }, []);

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
      }
    }
  }, [tickets]);

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

  // Permission checkers
  const canModify = (ticketAreaId) => canModifyTicket(role, ticketAreaId);
  const canClose = (ticketAreaId) => canCloseTicket(role, ticketAreaId);

  const userEmailLower = (user?.email || '').toLowerCase();

  // Counts for My Tickets subtabs
  const assignedToMeCount = tickets.filter((t) => (t.assignedToEmail || '').toLowerCase() === userEmailLower).length;
  const submittedByMeCount = tickets.filter((t) => {
    const creator = (t.createdByEmail || t.requester?.email || '').toLowerCase();
    return creator === userEmailLower;
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
      if (filterByMyTickets && userEmailLower) {
        const ticketEmail = (t.createdByEmail || t.requester?.email || '').toLowerCase();
        const isSubmitted = ticketEmail === userEmailLower;
        const isAssigned = (t.assignedToEmail || '').toLowerCase() === userEmailLower;

        if (role !== 'requester') {
          if (myTicketsSubTab === 'assigned' && !isAssigned) return false;
          if (myTicketsSubTab === 'submitted' && !isSubmitted) return false;
          if (myTicketsSubTab === 'all' && !isAssigned && !isSubmitted) return false;
        } else {
          if (!isSubmitted) return false;
        }
      }

      const ticketArea = t.areaId || t.department;
      if (selectedArea !== 'all' && ticketArea !== selectedArea) {
        return false;
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
  }, [tickets, filterByMyTickets, userEmailLower, role, myTicketsSubTab, selectedArea, selectedStatus, kpiFilter, priorityFilter, searchQuery]);

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
            <div className="inline-flex rounded-xl bg-slate-200/80 p-1 border border-slate-300 self-start sm:self-auto">
              <button
                onClick={() => setMyTicketsSubTab('assigned')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  myTicketsSubTab === 'assigned'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assigned to Me ({assignedToMeCount})</span>
              </button>
              <button
                onClick={() => setMyTicketsSubTab('submitted')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  myTicketsSubTab === 'submitted'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Submitted by Me ({submittedByMeCount})</span>
              </button>
              <button
                onClick={() => setMyTicketsSubTab('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  myTicketsSubTab === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                All ({assignedToMeCount + submittedByMeCount})
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

      {/* Section Header with Queue Title and "+ NEW TICKET" button */}
      {!filterByMyTickets && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">Highest Priority Tickets</h3>
            <p className="text-xs text-slate-500">Your prioritized queue in {getAreaLabel()}</p>
          </div>
          {onNewTicket && (
            <button
              onClick={() => onNewTicket(selectedArea)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 transition-all self-start sm:self-auto hover:shadow"
            >
              <Plus className="w-4 h-4" />
              <span>NEW TICKET</span>
            </button>
          )}
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

      {/* Main Content Layout: Priority Queue (Left) & Notifications/Drawer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ticket List (Left Column) */}
        <div className={selectedTicket ? 'lg:col-span-7 space-y-3' : 'lg:col-span-8 space-y-3'}>
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
                There are no tickets matching your current department or priority filters.
              </p>
              {(kpiFilter !== 'all' || priorityFilter !== 'all' || selectedStatus !== 'all' || searchQuery) && (
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
                        </div>
                      </div>
                    </div>

                    {/* Right: Priority Score Pill & Requester Info */}
                    <div className="flex items-center gap-3 flex-shrink-0">
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
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Ticket Detail Drawer OR Live Activity & Notifications Feed */}
        {selectedTicket ? (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-6 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedTicket.ticketNumber || (selectedTicket.id ? `TICK-${selectedTicket.id.slice(-6)}` : 'TICK')}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedTicket.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {role === 'admin' && (
                  <button
                    onClick={handleDeleteSelectedTicket}
                    title="Permanently Delete Ticket (Admin Only)"
                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-slate-400 hover:text-slate-700 text-xs font-bold bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  ✕ Close
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
        ) : (
          /* When no ticket is actively opened: Incident IQ "Your Notifications / Recent Activity" Feed */
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
        )}
      </div>
    </div>
  );
}