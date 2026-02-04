import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, Box, Hexagon, Shield, Shuffle, Clock, Calendar, BarChart3, Wrench, Menu, X } from 'lucide-react';

import { service } from '../services';
import { Entity } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const loadEntities = async () => {
    const data = await service.getEntities();
    // Sort entities in ascending alphanumeric order (natural sort)
    const sortedData = data.sort((a, b) => {
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    setEntities(sortedData);
  };

  useEffect(() => {
    loadEntities();
    window.addEventListener('storage', loadEntities);
    window.addEventListener('entity-updated', loadEntities);
    return () => {
      window.removeEventListener('storage', loadEntities);
      window.removeEventListener('entity-updated', loadEntities);
    };
  }, []);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Left Navigation */}
      <aside className={`
        w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-300 z-50
        fixed lg:static inset-y-0 left-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100">
          <div className="flex items-center gap-2 overflow-hidden rounded-2xl bg-white border border-indigo-50 shadow-sm">
            <img src="/favicon.png" alt="CMHW Logo" className="w-14 h-14 object-contain scale-125" />
          </div>
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Nav Area */}
        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-8 scrollbar-hide">
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <Link
              to="/"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${location.pathname === '/'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <LayoutDashboard size={18} className={location.pathname === '/' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
              <span className="text-sm font-medium">Dashboard</span>
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${location.pathname === '/admin'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <Shield size={18} className={location.pathname === '/admin' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className="text-sm font-medium">Admin Panel</span>
              </Link>
            )}

            {(isAdmin || user?.role === 'MAILER') && (
              <Link
                to="/proxy-partition"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${location.pathname === '/proxy-partition'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <Shuffle size={18} className={location.pathname === '/proxy-partition' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className="text-sm font-medium">Proxy Partition</span>
              </Link>
            )}

            {(isAdmin || user?.role === 'MAILER_CMHW' || user?.role === 'MAILER') && (
              <Link
                to="/team-planning"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${location.pathname === '/team-planning'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <Calendar size={18} className={location.pathname === '/team-planning' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className="text-sm font-medium">Team Planning</span>
              </Link>
            )}

            {(isAdmin || user?.role === 'MAILER') && (
              <Link
                to="/dashboard-reporting"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${location.pathname === '/dashboard-reporting'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <BarChart3 size={18} className={location.pathname === '/dashboard-reporting' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className="text-sm font-medium">Dashboard Reporting</span>
              </Link>
            )}

            <Link
              to="/tools"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${location.pathname === '/tools'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Wrench size={18} className={location.pathname === '/tools' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
              <span className="text-sm font-medium">Tools</span>
            </Link>

            {(isAdmin || user?.role === 'MAILER') && (
              <Link
                to="/history"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${location.pathname === '/history'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <Clock size={18} className={location.pathname === '/history' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className="text-sm font-medium">Change History</span>
              </Link>
            )}

            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Entities
              </p>
            </div>

            {entities.filter(entity => entity.status !== 'inactive').map(entity => {
              const isActive = location.pathname === `/entity/${entity.id}`;
              return (
                <Link
                  key={entity.id}
                  to={`/entity/${entity.id}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${isActive
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <Box size={20} className={isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
                  <span className="truncate text-sm">{entity.name}</span>
                  {isActive && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-2">
          {user && (
            <div className="px-3 py-2 bg-indigo-50 rounded-lg flex items-center gap-3">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.username || 'User'}
                  className="w-8 h-8 rounded-full shadow-sm shadow-indigo-200 ring-1 ring-white object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-indigo-200 ring-1 ring-white">
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="overflow-hidden">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-indigo-900 truncate">{(user.username || 'User').toUpperCase()}</span>
                  {isAdmin && (
                    <Shield size={10} className="text-indigo-600 shrink-0" />
                  )}
                </div>
                <span className="text-[10px] text-indigo-600 font-medium uppercase block">{user.role}</span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-gray-500 hover:text-red-600 hover:bg-red-50 px-3"
            leftIcon={<LogOut size={18} />}
          >
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm/50 backdrop-blur-sm bg-white/90">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900 p-2 -ml-2"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-sm sm:text-base lg:text-lg font-bold text-gray-800 capitalize tracking-tight truncate">
              {location.pathname === '/' ? 'Overview' :
                location.pathname === '/admin' ? 'Admin Panel' :
                  location.pathname === '/history' ? 'Change History' :
                    location.pathname === '/proxy-partition' ? 'Proxy Partition' :
                      location.pathname === '/team-planning' ? 'Team Planning' :
                        location.pathname === '/simulation-excel' ? 'Simulation Excel' :
                          location.pathname === '/dashboard-reporting' ? 'Dashboard Reporting' :
                            location.pathname === '/tools' ? 'Tools' :
                              entities.find(e => `/entity/${e.id}` === location.pathname)?.name || 'Entity Details'}
            </h2>
            {location.pathname !== '/' && location.pathname !== '/admin' && (
              <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-md border border-green-100 hidden md:inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden md:block text-sm text-right">
              <p className="font-semibold text-gray-800 text-xs">{(user?.username || 'User').toUpperCase()}</p>
              <p className="text-[10px] text-green-600 flex items-center justify-end gap-1 font-medium uppercase tracking-wide">
                {user?.role || 'Guest'}
              </p>
            </div>
            {user?.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.username || 'User'}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full shadow-md shadow-indigo-200 ring-2 ring-white object-cover"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-200 ring-2 ring-white">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className={`flex-1 overflow-y-auto scroll-smooth ${location.pathname === '/dashboard-reporting' ? 'p-2 sm:p-4' :
            location.pathname === '/tools' ? 'p-0' :
              'p-4 sm:p-6 lg:p-8'
          }`}>
          <div className={`${location.pathname === '/proxy-partition' ||
            location.pathname === '/dashboard-reporting' ||
            location.pathname === '/tools' ||
            location.pathname === '/team-planning' ||
            location.pathname.startsWith('/entity/')
            ? 'w-full' : 'max-w-7xl mx-auto'
            }`}>
            {children}
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};