import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, syncUserProfile, subscribeToUserProfile, subscribeToCatalog } from './services/firebase';
import { AREAS, BUILDINGS } from './data/categoriesData';
import Navbar from './components/Navbar';
import LandingAreaPicker from './components/LandingAreaPicker';
import TicketSubmissionForm from './components/TicketSubmissionForm';
import TicketDashboard from './components/TicketDashboard';
import UserManagement from './components/UserManagement';
import FieldCustomizer from './components/FieldCustomizer';

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState('submit'); // 'submit' | 'dashboard' | 'my-tickets' | 'users' | 'customizer'
  const [selectedArea, setSelectedArea] = useState(null);
  const [catalog, setCatalog] = useState({ buildings: BUILDINGS, areas: AREAS });

  useEffect(() => {
    // Subscribe to dynamic fields/issues catalog
    const unsubscribeCatalog = subscribeToCatalog((catData) => {
      if (catData) {
        setCatalog(catData);
      }
    });

    return () => {
      if (unsubscribeCatalog) unsubscribeCatalog();
    };
  }, []);

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profile = await syncUserProfile(currentUser);
          setUserProfile(profile);

          // Subscribe to live role changes
          unsubscribeProfile = subscribeToUserProfile(currentUser.uid, (updatedProfile) => {
            setUserProfile(updatedProfile);
          });
        } catch (err) {
          console.warn("Error syncing user profile:", err);
        }
      } else {
        setUserProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const handleSelectArea = (area) => {
    setSelectedArea(area);
  };

  const handleBackToLanding = () => {
    setSelectedArea(null);
  };

  const handleTicketCreated = () => {
    // Keep on success view inside the form
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navigation */}
      <Navbar 
        user={user} 
        userProfile={userProfile}
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
              <LandingAreaPicker 
                onSelectArea={handleSelectArea} 
                areasList={catalog.areas}
              />
            ) : (
              <TicketSubmissionForm 
                area={catalog.areas?.find((a) => a.id === selectedArea.id) || selectedArea}
                buildingsList={catalog.buildings}
                user={user}
                onBack={handleBackToLanding}
                onTicketCreated={handleTicketCreated}
              />
            )}
          </div>
        )}

        {/* View 2: Staff / Technician Queue Dashboard */}
        {currentView === 'dashboard' && (
          <TicketDashboard 
            user={user} 
            userProfile={userProfile}
            filterByMyTickets={false} 
          />
        )}

        {/* View 3: My Tickets */}
        {currentView === 'my-tickets' && (
          <TicketDashboard 
            user={user} 
            userProfile={userProfile}
            filterByMyTickets={true} 
          />
        )}

        {/* View 4: User Management (Admin Only) */}
        {currentView === 'users' && userProfile?.role === 'admin' && (
          <UserManagement 
            currentUser={user} 
          />
        )}

        {/* View 5: Field & Issue Customizer (Admin Only) */}
        {currentView === 'customizer' && userProfile?.role === 'admin' && (
          <FieldCustomizer 
            catalog={catalog}
            onCatalogUpdate={(updated) => setCatalog(updated)}
          />
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
            <span>West Central Area Schools</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
