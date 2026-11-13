import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Upload, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Camera, 
  HelpCircle, 
  Building2, 
  MapPin, 
  Tag, 
  AlertTriangle,
  FileText,
  RefreshCw
} from 'lucide-react';
import { URGENCY_LEVELS, BUILDINGS, DEFAULT_PLACES } from '../data/categoriesData';
import { submitTicket } from '../services/firebase';

export default function TicketSubmissionForm({ area, buildingsList, placesList, user, onBack, onTicketCreated }) {
  const locations = placesList && placesList.length > 0 ? placesList : DEFAULT_PLACES;
  const [selectedPlaceId, setSelectedPlaceId] = useState(locations[0]?.id || 'centennial');
  
  const currentPlace = locations.find((p) => p.id === selectedPlaceId) || locations[0];
  const roomsForPlace = currentPlace?.rooms && currentPlace.rooms.length > 0
    ? currentPlace.rooms
    : ['Baseball Field', 'Gymnasium', 'Cafeteria / Dining Hall', 'Main Office', 'Media Center / Library', 'Room 101', 'Room 102', 'Room 103'];

  const [selectedRoom, setSelectedRoom] = useState(roomsForPlace[0] || 'Baseball Field');
  const [customRoom, setCustomRoom] = useState('');
  const [assetType, setAssetType] = useState(area.assetTypes[0]?.name || '');
  const [assetTag, setAssetTag] = useState('');

  const handleLocationChange = (placeId) => {
    setSelectedPlaceId(placeId);
    const place = locations.find((p) => p.id === placeId) || locations[0];
    const placeRooms = place?.rooms && place.rooms.length > 0 ? place.rooms : ['Baseball Field', 'Gymnasium', 'Main Office', 'Room 101'];
    setSelectedRoom(placeRooms[0] || 'Room 101');
    setCustomRoom('');
  };
  
  // Issue selection
  const [selectedIssue, setSelectedIssue] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('medium');
  
  // Attachments & Live Camera
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const nativeCameraInputRef = useRef(null);
  
  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successTicket, setSuccessTicket] = useState(null);

  const isCustomIssue = selectedIssue === 'Issue Not Listed';

  const handleIssueSelect = (issue) => {
    setSelectedIssue(issue);
    if (issue !== 'Issue Not Listed' && !customTitle) {
      setCustomTitle(issue);
    }
  };

  const addSelectedFiles = (selectedList) => {
    if (!selectedList || selectedList.length === 0) return;
    if (selectedList.length + files.length > 5) {
      setErrorMsg('You can attach a maximum of 5 photos or documents.');
      return;
    }

    const newFiles = [...files, ...selectedList];
    setFiles(newFiles);

    const newPreviews = selectedList.map((file) => ({
      name: file.name,
      type: file.type || '',
      isImage: (file.type || '').startsWith('image/'),
      url: URL.createObjectURL(file),
      size: (file.size / 1024).toFixed(0) + ' KB'
    }));
    setFilePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    addSelectedFiles(selected);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Stop active camera stream
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopCameraStream();
  }, []);

  // Open live camera viewfinder (or fallback to native camera input)
  const startCamera = async (preferredFacing = cameraFacing) => {
    setCameraError('');
    stopCameraStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback directly to native OS camera input
      nativeCameraInputRef.current?.click();
      return;
    }

    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: preferredFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Webcam error, falling back to any available camera:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (err2) {
        setCameraError('Could not access camera stream. Click "Use Device Camera / File Picker" below.');
      }
    }
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setShowCameraModal(false);
    setCameraError('');
  };

  const handleToggleCameraFacing = () => {
    const next = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(next);
    startCamera(next);
  };

  const handleSnapPhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const fileName = `ticket_photo_${Date.now()}.jpg`;
      const capturedFile = new File([blob], fileName, { type: 'image/jpeg' });
      addSelectedFiles([capturedFile]);
      handleCloseCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const isOtherRoom = selectedRoom === '__OTHER__';
    const finalRoom = isOtherRoom ? customRoom.trim() : selectedRoom;

    if (!finalRoom) {
      setErrorMsg('Please select or specify a room number or facility.');
      return;
    }

    if (!selectedIssue) {
      setErrorMsg('Please choose an issue or select "Issue Not Listed".');
      return;
    }

    const finalTitle = isCustomIssue ? customTitle.trim() : (customTitle.trim() || selectedIssue);
    if (!finalTitle) {
      setErrorMsg('Please enter a brief title or summary of the issue.');
      return;
    }

    if (isCustomIssue && !description.trim()) {
      setErrorMsg('Please provide a brief description of the issue.');
      return;
    }

    setIsSubmitting(true);

    try {
      const ticketNumber = `TICK-${Date.now().toString().slice(-6)}`;
      const payload = {
        ticketNumber,
        areaId: area.id,
        areaName: area.name,
        location: currentPlace.name,
        building: currentPlace.name, // backward compatibility
        locationAddress: currentPlace.address || '',
        room: finalRoom,
        roomLocation: finalRoom, // backward compatibility
        assetType,
        assetTag: assetTag.trim() || 'N/A',
        selectedIssue,
        title: finalTitle,
        description: description.trim() || selectedIssue,
        urgency,
        createdByEmail: user?.email || 'guest@wcatrojans.org',
        createdByName: user?.displayName || user?.email || 'WCA Staff / Guest',
        createdByPhoto: user?.photoURL || null,
        createdById: user?.uid || 'guest'
      };

      const result = await submitTicket(payload, files);
      setSuccessTicket(result);
      if (onTicketCreated) onTicketCreated(result);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to submit ticket. Check connection or try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successTicket) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 sm:p-10">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Ticket Logged Successfully
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-4">
            Ticket #{successTicket.ticketNumber}
          </h2>
          <p className="mt-2 text-slate-600 text-sm max-w-md mx-auto">
            Your <span className="font-semibold text-slate-900">{area.name}</span> request has been routed to our staff queue. We will keep you updated.
          </p>

          <div className="mt-6 bg-slate-50 rounded-xl p-4 text-left border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Department:</span>
              <span className="font-semibold">{area.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Location:</span>
              <span className="font-semibold">{successTicket.location || successTicket.building} • {successTicket.room || successTicket.roomLocation}</span>
            </div>
            {successTicket.locationAddress && (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Address:</span>
                <span className="text-slate-600">{successTicket.locationAddress}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Asset:</span>
              <span className="font-semibold">{successTicket.assetType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Issue:</span>
              <span className="font-semibold">{successTicket.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Urgency:</span>
              <span className="font-semibold uppercase text-amber-700">{successTicket.urgency}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setSuccessTicket(null);
                setSelectedIssue('');
                setCustomTitle('');
                setDescription('');
                setSelectedRoom(roomsForPlace[0] || 'Room 101');
                setCustomRoom('');
                setAssetTag('');
                setFiles([]);
                setFilePreviews([]);
              }}
              className="py-2.5 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition-all"
            >
              Submit Another Ticket
            </button>
            <button
              onClick={onBack}
              className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-sm transition-all"
            >
              Back to Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Navigation / Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Choose Different Department</span>
        </button>
        <span className={`text-xs px-3 py-1 rounded-full font-bold border ${area.badgeColor}`}>
          {area.name}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Department Banner Header */}
        <div className={`p-6 bg-gradient-to-r ${area.bannerGradient} text-white`}>
          <h2 className="text-2xl font-extrabold tracking-tight">
            New {area.shortName} Ticket
          </h2>
          <p className="text-slate-100 text-xs sm:text-sm mt-1 opacity-90">
            {area.tagline}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-7">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Section 1: Location & Asset */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span>1. Location & Asset Info</span>
            </h3>

            <div className="space-y-4">
              {/* Field 1: Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>Location</span>
                    <span className="text-red-500">*</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Select Campus Location
                  </span>
                </label>
                <select
                  value={selectedPlaceId}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white font-semibold text-slate-900 shadow-sm"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} — {loc.address}
                    </option>
                  ))}
                </select>
                {currentPlace?.address && (
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span><strong className="text-slate-800">{currentPlace.name}:</strong> {currentPlace.address}</span>
                  </p>
                )}
              </div>

              {/* Field 2: Room # / Facility (Attached to the selected Location) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Room # / Facility</span>
                    <span className="text-red-500">*</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {roomsForPlace.length} rooms & facilities at {currentPlace?.name}
                  </span>
                </label>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white font-medium text-slate-900 shadow-sm"
                >
                  {roomsForPlace.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                  <option value="__OTHER__">+ Other / Specific Room or Area (Type Below)...</option>
                </select>

                {selectedRoom === '__OTHER__' && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Room 214B, Batting Cages, Press Box, Storage Closet"
                      value={customRoom}
                      onChange={(e) => setCustomRoom(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-400 bg-amber-50/40 text-sm focus:ring-2 focus:ring-amber-500 text-slate-900 placeholder:text-slate-400 font-medium shadow-inner"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Asset Category & Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asset Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white font-medium"
                  >
                    {area.assetTypes.map((a) => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asset Tag / Barcode / Device ID <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. #10452, Dell Serial, or N/A"
                    value={assetTag}
                    onChange={(e) => setAssetTag(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Pre-defined Issue Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-500" />
                <span>2. Select the Issue</span>
              </h3>
              <span className="text-xs text-slate-400">Click to choose</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {area.predefinedIssues.map((issue) => {
                const isSelected = selectedIssue === issue;
                const isNotListed = issue === 'Issue Not Listed';
                return (
                  <button
                    key={issue}
                    type="button"
                    onClick={() => handleIssueSelect(issue)}
                    className={`text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-all flex items-center justify-between ${
                      isSelected
                        ? isNotListed
                          ? 'bg-amber-100 border-amber-500 text-amber-950 font-bold ring-2 ring-amber-400/50 shadow-sm'
                          : 'bg-amber-50 border-amber-500 text-amber-900 font-bold ring-2 ring-amber-400/50 shadow-sm'
                        : isNotListed
                          ? 'bg-slate-50 border-dashed border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-100'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{issue}</span>
                    {isSelected && <CheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Custom / Detailed Issue Fields */}
            {(isCustomIssue || selectedIssue) && (
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Issue Title / Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Short summary of the issue"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Additional Details & Description {isCustomIssue && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide any helpful context, error messages, or specific instructions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Urgency */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>3. Urgency & Impact</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {URGENCY_LEVELS.map((u) => {
                const isSelected = urgency === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUrgency(u.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `${u.color} ring-2 ring-slate-900 shadow-sm font-bold`
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-extrabold uppercase">{u.label}</div>
                    <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">{u.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 4: Attach Photos / Documents & Camera Capture */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-amber-500" />
              <span>4. Take Photo or Attach Document / Picture (Optional)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Snap a live picture with your camera or upload up to 5 files (JPG, PNG, PDF, Word, Excel) to help technicians identify the issue.
            </p>

            {/* Hidden Native Camera Input (for mobile phones/tablets or direct OS camera) */}
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-3">
              {/* 1. Take Photo with Camera Button */}
              <button
                type="button"
                onClick={() => startCamera('environment')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-950 cursor-pointer transition-all text-xs font-extrabold shadow-xs"
              >
                <Camera className="w-4 h-4 text-amber-600" />
                <span>Take Photo (Camera)</span>
              </button>

              {/* 2. Upload Picture or Document Button */}
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 cursor-pointer transition-colors text-xs font-semibold">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Upload Picture or Document</span>
                <input
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Attached Previews */}
            {filePreviews.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {filePreviews.map((file, idx) => (
                  <div
                    key={idx}
                    className="relative group flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-2 pr-8 shadow-xs"
                  >
                    {file.isImage ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0 max-w-[140px]">
                      <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400">{file.size}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submitter info notice */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Submitting as: <strong className="text-slate-900">{user?.displayName || user?.email || 'WCA Staff Member'}</strong></span>
            </div>
            <span className="text-[11px] text-slate-400">{user?.email || 'Auto-linked'}</span>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-base text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit {area.shortName} Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Live Camera Capture Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-[#0b1c2d] px-5 py-3.5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm tracking-wide">Take Ticket Photo</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseCamera}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {cameraError ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-3 text-center">
                  <p className="font-semibold">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseCamera();
                      nativeCameraInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Open Device Camera / File Picker</span>
                  </button>
                </div>
              ) : (
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleToggleCameraFacing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Flip Camera</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseCamera}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  {!cameraError && (
                    <button
                      type="button"
                      onClick={handleSnapPhoto}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap Photo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
