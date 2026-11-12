import React from 'react';
import { LogIn, LogOut, Ticket, LayoutDashboard, Shield, User as UserIcon } from 'lucide-react';
import { signInWithGoogle, logoutUser } from '../services/firebase';

export default function Navbar({ user, currentView, setCurrentView, isAdminOrTech }) {
  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div 
            onClick={() => setCurrentView('submit')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-slate-950 text-xl shadow-inner group-hover:scale-105 transition-transform">
              W
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
                WCA <span className="text-amber-400 font-semibold">Helpdesk</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Facilities • Housekeeping • ITSM</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setCurrentView('submit')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'submit'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>Submit Ticket</span>
            </button>

            {user && (
              <button
                onClick={() => setCurrentView('my-tickets')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'my-tickets'
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span className="hidden md:inline">My Tickets</span>
              </button>
            )}

            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Staff Queue</span>
            </button>

            {/* User Profile / Auth Button */}
            <div className="pl-2 border-l border-slate-700 ml-1">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden lg:flex flex-col text-right">
                    <span className="text-xs font-semibold text-white leading-tight">{user.displayName || user.email}</span>
                    <span className="text-[10px] text-amber-400">{user.email}</span>
                  </div>
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'User'} 
                      className="w-9 h-9 rounded-full ring-2 ring-amber-400/50 object-cover" 
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-amber-400">
                      {user.email ? user.email[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <button
                    onClick={logoutUser}
                    title="Sign Out"
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-sm font-semibold transition-all shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Google Sign-In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
