import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, updateUserRole } from '../services/firebase';
import { ROLES, SUPER_ADMIN_EMAILS } from '../data/rolesData';
import { 
  Users, 
  Shield, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Wrench, 
  Sparkles, 
  Laptop, 
  UserCheck, 
  Lock 
} from 'lucide-react';

export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUid, setUpdatingUid] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setUsers(userList);
      setLoading(false);
    }, (err) => {
      console.warn("Error fetching users:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (targetUid, newRole) => {
    setUpdatingUid(targetUid);
    setStatusMsg('');
    try {
      await updateUserRole(targetUid, newRole);
      setStatusMsg(`Role updated to ${ROLES[newRole]?.label || newRole}`);
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update user role.');
    } finally {
      setUpdatingUid(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = (u.displayName || '').toLowerCase().includes(q);
    const matchEmail = (u.email || '').toLowerCase().includes(q);
    const matchRole = (u.role || '').toLowerCase().includes(q);
    return matchName || matchEmail || matchRole;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              User Management & Access Rights
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Assign technician permissions, dispatch agent rights, and admin privileges for staff.
          </p>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300 animate-fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>

      {/* Role Rights Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
            <Wrench className="w-4 h-4 text-amber-600" />
            <span>Facilities / Maintenance Techs</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Can modify work orders, update status (In Progress, Resolved, Closed), and post internal notes for all Facilities tickets.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
            <UserCheck className="w-4 h-4 text-purple-600" />
            <span>Support Agents / Dispatchers</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Can view and triage all departmental queues, reassign tickets, and coordinate responses, but are not the primary repair technicians.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
            <Shield className="w-4 h-4 text-red-600" />
            <span>Administrators</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Full system control, can reassign roles, delete records, close any ticket, and configure all department asset lists.
          </p>
        </div>
      </div>

      {/* User Search & Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div className="text-xs text-slate-500">
            Total Staff Logged In: <strong className="text-slate-900">{users.length}</strong>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Staff Member</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Current Role</th>
                <th className="px-5 py-3">Assign Rights</th>
                <th className="px-5 py-3">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Loading staff directory...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleConfig = ROLES[user.role] || ROLES.requester;
                  const isProtectedSuperAdmin = SUPER_ADMIN_EMAILS.includes((user.email || '').toLowerCase());
                  const isBusy = updatingUid === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                              {user.email ? user.email[0].toUpperCase() : 'U'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{user.displayName || 'Unnamed User'}</span>
                              {isProtectedSuperAdmin && (
                                <Lock className="w-3 h-3 text-red-500" title="Super Admin Account" />
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">
                        {user.email}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${roleConfig.badge}`}>
                          {roleConfig.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        {isProtectedSuperAdmin ? (
                          <span className="text-xs text-slate-400 font-medium italic">
                            Primary Super Admin (Locked)
                          </span>
                        ) : (
                          <select
                            disabled={isBusy}
                            value={user.role || 'requester'}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                          >
                            <option value="requester">Staff Requester</option>
                            <option value="facilities_tech">Facilities Technician (Maintenance)</option>
                            <option value="housekeeping_tech">Housekeeping Staff (Custodial)</option>
                            <option value="it_tech">ITSM Support Tech (Technology)</option>
                            <option value="agent">Support Agent / Dispatcher</option>
                            <option value="admin">Administrator</option>
                          </select>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-slate-400 text-xs">
                        {user.lastLogin?.toDate ? user.lastLogin.toDate().toLocaleDateString() : 'Active'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
