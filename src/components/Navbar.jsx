import React, { useState } from 'react';
import { 
  LogIn, 
  LogOut, 
  Ticket, 
  Gauge, 
  Laptop, 
  Cog, 
  Users, 
  MapPin, 
  Search, 
  Bell, 
  Plus, 
  ChevronDown,
  User as UserIcon,
  Sliders,
  Check
} from 'lucide-react';
import { signInWithGoogle, logoutUser } from '../services/firebase';
import { ROLES } from '../data/rolesData';

export default function Navbar({ 
  user, 
  userProfile, 
  currentView, 
  setCurrentView,
  onSearchClick
}) {
  const [ticketMenuOpen, setTicketMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const role = userProfile?.role || 'requester';
  const roleConfig = ROLES[role] || ROLES.requester;
  const isAdmin = role === 'admin';
  const isStaffOrTech = ['admin', 'agent', 'facilities_tech', 'housekeeping_tech', 'it_tech'].includes(role);

  // The 6 Core Incident IQ Navigation Items:
  const navItems = [
    {
      id: 'dashboard',
      label: 'DASH',
      icon: Gauge,
      active: currentView === 'dashboard',
      onClick: () => setCurrentView('dashboard'),
      visible: isStaffOrTech || user
    },
    {
      id: 'tickets',
      label: 'TICKETS',
      icon: Ticket,
      active: currentView === 'submit' || currentView === 'my-tickets',
      onClick: () => setCurrentView(currentView === 'submit' ? 'my-tickets' : 'submit'),
      visible: true,
      hasDropdown: true
    },
    {
      id: 'assets',
      label: 'ASSETS',
      icon: Laptop,
      active: currentView === 'assets',
      onClick: () => setCurrentView('assets'),
      visible: true
    },
    {
      id: 'parts',
      label: 'PARTS',
      icon: Cog,
      active: currentView === 'parts',
      onClick: () => setCurrentView('parts'),
      visible: isStaffOrTech || isAdmin
    },
    {
      id: 'users',
      label: 'USERS',
      icon: Users,
      active: currentView === 'users',
      onClick: () => setCurrentView('users'),
      visible: isAdmin || isStaffOrTech
    },
    {
      id: 'places',
      label: 'PLACES',
      icon: MapPin,
      active: currentView === 'places' || currentView === 'customizer',
      onClick: () => setCurrentView('places'),
      visible: true
    }
  ];

  return (
    <header className="bg-[#0b1c2d] text-white shadow-xl border-b border-slate-800/80 sticky top-0 z-50">
      {/* Taller, spacious header (h-20 = 80px) for a grand Incident IQ / WCA feel */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-3">
          
          {/* 1. Left: Brand Crest & Title */}
          <div 
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-3.5 cursor-pointer group flex-shrink-0"
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
                West Central Area Schools
              </p>
            </div>
          </div>

          {/* 2. Center: The 6 Core Navigation Options (Single-Line, NO Double-Line!) */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
            {navItems.filter(item => item.visible).map((item) => {
              const IconComp = item.icon;
              return (
                <div key={item.id} className="relative">
                  <button
                    onClick={item.onClick}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-150 whitespace-nowrap ${
                      item.active
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <IconComp className={`w-4 h-4 ${item.active ? 'text-slate-950' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.hasDropdown && (
                      <ChevronDown 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTicketMenuOpen(!ticketMenuOpen);
                        }}
                        className={`w-3 h-3 ml-0.5 opacity-70 hover:opacity-100 transition-transform ${ticketMenuOpen ? 'rotate-180' : ''}`} 
                      />
                    )}
                  </button>

                  {/* TICKETS Dropdown Submenu */}
                  {item.hasDropdown && ticketMenuOpen && (
                    <div 
                      onMouseLeave={() => setTicketMenuOpen(false)}
                      className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in"
                    >
                      <button
                        onClick={() => {
                          setCurrentView('submit');
                          setTicketMenuOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between ${
                          currentView === 'submit' ? 'text-amber-400 bg-slate-800' : 'text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        <span>Submit New Ticket</span>
                        {currentView === 'submit' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </button>

                      {user && (
                        <button
                          onClick={() => {
                            setCurrentView('my-tickets');
                            setTicketMenuOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between ${
                            currentView === 'my-tickets' ? 'text-amber-400 bg-slate-800' : 'text-slate-200 hover:bg-slate-800/60'
                          }`}
                        >
                          <span>My Tickets</span>
                          {currentView === 'my-tickets' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </button>
                      )}

                      {isStaffOrTech && (
                        <button
                          onClick={() => {
                            setCurrentView('dashboard');
                            setTicketMenuOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between ${
                            currentView === 'dashboard' ? 'text-amber-400 bg-slate-800' : 'text-slate-200 hover:bg-slate-800/60'
                          }`}
                        >
                          <span>Ticket Queue</span>
                          {currentView === 'dashboard' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* 3. Right: Utility Cluster (+ NEW TICKET, Search, Notifications & User Profile) */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            
            {/* Prominent Incident IQ style "+ NEW TICKET" Button */}
            <button
              onClick={() => setCurrentView('submit')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-sky-600/20 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">NEW TICKET</span>
              <span className="sm:hidden">NEW</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setCurrentView('dashboard')}
                title="Notifications"
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0b1c2d]"></span>
              </button>
            </div>

            {/* User Profile / Auth Cluster */}
            <div className="pl-2 border-l border-slate-700/80">
              {user ? (
                <div className="flex items-center gap-2">
                  <div 
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex items-center gap-2.5 cursor-pointer p-1 rounded-xl hover:bg-slate-800/80 transition-colors"
                  >
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName || 'User'} 
                        className="w-9 h-9 rounded-full ring-2 ring-amber-400/60 object-cover" 
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-700 ring-2 ring-amber-400/60 flex items-center justify-center text-xs font-bold text-amber-400">
                        {user.email ? user.email[0].toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="hidden xl:flex flex-col text-left leading-tight">
                      <span className="text-xs font-bold text-white truncate max-w-[120px]">
                        {user.displayName || user.email?.split('@')[0]}
                      </span>
                      <span className="text-[10px] text-amber-400 font-medium">
                        {roleConfig.label}
                      </span>
                    </div>
                  </div>

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
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs sm:text-sm font-black transition-all shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Google Sign-In</span>
                  <span className="sm:hidden">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. Mobile & Tablet Navigation Row (Smooth horizontal scrolling, always single line!) */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2.5 pt-1 scrollbar-none border-t border-slate-800/50">
          {navItems.filter(item => item.visible).map((item) => {
            const IconComp = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-colors ${
                  item.active
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}
