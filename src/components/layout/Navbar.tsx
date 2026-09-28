import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Settings, Menu, X, Film, Tv, Compass, Home as HomeIcon, Info, Sparkles, Bookmark } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useSettings } from '../../context/SettingsContext';
import { getMyList, MY_LIST_UPDATED_EVENT } from '../../services/myList';

interface NavLinkItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: 'Home', path: '/', icon: HomeIcon },
  { label: 'Movies', path: '/movies', icon: Film },
  { label: 'TV Shows', path: '/tv', icon: Tv },
  { label: 'My List', path: '/my-list', icon: Bookmark },
  { label: 'Nova AI', path: '/nova-ai', icon: Sparkles },
  { label: 'Genres', path: '/genres', icon: Compass },
  { label: 'Search', path: '/search', icon: Search },
  { label: 'About', path: '/about', icon: Info },
];

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [myListCount, setMyListCount] = useState(() => getMyList().length);
  const navigate = useNavigate();
  const location = useLocation();
  const { isSettingsOpen, toggleSettings, setIsSettingsOpen } = useSettings();

  useEffect(() => {
    const handleListUpdate = () => {
      setMyListCount(getMyList().length);
    };
    window.addEventListener(MY_LIST_UPDATED_EVENT, handleListUpdate);
    window.addEventListener('storage', handleListUpdate);
    return () => {
      window.removeEventListener(MY_LIST_UPDATED_EVENT, handleListUpdate);
      window.removeEventListener('storage', handleListUpdate);
    };
  }, []);

  // Handle scroll effect for glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        isScrolled
          ? 'bg-[#08090C]/85 backdrop-blur-md border-b border-white/[0.06] shadow-glass'
          : 'bg-gradient-to-b from-[#08090C]/90 via-[#08090C]/40 to-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo on the left */}
          <div className="flex-shrink-0 flex items-center">
            <Logo size="md" />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-white bg-white/[0.08] shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }`
                }
              >
                <span>{link.label}</span>
                {link.label === 'My List' && myListCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[var(--nova-accent)]/20 text-[var(--nova-accent)] border border-[var(--nova-accent)]/30">
                    {myListCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Desktop Right Actions: Nova AI & Settings */}
          <div className="hidden md:flex items-center space-x-3">
            <NavLink
              to="/nova-ai"
              data-cursor="button"
              aria-label="Nova AI Assistant"
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 shadow-sm ${
                  isActive
                    ? 'bg-[var(--nova-accent)] text-zinc-950 border-[var(--nova-accent)] shadow-[var(--nova-accent)]/20'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white border-white/[0.12] hover:border-[var(--nova-accent)]/50'
                }`
              }
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--nova-accent)] animate-pulse" />
              <span>Nova AI</span>
            </NavLink>

            <button
              type="button"
              onClick={toggleSettings}
              data-cursor="button"
              aria-label="Open Settings Panel"
              className={`p-2 rounded-full transition-all duration-200 border ${
                isSettingsOpen
                  ? 'text-[var(--nova-accent)] bg-white/[0.1] border-[var(--nova-accent)] shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] border-transparent hover:border-white/[0.08]'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Right Actions: Nova AI, Search & Menu Button */}
          <div className="flex md:hidden items-center space-x-1">
            <button
              type="button"
              onClick={() => navigate('/nova-ai')}
              aria-label="Nova AI Assistant"
              className="p-2 text-[var(--nova-accent)] hover:text-white rounded-lg focus:outline-none transition-colors"
            >
              <Sparkles className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/search')}
              aria-label="Search"
              className="p-2 text-zinc-400 hover:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--nova-accent)]/50 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              aria-expanded={mobileMenuOpen}
              className="p-2 text-zinc-400 hover:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--nova-accent)]/50 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden border-b border-white/[0.08] bg-[#0B0D12]/95 backdrop-blur-xl px-4 pt-2 pb-6 shadow-2xl"
          >
            <div className="flex flex-col space-y-1">
              {NAV_LINKS.map((link) => {
                const IconComponent = link.icon;
                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-white/[0.08] text-white border-l-2 border-[var(--nova-accent)]'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                      }`
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent className="w-4 h-4 text-zinc-400" />
                      <span>{link.label}</span>
                    </div>
                    {link.label === 'My List' && myListCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--nova-accent)]/20 text-[var(--nova-accent)] border border-[var(--nova-accent)]/30">
                        {myListCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}

              <div className="pt-2 mt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <span>Settings & Preferences</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};
