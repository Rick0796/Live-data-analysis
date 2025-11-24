import React from 'react';
import { Activity, UserCircle, History, Menu } from 'lucide-react';
import { Tab } from '../types';

interface HeaderProps {
  onNavigateToDashboard?: () => void;
  setActiveTab: (tab: Tab) => void;
  onToggleHistory: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateToDashboard, setActiveTab, onToggleHistory, onToggleSidebar }) => {
  return (
    <header className="h-20 fixed top-0 w-full z-50 px-4 md:px-8 flex items-center justify-between backdrop-blur-xl border-b border-white/5 bg-[#050a14]/90 shadow-lg transition-all duration-300">
      
      {/* Left Section: Menu Toggle (Mobile) + Logo */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button 
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-gray-400 hover:text-white bg-white/5 rounded-lg border border-white/10"
        >
          <Menu className="w-6 h-6" />
        </button>

        <button 
          onClick={onNavigateToDashboard}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 group-hover:border-tech/50 transition-all duration-300">
             <Activity className="text-tech w-6 h-6" />
          </div>
          <div className="text-left hidden md:block">
              <h1 className="text-2xl font-bold tracking-wider font-sans group-hover:opacity-80 transition-opacity">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_15px_rgba(0,100,255,0.5)]">
                    凡哥科技
                  </span>
              </h1>
          </div>
          {/* Mobile Text Logo */}
          <span className="md:hidden text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            凡哥科技
          </span>
        </button>
      </div>
      
      {/* Right Section: Tools */}
      <div className="flex items-center gap-2 md:gap-6">
        <button 
          onClick={onToggleHistory}
          className="flex items-center gap-2 px-3 py-2 md:px-4 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          <History className="w-4 h-4" />
          <span className="hidden md:inline text-sm font-medium">历史数据</span>
        </button>

        <button className="hidden md:block px-8 py-2 border border-purple-500 rounded-full text-white font-medium bg-transparent shadow-[0_0_10px_rgba(139,92,246,0.2)] hover:bg-purple-500/10 hover:shadow-[0_0_20px_rgba(139,92,246,0.6)] transition-all duration-300">
            登录
        </button>
        <button className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors group">
          <UserCircle className="w-8 h-8 group-hover:text-tech transition-colors" />
        </button>
      </div>
    </header>
  );
};