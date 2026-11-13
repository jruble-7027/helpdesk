import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, syncUserProfile, subscribeToUserProfile, subscribeToCatalog, saveCatalogSettings } from './services/firebase';
import { AREAS, BUILDINGS, DEFAULT_PLACES } from './data/categoriesData';
import Navbar from './components/Navbar';
import LandingAreaPicker from './components/LandingAreaPicker';
import TicketSubmissionForm from './components/TicketSubmissionForm';
import TicketDashboard from './components/TicketDashboard';
import UserManagement from './components/UserManagement';
import FieldCustomizer from './components/FieldCustomizer';
import AssetsView from './components/AssetsView';
import PartsView from './components/PartsView';
import PlacesView from './components/PlacesView';

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState('submit'); // 'submit' | 'dashboard' | 'my-tickets' | 'users' | 'customizer'
  const [selectedArea, setSelectedArea] = useState(null);
  const [catalog, setCatalog] = useState({ buildings: BUILDINGS, areas: AREAS, places: DEFAULT_PLACES });

  useEffect(() => {
    // Subscribe to dynamic fields/issues catalog
    const unsubscribeCatalog = subscribeToCatalog((catData) => {
      if (catData) {
        setCatalog({
          places: catData.places || DEFAULT_PLACES,
          buildings: catData.buildings || (catData.places ? catData.places.map((p) => p.name) : BUILDINGS),
          areas: catData.areas || AREAS
        });
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

  const handleReportIssueFromAsset = (assetName) => {
    const itsmArea = catalog.areas?.find((a) => a.id === 'itsm') || catalog.areas?.[0];
    setSelectedArea(itsmArea);
    setCurrentView('submit');
  };

  const handleRequestPart = (partName) => {
    const facilitiesArea = catalog.areas?.find((a) => a.id === 'facilities') || catalog.areas?.[0];
    setSelectedArea(facilitiesArea);
    setCurrentView('submit');
  };

  // Place handlers
  const handleSavePlace = async (updatedPlace) => {
    const currentPlaces = catalog.places || DEFAULT_PLACES;
    const newPlaces = currentPlaces.map((p) => (p.id === updatedPlace.id ? updatedPlace : p));
    const newBuildings = newPlaces.map((p) => p.name);
    const updatedCatalog = {
      ...catalog,
      places: newPlaces,
      buildings: newBuildings
    };
    setCatalog(updatedCatalog);
    try {
      await saveCatalogSettings(updatedCatalog);
    } catch (err) {
      console.error("Error saving place update:", err);
    }
  };

  const handleAddPlace = async (newPlace) => {
    const currentPlaces = catalog.places || DEFAULT_PLACES;
    const newPlaces = [...currentPlaces, newPlace];
    const newBuildings = newPlaces.map((p) => p.name);
    const updatedCatalog = {
      ...catalog,
      places: newPlaces,
      buildings: newBuildings
    };
    setCatalog(updatedCatalog);
    try {
      await saveCatalogSettings(updatedCatalog);
    } catch (err) {
      console.error("Error adding place:", err);
    }
  };

  const handleDeletePlace = async (placeId) => {
    const currentPlaces = catalog.places || DEFAULT_PLACES;
    const newPlaces = currentPlaces.filter((p) => p.id !== placeId);
    const newBuildings = newPlaces.map((p) => p.name);
    const updatedCatalog = {
      ...catalog,
      places: newPlaces,
      buildings: newBuildings
    };
    setCatalog(updatedCatalog);
    try {
      await saveCatalogSettings(updatedCatalog);
    } catch (err) {
      console.error("Error deleting place:", err);
    }
  };

  const isStaffOrAdmin = ['admin', 'agent', 'facilities_tech', 'housekeeping_tech', 'it_tech'].includes(userProfile?.role);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Redesigned Header with All 6 Core Incident IQ Options */}
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
        {/* Module 1: DASH (Incident IQ KPI Cockpit & Ticket Queue) */}
        {currentView === 'dashboard' && (
          <TicketDashboard 
            user={user} 
            userProfile={userProfile}
            filterByMyTickets={false} 
            onNewTicket={(areaId) => {
              if (areaId && areaId !== 'all') {
                const foundArea = catalog.areas?.find((a) => a.id === areaId);
                if (foundArea) setSelectedArea(foundArea);
              }
              setCurrentView('submit');
            }}
          />
        )}

        {/* Module 2: TICKETS (Submit Ticket Flow or My Tickets) */}
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
                placesList={catalog.places}
                user={user}
                onBack={handleBackToLanding}
                onTicketCreated={handleTicketCreated}
              />
            )}
          </div>
        )}

        {currentView === 'my-tickets' && (
          <TicketDashboard 
            user={user} 
            userProfile={userProfile}
            filterByMyTickets={true} 
            onNewTicket={() => setCurrentView('submit')}
          />
        )}

        {/* Module 3: ASSETS (Technology Hardware, Chromebooks, Displays, Workstations) */}
        {currentView === 'assets' && (
          <AssetsView 
            onReportIssue={handleReportIssueFromAsset}
          />
        )}

        {/* Module 4: PARTS (Spare Components, Chargers, Cables, HVAC Filters) */}
        {currentView === 'parts' && (
          <PartsView 
            onRequestPart={handleRequestPart}
          />
        )}

        {/* Module 5: USERS (User Roles & Staff Permissions) */}
        {currentView === 'users' && (
          <UserManagement 
            currentUser={user} 
          />
        )}

        {/* Module 6: PLACES (Campuses, Buildings, Wings, Classrooms) */}
        {currentView === 'places' && (
          <PlacesView 
            placesList={catalog.places || DEFAULT_PLACES}
            onSavePlace={handleSavePlace}
            onAddPlace={handleAddPlace}
            onDeletePlace={handleDeletePlace}
            isAdmin={isStaffOrAdmin}
            onOpenCustomizer={() => setCurrentView('customizer')}
          />
        )}

        {/* Sub-view: Field & Issue Customizer (Admin Configuration) */}
        {currentView === 'customizer' && (
          <FieldCustomizer 
            catalog={catalog}
            onCatalogUpdate={(updated) => setCatalog(updated)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#0b1c2d] border-t border-slate-800 text-slate-400 py-6 text-xs text-center mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white">WCA Helpdesk</span>
            <span>•</span>
            <span>West Central Area Schools Service Portal</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span>DASH</span>
            <span>•</span>
            <span>TICKETS</span>
            <span>•</span>
            <span>ASSETS</span>
            <span>•</span>
            <span>PARTS</span>
            <span>•</span>
            <span>USERS</span>
            <span>•</span>
            <span>PLACES</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
