import React from 'react';
import { 
  LogIn, 
  LogOut, 
  Ticket, 
  LayoutDashboard, 
  Users, 
  Sliders, 
  User as UserIcon,
  Shield
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
  const isStaffOrTech = ['admin', 'agent', 'facilities_tech', 'housekeeping_tech', 'it_tech'].includes(role);

  return (
    <header className="bg-[#0b1c2d] text-white shadow-xl border-b border-slate-800/80 sticky top-0 z-50">
      {/* Spacious, pleasant header (h-20 = 80px) with single-line buttons */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* 1. Left: Brand Logo & Title -> Takes user to the main submission screen */}
          <div 
            onClick={() => setCurrentView('submit')}
            className="flex items-center gap-3.5 cursor-pointer group flex-shrink-0"
            title="Return to Main Ticket Submission Screen"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-all border border-amber-300/40">
              W
            </div>
            <div className="leading-tight">
              <div className="font-black text-lg tracking-tight text-white flex items-center gap-1.5">
                <span>WCA</span>
                <span className="text-amber-400 font-extrabold">HELPDESK</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block tracking-wide">
                Wesleyan Christian Academy
              </p>
            </div>
          </div>

          {/* 2. Center: Navigation Options (Horizontal, Single-Line, NO Double-Line Buttons!) */}
          <nav className="hidden lg:flex items-center gap-2">
            
            {/* Submit Ticket */}
            <button
              onClick={() => setCurrentView('submit')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all whitespace-nowrap ${
                currentView === 'submit'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>Submit Ticket</span>
            </button>

            {/* My Tickets */}
            <button
              onClick={() => setCurrentView('my-tickets')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all whitespace-nowrap ${
                currentView === 'my-tickets'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>My Tickets</span>
            </button>

            {/* Ticket Queue */}
            {isStaffOrTech && (
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all whitespace-nowrap ${
                  currentView === 'dashboard'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Ticket Queue</span>
              </button>
            )}

            {/* User Roles (Admin Only) */}
            {isAdmin && (
              <button
                onClick={() => setCurrentView('users')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all whitespace-nowrap ${
                  currentView === 'users'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>User Roles</span>
              </button>
            )}

            {/* Customize Fields (Admin Only) */}
            {isAdmin && (
              <button
                onClick={() => setCurrentView('customizer')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all whitespace-nowrap ${
                  currentView === 'customizer'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Customize Fields</span>
              </button>
            )}
          </nav>

          {/* 3. Right: User Profile & Authentication */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3 pl-2 border-l border-slate-700/80">
                <div className="hidden md:flex flex-col text-right leading-tight">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs font-bold text-white leading-tight">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${roleConfig.badge}`}>
                      {roleConfig.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono">{user.email}</span>
                </div>

                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'User'} 
                    className="w-10 h-10 rounded-full ring-2 ring-amber-400/60 object-cover" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-700 ring-2 ring-amber-400/60 flex items-center justify-center text-xs font-bold text-amber-400">
                    {user.email ? user.email[0].toUpperCase() : 'U'}
                  </div>
                )}

                <button
                  onClick={logoutUser}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-xl transition-colors"
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
