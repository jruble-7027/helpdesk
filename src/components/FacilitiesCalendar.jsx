import React, { useState, useRef, useEffect } from 'react';
import { Calendar, RefreshCw, ExternalLink, Printer, Sparkles, Building, Clock, Info, CheckCircle2, Sliders, X, Check, Code } from 'lucide-react';

export default function FacilitiesCalendar({ 
  onNavigateToSubmit, 
  calendarViewId = "534e7bd4-91df-f111-bf5b-6045bdb05b62", 
  onUpdateCalendarViewId,
  isAdmin = false 
}) {
  const [activeViewId, setActiveViewId] = useState(calendarViewId);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inputSnippetOrId, setInputSnippetOrId] = useState(calendarViewId);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    setActiveViewId(calendarViewId);
    setInputSnippetOrId(calendarViewId);
  }, [calendarViewId]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setLoading(false), 800);
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  const handleSaveFilter = async () => {
    let cleanId = inputSnippetOrId.trim();
    // Check if user pasted the full Incident IQ script with viewId: "..."
    const match = cleanId.match(/viewId\s*:\s*["']([^"']+)["']/i);
    if (match && match[1]) {
      cleanId = match[1].trim();
    }
    // Remove any trailing/leading quotes
    cleanId = cleanId.replace(/^["']|["']$/g, '');

    if (!cleanId) return;

    setActiveViewId(cleanId);
    setInputSnippetOrId(cleanId);
    if (onUpdateCalendarViewId) {
      await onUpdateCalendarViewId(cleanId);
    }
    setSaveSuccess(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowConfigModal(false);
    }, 1200);
  };

  // Safe, verified HTML payload that handles Incident IQ's FullCalendar without 500 error
  const calendarHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Incident IQ Setup Calendar</title>
  <link href="https://wcatrojans.incidentiq.com/media/css/public/Events.css" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: 'proxima-nova', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #ffffff;
      color: #0f172a;
    }
    #loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #64748b;
      font-size: 14px;
      gap: 12px;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #f59e0b;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    #public-calendar {
      min-height: 720px;
    }
    /* Brand-aligned styles */
    .fc .fc-toolbar-title {
      font-size: 1.35rem !important;
      font-weight: 800 !important;
      color: #0b1c2d !important;
      letter-spacing: -0.02em;
    }
    .fc .fc-button-primary {
      background-color: #f59e0b !important;
      border-color: #d97706 !important;
      color: #020617 !important;
      font-weight: 700 !important;
      text-transform: capitalize !important;
      border-radius: 8px !important;
      padding: 6px 14px !important;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      transition: all 0.15s ease;
    }
    .fc .fc-button-primary:hover {
      background-color: #d97706 !important;
      border-color: #b45309 !important;
    }
    .fc .fc-button-primary:disabled {
      background-color: #e2e8f0 !important;
      border-color: #cbd5e1 !important;
      color: #94a3b8 !important;
    }
    .fc .fc-button-active {
      background-color: #0b1c2d !important;
      border-color: #0b1c2d !important;
      color: #ffffff !important;
    }
    .fc .fc-daygrid-day-number {
      font-weight: 600 !important;
      color: #334155 !important;
      padding: 6px 8px !important;
    }
    .fc .fc-day-today {
      background-color: #fffbeb !important;
    }
    .fc .fc-col-header-cell {
      background-color: #f8fafc;
      padding: 8px 0 !important;
      font-weight: 700 !important;
      color: #475569 !important;
    }
    .event-outer {
      background-color: #0b1c2d;
      color: #ffffff;
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 11px;
      line-height: 1.3;
      border-left: 3px solid #f59e0b;
      cursor: pointer;
    }
    .event-outer:hover {
      background-color: #1e293b;
    }
    .event-time {
      font-weight: 700;
      color: #f59e0b;
    }
    .event-name {
      font-weight: 600;
    }
    .event-location {
      font-size: 10px;
      color: #94a3b8;
    }
    #event-info-popup {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.1);
      border-radius: 12px;
      padding: 16px;
      z-index: 9999;
    }
  </style>
