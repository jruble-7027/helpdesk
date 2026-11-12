import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle } from './services/firebase';
import Navbar from './components/Navbar';
import LandingAreaPicker from './components/LandingAreaPicker';
import TicketSubmissionForm from './components/TicketSubmissionForm';
import TicketDashboard from './components/TicketDashboard';
import { ShieldCheck, LogIn, Heart } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState('submit'); // 'submit' | 'dashboard' | 'my-tickets'
  const [selectedArea, setSelectedArea] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSelectArea = (area) => {
    setSelectedArea(area);
  };

  const handleBackToLanding = () => {
    setSelectedArea(null);
  };

  const handleTicketCreated = () => {
    // Optionally switch to my-tickets or stay on success screen
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navigation */}
      <Navbar 
        user={user} 
        currentView={currentView} 
        setCurrentView={(view) => {
          setCurrentView(view);
          if (view === 'submit') setSelectedArea(null);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* View 1: Ticket Submission (Landing Area Picker or Form) */}
        {currentView === 'submit' && (
          <div>
            {!selectedArea ? (
              <LandingAreaPicker onSelectArea={handleSelectArea} />
            ) : (
              <TicketSubmissionForm 
                area={selectedArea}
                user={user}
                onBack={handleBackToLanding}
                onTicketCreated={handleTicketCreated}
              />
            )}
          </div>
        )}

        {/* View 2: Technician / Staff Queue Dashboard */}
        {currentView === 'dashboard' && (
          <TicketDashboard user={user} filterByMyTickets={false} />
        )}

        {/* View 3: My Tickets */}
        {currentView === 'my-tickets' && (
          <TicketDashboard user={user} filterByMyTickets={true} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs text-center mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white">WCA Helpdesk</span>
            <span>•</span>
            <span>Facilities, Housekeeping & ITSM Service Portal</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <span>Built for West Central Area Schools</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
