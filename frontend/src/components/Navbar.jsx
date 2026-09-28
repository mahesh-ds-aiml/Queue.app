import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LiveQueueBadge } from './LiveQueueBadge';
import { Printer, PlusCircle, ListOrdered, ShieldCheck, LogOut, User as UserIcon } from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab, onOpenAuthModal }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab(user?.role === 'owner' ? 'owner-dashboard' : 'new-order')}>
            <div className="w-10 h-10 rounded-xl gradient-header flex items-center justify-center text-white shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-900">Print<span className="text-blue-600">Q</span></span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 tracking-wider">College Xerox</span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Zero-Queue Smart Document Printing</p>
            </div>
          </div>

          {/* Center Queue Status Badge */}
          <div className="hidden md:block">
            <LiveQueueBadge />
          </div>

          {/* Right Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                {user.role === 'student' && (
                  <>
                    <button
                      onClick={() => setActiveTab('new-order')}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        activeTab === 'new-order'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">New Order</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('my-orders')}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        activeTab === 'my-orders'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <ListOrdered className="w-4 h-4" />
                      <span className="hidden sm:inline">My Orders</span>
                    </button>
                  </>
                )}

                {user.role === 'owner' && (
                  <button
                    onClick={() => setActiveTab('owner-dashboard')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Owner Dashboard</span>
                  </button>
                )}

                {/* User Dropdown / Logout */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="text-right hidden lg:block">
                    <div className="text-xs font-bold text-slate-900">{user.name}</div>
                    <div className="text-[10px] text-slate-500">{user.register_number || user.role}</div>
                  </div>
                  <button
                    onClick={logout}
                    title="Logout"
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
              >
                <UserIcon className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Live Queue Bar */}
      <div className="md:hidden py-1.5 px-4 bg-slate-50 border-t border-slate-100 flex justify-center">
        <LiveQueueBadge />
      </div>
    </header>
  );
};
