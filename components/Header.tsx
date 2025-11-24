
import React, { useState } from 'react';
import { Activity, UserCircle, History, Menu, Crown, Clock, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { Tab, User } from '../types';

interface HeaderProps {
  user: User | null;
  onNavigateToDashboard?: () => void;
  setActiveTab: (tab: Tab) => void;
  onToggleHistory: () => void;
  onToggleSidebar?: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onNavigateToDashboard, setActiveTab, onToggleHistory, onToggleSidebar, onOpenAuth, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getBadgeFull = () => {
    if (!user || !user.isActivated) return null;
    if (user.activationType === 'PERMANENT') {
        return (
            <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 rounded-lg w-full mb-3">
                <Crown className="w-6 h-6 text-yellow-500 mb-1" />
                <span className="text-sm font-bold text-yellow-500">永久尊享会员</span>
                <span className="text-[10px] text-yellow-500/60">有效期至: 长期有效</span>
            </div>
        );
    }
    if (user.activationType === '6MONTHS') {
        return (
            <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-lg w-full mb-3">
                <Clock className="w-6 h-6 text-blue-500 mb-1" />
                <span className="text-sm font-bold text-blue-500">6个月实战版</span>
                <span className="text-[10px] text-blue-500/60">有效期至: {new Date(user.expiryDate || 0).toLocaleDateString()}</span>
            </div>
        );
    }
    return null;
  };

  const getMiniBadge = () => {
    if (!user || !user.isActivated) return null;
    if (user.activationType === 'PERMANENT') return <Crown className="w-3 h-3 text-yellow-500" />;
    if (user.activationType === '6MONTHS') return <Clock className="w-3 h-3 text-blue-500" />;
    return null;
  };

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
        
        {user?.isActivated && (
            <button 
            onClick={onToggleHistory}
            className="flex items-center gap-2 px-3 py-2 md:px-4 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
            <History className="w-4 h-4" />
            <span className="hidden md:inline text-sm font-medium">历史数据</span>
            </button>
        )}

        {user ? (
            <div className="relative pl-4 border-l border-white/10">
                <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-3 group focus:outline-none"
                >
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-bold text-white group-hover:text-tech transition-colors">{user.username}</div>
                        <div className="flex justify-end gap-1 items-center">
                            {getMiniBadge()}
                            <span className="text-[10px] text-gray-500">已激活</span>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-tech/10 flex items-center justify-center border border-tech/30 group-hover:border-tech shadow-[0_0_10px_rgba(0,240,255,0.1)] transition-all">
                        <UserCircle className="w-5 h-5 text-tech" />
                    </div>
                    <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                    <>
                        <div className="fixed inset-0 z-[55]" onClick={() => setShowUserMenu(false)}></div>
                        <div className="absolute right-0 top-12 w-64 bg-[#050a14] border border-white/10 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] p-4 z-[60] animate-[fadeIn_0.2s_ease-out]">
                            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/5">
                                <div className="w-10 h-10 rounded-full bg-tech/20 flex items-center justify-center">
                                    <UserCircle className="w-6 h-6 text-tech" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold">{user.username}</h3>
                                    <p className="text-xs text-gray-500">ID: {user.loginTime.toString().slice(-6)}</p>
                                </div>
                            </div>

                            {getBadgeFull()}

                            <div className="space-y-1">
                                <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2">
                                   <Sparkles className="w-4 h-4 text-purple-400" /> 用户权益中心
                                </button>
                                <button 
                                    onClick={() => {
                                        onLogout();
                                        setShowUserMenu(false);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2"
                                >
                                   <LogOut className="w-4 h-4" /> 退出登录
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        ) : (
            <button 
                onClick={onOpenAuth}
                className="px-6 py-2 border border-purple-500 rounded-full text-white font-medium bg-transparent shadow-[0_0_10px_rgba(139,92,246,0.2)] hover:bg-purple-500/10 hover:shadow-[0_0_20px_rgba(139,92,246,0.6)] transition-all duration-300 flex items-center gap-2"
            >
                <UserCircle className="w-4 h-4" />
                登录 / 激活
            </button>
        )}
      </div>
    </header>
  );
};
