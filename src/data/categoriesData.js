export const AREAS = [
  {
    id: 'facilities',
    name: 'Facilities & Maintenance',
    shortName: 'Facilities',
    tagline: 'HVAC, plumbing, electrical, doors, furniture & building repairs',
    icon: 'Wrench',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    accentColor: 'border-amber-500',
    bannerGradient: 'from-amber-600 to-amber-800',
    buttonColor: 'bg-amber-600 hover:bg-amber-700 text-white',
    assetTypes: [
      { id: 'hvac', name: 'HVAC / Climate Control (AC, Heat, Vents)' },
      { id: 'electrical', name: 'Electrical & Lighting (Lights, Outlets, Breakers)' },
      { id: 'plumbing', name: 'Plumbing (Sinks, Toilets, Water Fountains, Leaks)' },
      { id: 'doors_windows', name: 'Doors, Locks, Windows & Hardware' },
      { id: 'furniture', name: 'Furniture & Fixtures (Desks, Chairs, Cabinets)' },
      { id: 'structural', name: 'Structural (Ceiling Tiles, Walls, Flooring, Paint)' },
      { id: 'grounds', name: 'Grounds, Parking Lot & Exterior' },
      { id: 'general_facility', name: 'General Facility / Other' }
    ],
    predefinedIssues: [
      'Room is too hot',
      'Room is too cold',
      'Light bulb out / fixture flickering',
      'Leaking faucet / running toilet / drain clogged',
      'Door lock jammed / door will not latch',
      'Electrical outlet has no power / tripped breaker',
      'Broken desk or chair (safety hazard)',
      'Ceiling tile damaged or water-stained',
      'Window blind or latch broken',
      'Issue Not Listed'
    ]
  },
  {
    id: 'housekeeping',
    name: 'Housekeeping & Custodial',
    shortName: 'Housekeeping',
    tagline: 'Spills, restroom restocking, trash, sanitization & floor care',
    icon: 'Sparkles',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    accentColor: 'border-emerald-500',
    bannerGradient: 'from-emerald-600 to-emerald-800',
    buttonColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    assetTypes: [
      { id: 'restroom', name: 'Restroom Facilities' },
      { id: 'classroom', name: 'Classroom / Lab' },
      { id: 'hallway', name: 'Hallways & Stairwells' },
      { id: 'cafeteria', name: 'Cafeteria / Dining Commons' },
      { id: 'gym', name: 'Gymnasium / Locker Rooms' },
      { id: 'dispenser', name: 'Supplies & Sanitizer Dispensers' },
      { id: 'trash_waste', name: 'Trash & Recycling Disposal' },
      { id: 'general_custodial', name: 'General Custodial Area' }
    ],
    predefinedIssues: [
      'Urgent liquid spill / slip hazard',
      'Restroom out of toilet paper / paper towels',
      'Restroom out of hand soap / hand sanitizer',
      'Restroom requires urgent sanitization',
      'Trash / recycling can overflowing',
      'Floor needs urgent mopping / vacuuming',
      'Carpet spill / spot removal needed',
      'Pest / insect sighting or odor issue',
      'Whiteboard / chalkboard needs deep cleaning',
      'Issue Not Listed'
    ]
  },
  {
    id: 'itsm',
    name: 'ITSM / Technology Support',
    shortName: 'IT Support',
    tagline: 'Chromebooks, laptops, displays, Wi-Fi, printers & accounts',
    icon: 'Laptop',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    accentColor: 'border-blue-500',
    bannerGradient: 'from-blue-700 to-indigo-900',
    buttonColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    assetTypes: [
      { id: 'student_chromebook', name: 'Student Chromebook / Tablet' },
      { id: 'staff_laptop', name: 'Staff Laptop / Desktop Workstation' },
      { id: 'interactive_display', name: 'Interactive Display (Promethean / SMART / TV)' },
      { id: 'projector_audio', name: 'Projector, Soundbar & Microphones' },
      { id: 'printers', name: 'Printers & Workroom Copiers' },
      { id: 'network_wifi', name: 'Network, Wi-Fi & Ethernet' },
      { id: 'accounts_software', name: 'User Accounts, Google Workspace & Software' },
      { id: 'phones_intercom', name: 'VoIP Phone & Intercom' },
      { id: 'general_tech', name: 'General Technology / Other' }
    ],
    predefinedIssues: [
      'Device will not power on / battery not charging',
      'Cracked screen or physical device damage',
      'Wi-Fi connection dropped or slow',
      'Google Workspace password reset / login locked',
      'Interactive display has no video or no audio',
      'Printer offline / paper jam / replace toner',
      'Website blocked by web filter / approval needed',
      'New software install / extension request',
      'Classroom sound system / mic not working',
      'Issue Not Listed'
    ]
  }
];

export const URGENCY_LEVELS = [
  { id: 'low', label: 'Low', description: 'Minor convenience; normal turnaround', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'medium', label: 'Medium', description: 'Impacts work or class instruction', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'high', label: 'High', description: 'Significant disruption to teaching/learning', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'emergency', label: 'Emergency / Safety Hazard', description: 'Immediate safety or property danger (spill hazard, pipe burst, power loss)', color: 'bg-red-100 text-red-800 border-red-300' }
];

export const DEFAULT_PLACES = [
  {
    id: 'secondary',
    name: 'WCA Secondary School',
    type: 'High School / Middle School',
    address: '301 County Rd 11, Barrett, MN 56311',
    roomsCount: 48,
    leadTech: 'Jonathan Ruble',
    wings: 'Science Labs, High School Media Center, STEM & Industrial Tech, Auditorium, Varsity Gym'
  },
  {
    id: 'north_elem',
    name: 'WCA North Elementary',
    type: 'Elementary School',
    address: '411 1st St SE, Elbow Lake, MN 56531',
    roomsCount: 32,
    leadTech: 'Support Team',
    wings: 'Early Childhood, Kindergarten & Grades 1-4, Media Center, Multipurpose Gym'
  },
  {
    id: 'south_elem',
    name: 'WCA South Elementary',
    type: 'Elementary School',
    address: 'Kensington, MN',
    roomsCount: 28,
    leadTech: 'Support Team',
    wings: 'Elementary Classrooms, Cafeteria, Gymnasium, Nurse'
  },
  {
    id: 'district_office',
    name: 'District Administration Office',
    type: 'District Services',
    address: 'Barrett, MN 56311',
    roomsCount: 12,
    leadTech: 'Jonathan Ruble',
    wings: 'Superintendent Office, Business & Payroll Office, Central Server Room'
  }
];

export const BUILDINGS = DEFAULT_PLACES.map((p) => p.name);
