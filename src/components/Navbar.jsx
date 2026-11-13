import React from 'react';
import { 
  LogIn, 
  LogOut, 
  Ticket, 
  LayoutDashboard, 
  Users, 
  Sliders, 
  User as UserIcon,
  Shield,
  Calendar,
  Laptop
} from 'lucide-react';
import { signInWithGoogle, logoutUser } from '../services/firebase';
import { ROLES } from '../data/rolesData';

export default function Navbar({ 
  user, 
  userProfile, 
  currentView, 
  setCurrentView 
}) {
  const role = userProfile?.role || 'requester';
  const roleConfig = ROLES[role] || ROLES.requester;
  const isAdmin = role === 'admin';
  const isItOrAdmin = ['admin', 'it_tech', 'agent'].includes(role);
  const isStaffOrTech = ['admin', 'agent', 'facilities_tech', 'housekeeping_tech', 'it_tech'].includes(role);

  return (
    <header className="bg-[#0b1c2d] text-white shadow-xl border-b border-slate-800/80 sticky top-0 z-50">
      {/* Full-width responsive header container */}
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          
          {/* 1. Left: Official Brand Logo -> Takes user to the main submission screen */}
          <div 
            onClick={() => setCurrentView('submit')}
            className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0"
            title="Return to Main Ticket Submission Screen"
          >
            <img 
              src="/wca-logo-white.svg" 
              alt="Wesleyan Christian Academy" 
              width="145"
              height="35"
              style={{ width: '145px', height: '35px' }}
              className="object-contain flex-shrink-0 group-hover:opacity-90 transition-opacity" 
            />
            <div className="hidden 2xl:flex flex-col border-l border-slate-700/80 pl-2.5 leading-tight">
              <span className="text-[11px] font-black tracking-widest text-amber-400 uppercase">
                Helpdesk
              </span>
              <span className="text-[9px] text-slate-400 font-medium tracking-wide">
                Service Portal
              </span>
            </div>
          </div>

          {/* 2. Center: Navigation Options (Never shrinks below content size, never overlaps neighbors) */}
          <nav className="hidden lg:flex items-center justify-center gap-1 xl:gap-1.5 flex-shrink-0">
            
            {/* Submit Ticket */}
            <button
              onClick={() => setCurrentView('submit')}
              className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                currentView === 'submit'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Ticket className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Submit Ticket</span>
            </button>

            {/* My Tickets */}
            <button
              onClick={() => setCurrentView('my-tickets')}
              className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                currentView === 'my-tickets'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>My Tickets</span>
            </button>

            {/* Ticket Queue */}
            {isStaffOrTech && (
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                  currentView === 'dashboard'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Ticket Queue</span>
              </button>
            )}

            {/* Facility & Event Setup Calendar */}
            <button
              onClick={() => setCurrentView('calendar')}
              className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                currentView === 'calendar'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden xl:inline">Facility Calendar</span>
              <span className="xl:hidden">Calendar</span>
            </button>

            {/* Fleet & Device Inventory (IT & Admins Only) */}
            {isItOrAdmin && (
              <button
                onClick={() => setCurrentView('assets')}
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                  currentView === 'assets'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Inventory</span>
              </button>
            )}

            {/* User Roles (Admin Only) */}
            {isAdmin && (
              <button
                onClick={() => setCurrentView('users')}
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                  currentView === 'users'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Users className="w-3.5 h-3.5 flex-shrink-0" />
                <span>User Roles</span>
              </button>
            )}

            {/* Customize Fields (Admin Only) */}
            {isAdmin && (
              <button
                onClick={() => setCurrentView('customizer')}
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                  currentView === 'customizer'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden xl:inline">Customize Fields</span>
                <span className="xl:hidden">Customize</span>
              </button>
            )}
          </nav>

          {/* 3. Right: User Profile & Authentication */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-700/80">
                <div className="hidden xl:flex flex-col items-end text-right leading-tight max-w-[125px]" title={user.email}>
                  <span className="text-xs font-bold text-white truncate w-full">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border mt-0.5 ${roleConfig.badge}`}>
                    {roleConfig.label}
                  </span>
                </div>

                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'User'} 
                    title={`${user.displayName || ''} (${user.email || ''}) — ${roleConfig.label}`}
                    className="w-9 h-9 rounded-full ring-2 ring-amber-400/60 object-cover flex-shrink-0" 
                  />
                ) : (
                  <div 
                    title={`${user.displayName || ''} (${user.email || ''}) — ${roleConfig.label}`}
                    className="w-9 h-9 rounded-full bg-slate-700 ring-2 ring-amber-400/60 flex items-center justify-center text-xs font-bold text-amber-400 flex-shrink-0"
                  >
                    {user.email ? user.email[0].toUpperCase() : 'U'}
                  </div>
                )}

                <button
                  onClick={logoutUser}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-xl transition-colors flex-shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs sm:text-sm font-black transition-all shadow-md shadow-amber-500/20"
              >
                <LogIn className="w-4 h-4" />
                <span>Google Sign-In</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. Mobile & Tablet Navigation Row (Smooth horizontal scrolling, always single line!) */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-3 pt-1 scrollbar-none border-t border-slate-800/50">
          <button
            onClick={() => setCurrentView('submit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              currentView === 'submit'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Submit Ticket</span>
          </button>

          <button
            onClick={() => setCurrentView('my-tickets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              currentView === 'my-tickets'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>My Tickets</span>
          </button>

          {isStaffOrTech && (
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Ticket Queue</span>
            </button>
          )}

          <button
            onClick={() => setCurrentView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              currentView === 'calendar'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Facility Calendar</span>
          </button>

          {isItOrAdmin && (
            <button
              onClick={() => setCurrentView('assets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                currentView === 'assets'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Inventory</span>
            </button>
          )}

          {isAdmin && (
            <>
              <button
                onClick={() => setCurrentView('users')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  currentView === 'users'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>User Roles</span>
              </button>

              <button
                onClick={() => setCurrentView('customizer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  currentView === 'customizer'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Customize Fields</span>
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
