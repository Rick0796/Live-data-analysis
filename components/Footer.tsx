
import React from 'react';
import { Facebook, Instagram } from 'lucide-react';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    stroke="currentColor" 
    strokeWidth="0" 
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-8 mt-12 border-t border-white/5 bg-black/40 backdrop-blur-sm relative z-20">
      <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center space-y-4">
        
        {/* Social Icons */}
        <div className="flex items-center gap-8">
          <a href="#" className="group transition-all duration-300 hover:scale-110">
            <div className="p-2 rounded-full bg-black border border-white/10 group-hover:border-[#1877F2]/50 group-hover:bg-[#1877F2]/10 transition-colors">
              <Facebook className="w-5 h-5 text-gray-500 group-hover:text-[#1877F2] transition-colors" />
            </div>
          </a>

          <a href="#" className="group transition-all duration-300 hover:scale-110">
            <div className="p-2 rounded-full bg-black border border-white/10 group-hover:border-pink-500/50 group-hover:bg-gradient-to-tr group-hover:from-yellow-500/10 group-hover:via-red-500/10 group-hover:to-purple-500/10 transition-colors">
              <Instagram className="w-5 h-5 text-gray-500 group-hover:text-[#E1306C] transition-colors" />
            </div>
          </a>

          <a href="#" className="group transition-all duration-300 hover:scale-110">
             <div className="p-2 rounded-full bg-black border border-white/10 group-hover:border-white/50 group-hover:bg-white/10 transition-colors">
              <TikTokIcon className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
            </div>
          </a>
        </div>

        <div className="text-center">
           <p className="text-[10px] text-gray-600 font-mono tracking-widest">© 2024 FANGE TECHNOLOGY. v1.6 | ALL RIGHTS RESERVED.</p>
        </div>

      </div>
    </footer>
  );
};
