export const ROLES = {
  admin: {
    id: 'admin',
    label: 'Administrator',
    badge: 'bg-red-100 text-red-800 border-red-300',
    description: 'Full system control, user rights management, all queues'
  },
  agent: {
    id: 'agent',
    label: 'Support Agent / Dispatcher',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Triage, coordinate, reassign, and update tickets across departments'
  },
  facilities_tech: {
    id: 'facilities_tech',
    label: 'Facilities Technician',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Modify, service, and close Facilities & Maintenance tickets'
  },
  housekeeping_tech: {
    id: 'housekeeping_tech',
    label: 'Housekeeping Staff',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Modify, service, and close Housekeeping & Custodial tickets'
  },
  it_tech: {
    id: 'it_tech',
    label: 'ITSM Support Tech',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Modify, service, and close IT & Technology tickets'
  },
  requester: {
    id: 'requester',
    label: 'Staff Requester',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    description: 'Submit and track own tickets'
  }
};

export const SUPER_ADMIN_EMAILS = [
  'jruble@wcatrojans.org'
];

export const canManageUsers = (userRole) => userRole === 'admin';

export const canViewStaffQueue = (userRole) => {
  return ['admin', 'agent', 'facilities_tech', 'housekeeping_tech', 'it_tech'].includes(userRole);
};

export const canModifyTicket = (userRole, ticketAreaId) => {
  if (userRole === 'admin' || userRole === 'agent') return true;
  if (userRole === 'facilities_tech' && ticketAreaId === 'facilities') return true;
  if (userRole === 'housekeeping_tech' && ticketAreaId === 'housekeeping') return true;
  if (userRole === 'it_tech' && ticketAreaId === 'itsm') return true;
  return false;
};

export const canCloseTicket = (userRole, ticketAreaId) => {
  if (userRole === 'admin') return true;
  if (userRole === 'facilities_tech' && ticketAreaId === 'facilities') return true;
  if (userRole === 'housekeeping_tech' && ticketAreaId === 'housekeeping') return true;
  if (userRole === 'it_tech' && ticketAreaId === 'itsm') return true;
  // Agents can triage, but closing is typically for the techs doing the work or admins
  return false;
};
