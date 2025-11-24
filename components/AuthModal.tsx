
import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Key, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { User as UserType } from '../types';

interface AuthModalProps {
  onLogin: (user: UserType) => void;
  onClose: () => void;
}

type AuthMode = 'LOGIN' | 'REGISTER';

// Simulated DB keys
const DB_KEY = 'streammaster_users_v1';
const CODES_KEY = 'streammaster_used_codes_v1';

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, onClose }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateActivationCode = (code: string): { valid: boolean; type: UserType['activationType']; duration: number } => {
    // V1.6 Activation Logic
    // Format: SM-PERM-XXXX (Permanent), SM-6M-XXXX (6 Months)
    const upperCode = code.trim().toUpperCase();
    
    if (upperCode.startsWith('SM-PERM-')) {
        return { valid: true, type: 'PERMANENT', duration: 99 * 365 * 24 * 60 * 60 * 1000 };
    }
    if (upperCode.startsWith('SM-6M-')) {
        return { valid: true, type: '6MONTHS', duration: 180 * 24 * 60 * 60 * 1000 };
    }
    
    return { valid: false, type: 'NONE', duration: 0 };
  };

  const handleAuth = async () => {
    setError(null);
    if (!username || !password) {
        setError("请输入用户名和密码");
        return;
    }
    
    setIsLoading(true);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const users = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
    
    if (mode === 'LOGIN') {
        const user = users[username];
        if (user && user.password === password) {
            // Check Activation
            if (user.expiryDate && Date.now() > user.expiryDate) {
                 setError("您的激活码已过期，请联系管理员续费。");
                 setIsLoading(false);
                 return;
            }
            
            // Persist session
            const userData = {
                username: user.username,
                isActivated: true,
                activationType: user.activationType,
                expiryDate: user.expiryDate,
                loginTime: Date.now()
            };
            localStorage.setItem('streammaster_current_user', JSON.stringify(userData));
            
            onLogin(userData);
        } else {
            setError("用户名或密码错误，或账户不存在");
        }
    } else {
        // REGISTER
        if (users[username]) {
            setError("该用户名已被注册，请直接登录");
            setIsLoading(false);
            return;
        }

        // Check if code used
        const usedCodes = JSON.parse(localStorage.getItem(CODES_KEY) || '[]');
        const normalizedCode = activationCode.trim().toUpperCase();

        if (usedCodes.includes(normalizedCode)) {
             setError("该激活码已被使用，无法重复注册。");
             setIsLoading(false);
             return;
        }

        // Validate Code Format
        const codeCheck = validateActivationCode(activationCode);
        if (!codeCheck.valid) {
            setError("无效的激活码。请输入 SM-PERM- 或 SM-6M- 开头的有效代码。");
            setIsLoading(false);
            return;
        }

        const newUser = {
            username,
            password,
            activationType: codeCheck.type,
            expiryDate: Date.now() + codeCheck.duration,
            registeredAt: Date.now()
        };

        // Save to "DB"
        users[username] = newUser;
        localStorage.setItem(DB_KEY, JSON.stringify(users));

        // Mark code as used
        usedCodes.push(normalizedCode);
        localStorage.setItem(CODES_KEY, JSON.stringify(usedCodes));

        // Create session object
        const userData = {
            username,
            isActivated: true,
            activationType: codeCheck.type as any,
            expiryDate: newUser.expiryDate,
            loginTime: Date.now()
        };
        
        // Persist session
        localStorage.setItem('streammaster_current_user', JSON.stringify(userData));

        onLogin(userData);
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
        <div className="w-full max-w-md bg-[#050a14] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative">
            
            {/* Header Art */}
            <div className="h-32 bg-gradient-to-br from-tech/20 via-purple-900/20 to-black relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-tech/20 rounded-full blur-3xl"></div>
                
                <div className="z-10 text-center">
                    <div className="w-12 h-12 bg-black border border-tech/50 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-[0_0_20px_rgba(0,240,255,0.3)]">
                        <ShieldCheck className="w-6 h-6 text-tech" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-wider">StreamMaster AI</h2>
                    <p className="text-xs text-tech/80 font-mono">V1.6 商业授权版</p>
                </div>
            </div>

            {/* Form */}
            <div className="p-8 space-y-6">
                
                {/* Tabs */}
                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                    <button 
                        onClick={() => { setMode('LOGIN'); setError(null); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'LOGIN' ? 'bg-white/10 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        用户登录
                    </button>
                    <button 
                        onClick={() => { setMode('REGISTER'); setError(null); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'REGISTER' ? 'bg-tech/20 text-tech shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        激活新账户
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 font-bold ml-1">用户名</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                                type="text" 
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-tech focus:ring-1 focus:ring-tech outline-none transition-all placeholder-gray-700"
                                placeholder="请输入您的账号"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 font-bold ml-1">密码</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-tech focus:ring-1 focus:ring-tech outline-none transition-all placeholder-gray-700"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {mode === 'REGISTER' && (
                         <div className="space-y-2 animate-[fadeIn_0.3s]">
                            <label className="text-xs text-tech font-bold ml-1 flex items-center gap-1">
                                <Key className="w-3 h-3" /> 激活码 (必填)
                            </label>
                            <input 
                                type="text" 
                                value={activationCode}
                                onChange={e => setActivationCode(e.target.value)}
                                className="w-full bg-tech/5 border border-tech/30 rounded-xl py-2.5 px-4 text-tech text-sm focus:border-tech focus:ring-1 focus:ring-tech outline-none transition-all placeholder-tech/30 font-mono tracking-widest uppercase"
                                placeholder="SM-PERM-XXXX"
                            />
                            <p className="text-[10px] text-gray-500 pl-1">新用户注册需输入官方分发的永久或限时激活码。</p>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-400 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                <button 
                    onClick={handleAuth}
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-tech to-blue-600 rounded-xl text-black font-bold text-sm shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {mode === 'LOGIN' ? '立即登录' : '激活并注册'}
                </button>
                
                {mode === 'LOGIN' && (
                    <div className="text-center">
                        <button onClick={onClose} className="text-xs text-gray-600 hover:text-white transition-colors">
                            暂不登录 (仅浏览，无法使用 AI 功能)
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
