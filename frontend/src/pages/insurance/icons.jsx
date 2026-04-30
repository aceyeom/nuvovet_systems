import React from 'react';

const Icon = ({ children, size = 16, stroke = 1.5, ...rest }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round"
    {...rest}
  >{children}</svg>
);

export const I = {
  Home: (p) => <Icon {...p}><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></Icon>,
  Validate: (p) => <Icon {...p}><path d="M9 12l2 2 4-4"/><path d="M12 3l9 4-1 9c-.5 4-4 6-8 8-4-2-7.5-4-8-8L4 7l8-4z"/></Icon>,
  Hospital: (p) => <Icon {...p}><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M10 11h4"/><path d="M12 9v4"/><path d="M9 21v-5h6v5"/></Icon>,
  Tag: (p) => <Icon {...p}><path d="M20 12l-8 8a2 2 0 0 1-3 0l-7-7V4h6l8 8a2 2 0 0 1 0 3z"/><circle cx="7.5" cy="7.5" r="1"/></Icon>,
  Anomaly: (p) => <Icon {...p}><path d="M3 17l4-7 5 4 4-9 5 13"/></Icon>,
  Report: (p) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h4"/></Icon>,
  Settings: (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></Icon>,
  Search: (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Icon>,
  Bell: (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></Icon>,
  ChevronDown: (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>,
  ChevronRight: (p) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>,
  ChevronLeft: (p) => <Icon {...p}><path d="M15 6l-6 6 6 6"/></Icon>,
  ChevronUp: (p) => <Icon {...p}><path d="M6 15l6-6 6 6"/></Icon>,
  ArrowUp: (p) => <Icon {...p}><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></Icon>,
  ArrowDown: (p) => <Icon {...p}><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></Icon>,
  ArrowRight: (p) => <Icon {...p}><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></Icon>,
  X: (p) => <Icon {...p}><path d="M18 6L6 18"/><path d="M6 6l12 12"/></Icon>,
  Plus: (p) => <Icon {...p}><path d="M12 5v14"/><path d="M5 12h14"/></Icon>,
  Filter: (p) => <Icon {...p}><path d="M3 4h18l-7 9v6l-4 2v-8z"/></Icon>,
  Download: (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></Icon>,
  AlertTriangle: (p) => <Icon {...p}><path d="M12 3l10 18H2z"/><path d="M12 9v5"/><circle cx="12" cy="17.5" r="0.5"/></Icon>,
  AlertCircle: (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><circle cx="12" cy="16" r="0.5"/></Icon>,
  Info: (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.5"/></Icon>,
  Check: (p) => <Icon {...p}><path d="M5 12l5 5L20 7"/></Icon>,
  CheckCircle: (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-5"/></Icon>,
  TrendingDown: (p) => <Icon {...p}><path d="M3 7l7 7 4-4 7 7"/><path d="M21 17v-4h-4"/></Icon>,
  TrendingUp: (p) => <Icon {...p}><path d="M3 17l7-7 4 4 7-7"/><path d="M21 7v4h-4"/></Icon>,
  FileText: (p) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/></Icon>,
  Eye: (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></Icon>,
  Share: (p) => <Icon {...p}><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.6 10.5l6.8-3"/><path d="M8.6 13.5l6.8 3"/></Icon>,
  MoreV: (p) => <Icon {...p}><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></Icon>,
  Building: (p) => <Icon {...p}><path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16"/><path d="M4 21h16"/><path d="M9 9h.01"/><path d="M14 9h.01"/><path d="M9 13h.01"/><path d="M14 13h.01"/><path d="M9 17h6"/></Icon>,
  Users: (p) => <Icon {...p}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M21 18c0-2-1.5-3.5-4-3.5"/></Icon>,
  Database: (p) => <Icon {...p}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.5 3.5 3 8 3s8-1.5 8-3V5"/><path d="M4 11v6c0 1.5 3.5 3 8 3s8-1.5 8-3v-6"/></Icon>,
  Key: (p) => <Icon {...p}><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9"/><path d="M16 7l3 3"/></Icon>,
  Shield: (p) => <Icon {...p}><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/></Icon>,
  CreditCard: (p) => <Icon {...p}><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/></Icon>,
  Clock: (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>,
  Calendar: (p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></Icon>,
  Hash: (p) => <Icon {...p}><path d="M5 9h14"/><path d="M5 15h14"/><path d="M10 4l-2 16"/><path d="M16 4l-2 16"/></Icon>,
  Sparkle: (p) => <Icon {...p}><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></Icon>,
  Pin: (p) => <Icon {...p}><path d="M16 3l5 5-3 1-3 6-3-3-6 6 6-6-3-3 6-3 1-3z"/></Icon>,
  Inbox: (p) => <Icon {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/></Icon>,
};
