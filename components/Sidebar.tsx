import React from 'react';
import { LayoutDashboard, FileInput, BrainCircuit, FileText, MessageSquareText, Cpu, ShieldCheck, Radio } from 'lucide-react';
import { Tab } from '../types';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const menuItems = [
    { id: Tab.DASHBOARD, icon: LayoutDashboard, label: '综合数据看板', sub: '全局监控' },
    { id: Tab.INPUT, icon: FileInput, label: '单场数据分析', sub: '数据录入' },
    { id: Tab.REPORT, icon: FileText, label: '智能复盘报告', sub: '深度诊断' },
    { id: Tab.SCRIPT_ANALYSIS, icon: MessageSquareText, label: '话术实战模拟', sub: '场景演练' },
    { id: Tab.KNOWLEDGE, icon: BrainCircuit, label: 'AI 策略中控', sub: '核心大脑' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        w-64 h-full fixed left-0 top-20 z-40 bg-[#020408] border-r border-white/5 flex flex-col shadow-[20px_0_50px_rgba(0,0,0,0.8)]
        transition-transform duration-300 ease-in-out transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
          
          {/* Background Grid & Effects */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-30" 
               style={{ 
                   backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0, 240, 255, 0.05) 1px, transparent 1px)', 
                   backgroundSize: '20px 20px' 
               }}>
          </div>
          <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

          {/* Header Section */}
          <div className="p-6 relative z-10">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 relative overflow-hidden group hover:border-tech/30 transition-all duration-300">
                  {/* Header Glow */}
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-tech to-transparent opacity-50"></div>
                  
                  <div className="flex items-center gap-4 relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-white/10 flex items-center justify-center relative shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                          <div className="absolute inset-0 bg-tech/10 rounded-xl animate-pulse"></div>
                          <Cpu className="w-6 h-6 text-tech relative z-10" />
                      </div>
                      <div>
                          <h2 className="text-white font-bold text-base tracking-wide">中控台</h2>
                          <div className="flex items-center gap-2 mt-1">
                              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse"></span>
                              <span className="text-xs text-gray-400">系统运行正常</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto custom-scrollbar relative z-10">
              {menuItems.map((item, index) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;

                  return (
                      <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full relative group transition-all duration-300 outline-none`}
                      >
                           {/* Background Shape */}
                           <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${isActive ? 'bg-tech/10 border border-tech/30 shadow-[0_0_20px_rgba(0,240,255,0.1)]' : 'bg-transparent border border-transparent group-hover:bg-white/5 group-hover:border-white/5'}`}></div>
                           
                           {/* Content */}
                           <div className="relative z-10 flex items-center p-3">
                               {/* Icon Box */}
                               <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 transition-all duration-300 ${isActive ? 'bg-tech text-black shadow-[0_0_10px_#00f0ff]' : 'bg-white/5 text-gray-400 group-hover:text-white group-hover:bg-white/10'}`}>
                                   <Icon className="w-5 h-5" />
                               </div>
                               
                               {/* Labels */}
                               <div className="flex-1 text-left">
                                   <div className={`text-sm font-bold transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                       {item.label}
                                   </div>
                                   <div className={`text-[10px] transition-colors mt-0.5 ${isActive ? 'text-tech/80' : 'text-gray-600'}`}>
                                       {item.sub}
                                   </div>
                               </div>

                               {/* Active Indicator (Right Side) */}
                               {isActive && (
                                   <div className="w-1.5 h-1.5 rounded-full bg-tech shadow-[0_0_5px_#00f0ff] animate-pulse"></div>
                               )}
                           </div>
                      </button>
                  );
              })}
          </div>

          {/* Footer Info */}
          <div className="p-6 relative z-10">
              <div className="bg-[#050a14] border border-white/10 rounded-xl p-4 space-y-3 relative overflow-hidden group hover:border-white/20 transition-all">
                  <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">算力负载</span>
                      <span className="text-tech font-bold">12%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-tech h-full w-[12%] shadow-[0_0_10px_#00f0ff] animate-pulse"></div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2 text-gray-400">
                          <ShieldCheck className="w-3 h-3" />
                          <span>安全连接</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                          <Radio className="w-3 h-3" />
                          <span>24ms</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </>
  );
};