</head>
<body>
  <div id="loading-state">
    <div class="spinner"></div>
    <div>Loading Incident IQ Facility & Setup Schedule...</div>
  </div>

  <div id="public-calendar" style="display: none;"></div>

  <script>
    var origin = "https://wcatrojans.incidentiq.com";
    var viewId = "${activeViewId || '534e7bd4-91df-f111-bf5b-6045bdb05b62'}";

    function hideLoader() {
      var loader = document.getElementById('loading-state');
      var cal = document.getElementById('public-calendar');
      if (loader) loader.style.display = 'none';
      if (cal) cal.style.display = 'block';
    }

    var payload = {
      FilterByProduct: true,
      ViewId: viewId
    };

    fetch(origin + "/api/event/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
    .then(function(res) {
      if (!res.ok) {
        throw new Error("HTTP error " + res.status);
      }
      return res.text();
    })
    .then(function(html) {
      var calContainer = document.getElementById('public-calendar');
      calContainer.innerHTML = html;
      hideLoader();

      // Load FullCalendar library dynamically
      var fullCalScript = document.createElement('script');
      fullCalScript.src = "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.7/index.global.min.js";
      fullCalScript.onload = function() {
        var scriptTag = document.getElementById('calendar-script');
        if (scriptTag) {
          var execScript = document.createElement('script');
          execScript.type = "text/javascript";
          execScript.textContent = scriptTag.innerText;
          document.head.appendChild(execScript);
        }
      };
      document.head.appendChild(fullCalScript);
    })
    .catch(function(err) {
      console.error("Error loading events calendar:", err);
      var loader = document.getElementById('loading-state');
      if (loader) {
        loader.innerHTML = '<div style="color:#ef4444; font-weight:600;">Unable to load schedule from Incident IQ.</div><div style="font-size:12px; margin-top:4px;">Please try refreshing or verify the View ID filter.</div>';
      }
    });
  </script>
</body>
</html>`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Cockpit */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Title & Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Facilities & Event Setup Calendar
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Live Incident IQ master schedule filtered for facility preparation, room setups, and housekeeping
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Incident IQ Live Sync
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                View ID: <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-bold">{activeViewId ? activeViewId.substring(0, 13) + '...' : 'Default'}</code>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Includes Setup & Breakdown Windows
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <button
                onClick={() => setShowConfigModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all shadow-sm"
                title="Configure Incident IQ View ID or paste new embed code"
              >
                <Sliders className="w-4 h-4 text-amber-700" />
                <span>Filter Settings</span>
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all shadow-sm"
              title="Refresh events from Incident IQ"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all shadow-sm"
              title="Print Current Calendar View"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Calendar</span>
            </button>

            <a
              href="https://wcatrojans.incidentiq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#0b1c2d] hover:bg-slate-800 text-amber-400 transition-all shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Incident IQ</span>
            </a>
          </div>

        </div>
      </div>

      {/* Embedded Incident IQ FullCalendar View */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden mb-6">
        <iframe
          key={refreshKey}
          ref={iframeRef}
          srcDoc={calendarHtml}
          title="Incident IQ Facilities & Setup Calendar"
          className="w-full h-[820px] border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-modals"
        />
      </div>

      {/* Facility & Housekeeping Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-slate-800 mb-0.5">Click for Room & Setup Details</h4>
            <p className="text-slate-500 leading-relaxed">
              Click on any event block to inspect assigned rooms, designated campus, and required setup/teardown minutes.
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-slate-800 mb-0.5">Customizable Incident IQ Filter</h4>
            <p className="text-slate-500 leading-relaxed">
              Admins can update the calendar filter anytime by clicking <span className="font-semibold text-slate-700">Filter Settings</span> above or pasting new embed code.
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-slate-800 mb-0.5">Unscheduled Setup Needed?</h4>
            <p className="text-slate-500 leading-relaxed mb-2">
              If an event or room requires urgent attention, submit a work order directly to Facilities or Housekeeping.
            </p>
            {onNavigateToSubmit && (
              <button
                onClick={onNavigateToSubmit}
                className="text-amber-600 hover:text-amber-700 font-bold underline"
              >
                Submit Ticket &rarr;
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Filter Configuration Modal for Admins */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="bg-[#0b1c2d] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base tracking-wide">Incident IQ Calendar Filter</h3>
              </div>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                If you ever change your calendar view or event filter inside Incident IQ, you can update it here. You can paste either the <span className="font-bold text-slate-800">raw View ID</span> or the <span className="font-bold text-slate-800">entire embedded script</span> provided by Incident IQ (we'll extract the ID automatically!).
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-amber-600" />
                  <span>Incident IQ View ID or Embed Code</span>
                </label>
                <textarea
                  rows={4}
                  value={inputSnippetOrId}
                  onChange={(e) => setInputSnippetOrId(e.target.value)}
                  placeholder="Paste View ID (e.g. 534e7bd4-91df-f111-bf5b-6045bdb05b62) or full Incident IQ embed code snippet..."
                  className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Current Active ID: <span className="font-mono text-slate-600">{activeViewId}</span>
                </p>
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-bold">Calendar filter updated and reloaded successfully!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFilter}
                  className="px-5 py-2 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition-colors shadow-md shadow-amber-500/20"
                >
                  Save & Apply Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}