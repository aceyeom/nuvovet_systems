import React from 'react';
import { Activity, Search, ClipboardList, ShieldAlert, User } from 'lucide-react';

export const Sidebar = () => {
  return (
    <nav className="w-16 bg-slate-950 flex flex-col items-center py-6 border-r border-slate-800 shrink-0">
      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-10">
        <Activity size={20} />
      </div>
      <div className="flex flex-col gap-8 text-slate-600">
        <Search size={20} className="hover:text-white cursor-pointer" />
        <ClipboardList size={20} className="text-white" />
        <ShieldAlert size={20} className="hover:text-white cursor-pointer" />
        <User size={20} className="hover:text-white cursor-pointer" />
      </div>
    </nav>
  );
};
