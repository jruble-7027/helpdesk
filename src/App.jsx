import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Calendar as CalendarIcon, Volume2, VolumeX, BellOff, X, ArrowRight } from 'lucide-react';
import { auth, signInWithGoogle, syncUserProfile, subscribeToUserProfile, subscribeToCatalog, saveCatalogSettings } from './services/firebase';
import { AREAS, BUILDINGS, DEFAULT_PLACES } from './data/categoriesData';
import { DEFAULT_CALENDAR_ALERT_SETTINGS, checkIncidentIqCalendarForNewEvents, playNotificationChime } from './services/notificationService';
import Navbar from './components/Navbar';
import LandingAreaPicker from './components/LandingAreaPicker';
import TicketSubmissionForm from './components/TicketSubmissionForm';
import TicketDashboard from './components/TicketDashboard';
import UserManagement from './components/UserManagement';
import FieldCustomizer from './components/FieldCustomizer';
import AssetsView from './components/AssetsView';
import PartsView from './components/PartsView';
import PlacesView from './components/PlacesView';
import FacilitiesCalendar from './components/FacilitiesCalendar';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('ticket')) {
        return 'dashboard';
      }
    }
    return 'submit';
  }); // 'submit' | 'dashboard' | 'my-tickets' | 'users' | 'customizer'
  const [selectedArea, setSelectedArea] = useState(null);
  const [qrPrefill, setQrPrefill] = useState(null);
  const [catalog, setCatalog] = useState({
    buildings: BUILDINGS,
    areas: AREAS,
    places: DEFAULT_PLACES,
    calendarAlertSettings: DEFAULT_CALENDAR_ALERT_SETTINGS
  });
  const [calendarNewEventsToast, setCalendarNewEventsToast] = useState(null);
  const [calendarNewCount, setCalendarNewCount] = useState(0);

  // Listen for direct deep-link query parameter changes (e.g. ?ticket=T-1234 or QR room sticker ?area=housekeeping&campus=centennial&room=Gymnasium)
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('ticket')) {
        setCurrentView('dashboard');
        return;
      }
      const areaParam = params.get('area');
      if (areaParam) {
        const areaList = catalog.areas || AREAS;
        const foundArea = areaList.find((a) => a.id.toLowerCase() === areaParam.toLowerCase());
        if (foundArea) {
          setSelectedArea(foundArea);
          setQrPrefill({
            campus: params.get('campus') || params.get('location') || '',
            room: params.get('room') || '',
            asset: params.get('asset') || '',
            tag: params.get('tag') || '',
            issue: params.get('issue') || ''
          });
          setCurrentView('submit');
        }
      }
    };
    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [catalog.areas]);

  useEffect(() => {
    // Subscribe to dynamic fields/issues catalog
    const unsubscribeCatalog = subscribeToCatalog((catData) => {
      if (catData) {
        setCatalog({
          ...catData,
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
    setQrPrefill(null);
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleTicketCreated = () => {
    // Keep on success view inside the form
  };

  const handleReportIssueFromAsset = (assetName) => {
    const itsmArea = catalog.areas?.find((a) => a.id === 'itsm') || catalog.areas?.[0];
    setSelectedArea(itsmArea);
    setQrPrefill({ tag: assetName || '', asset: 'Laptop / Chromebook / Workstation' });
    setCurrentView('submit');
  };

  const handleRequestPart = (partName) => {
    const facilitiesArea = catalog.areas?.find((a) => a.id === 'facilities') || catalog.areas?.[0];
    setSelectedArea(facilitiesArea);
    setQrPrefill({ issue: partName ? `Part Request: ${partName}` : '' });
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
  const activeCalendarAlertSettings = {
    ...DEFAULT_CALENDAR_ALERT_SETTINGS,
    ...(catalog.calendarAlertSettings || {})
  };

  // Background Incident IQ Calendar New Event Monitor (checks on load + every 10 minutes for Staff/Admins)
  useEffect(() => {
    if (!isStaffOrAdmin) return;

    let isMounted = true;
    const viewId = catalog.incidentIqCalendarViewId || '534e7bd4-91df-f111-bf5b-6045bdb05b62';

    const runCalendarCheck = async () => {
      const result = await checkIncidentIqCalendarForNewEvents({
        viewId,
        alertSettings: activeCalendarAlertSettings,
        webhookUrl: catalog.emailWebhookUrl,
        sendEmailIfEnabled: true
      });

      if (!isMounted || !result?.newGroups || result.newGroups.length === 0) return;

      if (activeCalendarAlertSettings.soundEnabled) {
        playNotificationChime();
      }

      if (activeCalendarAlertSettings.popupEnabled) {
        setCalendarNewCount((prev) => prev + result.newGroups.length);
        setCalendarNewEventsToast(result.newGroups);
      }
    };

    // Run check 4 seconds after portal load, then every 10 minutes
    const initialTimer = setTimeout(runCalendarCheck, 4000);
    const intervalId = setInterval(runCalendarCheck, 10 * 60 * 1000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [isStaffOrAdmin, catalog.incidentIqCalendarViewId, catalog.calendarAlertSettings?.popupEnabled, catalog.calendarAlertSettings?.soundEnabled, catalog.calendarAlertSettings?.emailEnabled]);

  const handleUpdateCalendarAlertSettings = async (newAlertSettings) => {
    const updated = {
      ...catalog,
      calendarAlertSettings: {
        ...DEFAULT_CALENDAR_ALERT_SETTINGS,
        ...newAlertSettings
      }
    };
    setCatalog(updated);
    try {
      await saveCatalogSettings(updated);
    } catch (err) {
      console.error('Error saving calendar alert settings:', err);
    }
  };

  const handleTriggerTestCalendarAlert = (prefsToTest = activeCalendarAlertSettings) => {
    if (prefsToTest.soundEnabled) {
      playNotificationChime();
    }
    const sampleGroups = [
      {
        id: 'sample_event_1',
        title: 'SET UP FOR: All-School Chapel & Guest Speaker',
        campus: 'Centennial',
        room: 'Auditorium',
        firstStart: new Date(Date.now() + 86400000).toISOString(),
        setup: 30,
        breakdown: 15,
        count: 1
      }
    ];
    setCalendarNewCount((prev) => prev + 1);
    setCalendarNewEventsToast(sampleGroups);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Redesigned Header with All 6 Core Incident IQ Options */}
      <Navbar 
        user={user} 
        userProfile={userProfile}
        currentView={currentView} 
        calendarNewCount={calendarNewCount}
        setCurrentView={(view) => {
          setCurrentView(view);
          if (view === 'submit') setSelectedArea(null);
          if (view === 'calendar') setCalendarNewCount(0);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        <ErrorBoundary key={currentView} onReset={() => setCurrentView('submit')}>
        {/* Module 1: DASH (Incident IQ KPI Cockpit & Ticket Queue) */}
        {currentView === 'dashboard' && (
          <TicketDashboard 
            user={user} 
            userProfile={userProfile}
            catalog={catalog}
            onCatalogUpdate={(updated) => setCatalog(updated)}
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
                qrPrefill={qrPrefill}
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
            catalog={catalog}
            filterByMyTickets={true} 
            onNewTicket={() => setCurrentView('submit')}
          />
        )}

        {/* Module 3: ASSETS / FLEET INVENTORY (Technology Hardware, Lenovo Warranty Sync, 5-Yr Replacement) */}
        {currentView === 'assets' && (
          <AssetsView 
            catalog={catalog}
            user={user}
            userProfile={userProfile}
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

        {/* Module 7: CALENDAR (Incident IQ Facilities & Event Setup Schedule) */}
        {currentView === 'calendar' && (
          <FacilitiesCalendar 
            calendarViewId={catalog.incidentIqCalendarViewId || "534e7bd4-91df-f111-bf5b-6045bdb05b62"}
            calendarAlertSettings={activeCalendarAlertSettings}
            onUpdateCalendarAlertSettings={handleUpdateCalendarAlertSettings}
            onTriggerTestCalendarAlert={handleTriggerTestCalendarAlert}
            onUpdateCalendarViewId={async (newId, updatedAlertPrefs) => {
              const updated = {
                ...catalog,
                incidentIqCalendarViewId: newId,
                ...(updatedAlertPrefs ? { calendarAlertSettings: updatedAlertPrefs } : {})
              };
              setCatalog(updated);
              try {
                await saveCatalogSettings(updated);
              } catch (err) {
                console.error("Error saving calendar viewId:", err);
              }
            }}
            isAdmin={isStaffOrAdmin}
            onNavigateToSubmit={() => {
              setSelectedArea(null);
              setCurrentView('submit');
            }}
          />
        )}

        {/* Sub-view: Field & Issue Customizer (Admin Configuration) */}
        {currentView === 'customizer' && (
          <FieldCustomizer 
            catalog={catalog}
            onCatalogUpdate={(updated) => setCatalog(updated)}
          />
        )}
        </ErrorBoundary>
      </main>

      {/* Floating Pop-Up Toast for New Incident IQ Calendar Events */}
      {calendarNewEventsToast && calendarNewEventsToast.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md w-full px-4 sm:px-0 animate-fadeIn">
          <div className="bg-[#0b1c2d] text-white rounded-2xl shadow-2xl border-2 border-amber-400/90 overflow-hidden">
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <CalendarIcon className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-amber-400">
                    New Facility Calendar Event{calendarNewEventsToast.length > 1 ? 's' : ''}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Detected from Incident IQ Schedule
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCalendarNewEventsToast(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 max-h-60 overflow-y-auto">
              {calendarNewEventsToast.slice(0, 3).map((ev, idx) => (
                <div key={ev.id || idx} className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
                  <div className="font-bold text-white flex items-center justify-between gap-2">
                    <span className="truncate">{ev.title}</span>
                    {ev.count > 1 && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 flex-shrink-0">
                        +{ev.count} dates
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    {ev.campus} &bull; <span className="text-amber-300 font-semibold">{ev.room}</span>
                  </div>
                  {ev.firstStart && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Starts: {new Date(ev.firstStart).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              ))}
              {calendarNewEventsToast.length > 3 && (
                <div className="text-[11px] text-slate-400 text-center">
                  +{calendarNewEventsToast.length - 3} more new event group(s) added
                </div>
              )}
            </div>

            {/* Quick Action & One-Tap Silence Bar */}
            <div className="px-4 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateCalendarAlertSettings({
                    ...activeCalendarAlertSettings,
                    soundEnabled: !activeCalendarAlertSettings.soundEnabled
                  })}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  title={activeCalendarAlertSettings.soundEnabled ? 'Mute audio chime for future calendar alerts' : 'Unmute audio chime'}
                >
                  {activeCalendarAlertSettings.soundEnabled ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mute Chime</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Chime Muted</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleUpdateCalendarAlertSettings({
                      ...activeCalendarAlertSettings,
                      popupEnabled: false
                    });
                    setCalendarNewEventsToast(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  title="Silence pop-up banners (you can re-enable anytime in Calendar > Filter & Alert Settings)"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  <span>Silence Pop-Ups</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCalendarNewEventsToast(null);
                  setCalendarNewCount(0);
                  setCurrentView('calendar');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm transition-colors"
              >
                <span>View Calendar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#0b1c2d] border-t border-slate-800 text-slate-400 py-6 text-xs text-center mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white">WCA Helpdesk</span>
            <span>•</span>
            <span>Wesleyan Christian Academy Service Portal</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span>DASH</span>
            <span>•</span>
            <span>TICKETS</span>
            <span>•</span>
            <span>CALENDAR</span>
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
