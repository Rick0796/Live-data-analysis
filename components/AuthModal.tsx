
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, User, Key, ArrowRight, Loader2, AlertCircle, WifiOff } from 'lucide-react';
import { User as UserType } from '../types';
import { cloudService, CloudDB } from '../services/cloudService';

interface AuthModalProps {
  onLogin: (user: UserType) => void;
  onClose: () => void;
}

type Tab = 'LOGIN' | 'REGISTER';

const CLOUD_ID_KEY = 'streammaster_cloud_id_v1';

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('LOGIN');
  
  // Form Fields
  const [cloudId, setCloudId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activationCode, setActivationCode] = useState('');
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Initialize: Check if we have a saved Cloud ID
  useEffect(() => {
    const savedId = localStorage.getItem(CLOUD_ID_KEY);
    if (savedId) {
      setCloudId(savedId);
      if (savedId.startsWith('local-')) setIsOfflineMode(true);
    }
  }, []);

  const validateActivationCode = (code: string): { valid: boolean; type: UserType['activationType']; duration: number } => {
    const upperCode = code.trim().toUpperCase();
    if (upperCode.startsWith('SM-PERM-')) return { valid: true, type: 'PERMANENT', duration: 99 * 365 * 24 * 3600 * 1000 };
    if (upperCode.startsWith('SM-6M-')) return { valid: true, type: '6MONTHS', duration: 180 * 24 * 3600 * 1000 };
    return { valid: false, type: 'NONE', duration: 0 };
  };

  const handleLogin = async () => {
    if (!cloudId.trim()) { setError("未检测到数据库 ID"); return; }
    if (!username.trim()) { setError("请输入用户名"); return; }
    if (!password.trim()) { setError("请输入密码"); return; }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
        // 1. Fetch DB
        const db: CloudDB = await cloudService.getDatabase(cloudId.trim());
        
        // 2. Validate User
        const user = db.users[username];
        if (!user) throw new Error("用户不存在，请检查用户名或注册新账号");
        if (user.password !== password) throw new Error("密码错误");
        
        // 3. Check Expiry
        if (user.expiryDate && Date.now() > user.expiryDate) {
            throw new Error("账号已过期，请联系管理员续费");
        }

        // 4. Save ID locally
        localStorage.setItem(CLOUD_ID_KEY, cloudId.trim());

        // 5. Success
        const userData: UserType = {
            username: user.username,
            isActivated: true,
            activationType: user.activationType,
            expiryDate: user.expiryDate,
            loginTime: Date.now()
        };
        
        localStorage.setItem('streammaster_current_user', JSON.stringify(userData));
        onLogin(userData);

    } catch (err: any) {
        console.error(err);
        setError(err.message || "登录失败");
    } finally {
        setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username.trim()) { setError("请输入用户名"); return; }
    if (!password.trim()) { setError("请输入密码"); return; }
    if (!activationCode.trim()) { setError("请输入激活码"); return; }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
        const codeCheck = validateActivationCode(activationCode);
        if (!codeCheck.valid) {
            throw new Error("无效的激活码 (需以 SM-PERM- 或 SM-6M- 开头)");
        }

        let currentCloudId = cloudId.trim();
        let db: CloudDB;
        let isNew = false;

        // Scenario: Create NEW Database if ID is empty or explicit new
        if (!currentCloudId) {
            currentCloudId = await cloudService.createDatabase();
            setCloudId(currentCloudId);
            isNew = true;
            db = { users: {}, usedCodes: [], updatedAt: Date.now() };
        } else {
            try {
                db = await cloudService.getDatabase(currentCloudId);
            } catch (e) {
                // If verify fails, fallback to creating new local
                console.warn("Cannot connect to existing ID, creating new local one");
                currentCloudId = await cloudService.createDatabase();
                setCloudId(currentCloudId);
                isNew = true;
                db = { users: {}, usedCodes: [], updatedAt: Date.now() };
            }
        }

        // Check constraints
        if (db.users[username]) throw new Error("该用户名已被注册");
        if (db.usedCodes.includes(activationCode.trim().toUpperCase())) throw new Error("激活码已被使用");

        // Create User
        const newUser = {
            username,
            password,
            isActivated: true,
            activationType: codeCheck.type,
            expiryDate: Date.now() + codeCheck.duration,
            registeredAt: Date.now(),
            loginTime: Date.now()
        };

        // Update DB
        db.users[username] = newUser;
        db.usedCodes.push(activationCode.trim().toUpperCase());

        // Sync
        await cloudService.updateDatabase(currentCloudId, db);
        
        // Save ID
        localStorage.setItem(CLOUD_ID_KEY, currentCloudId);
        if (currentCloudId.startsWith('local-')) setIsOfflineMode(true);

        // Auto Login
        const userData: UserType = {
            username,
            isActivated: true,
            activationType: codeCheck.type as any,
            expiryDate: newUser.expiryDate,
            loginTime: Date.now()
        };
        
        localStorage.setItem('streammaster_current_user', JSON.stringify(userData));
        onLogin(userData);

    } catch (err: any) {
        console.error(err);
        setError(err.message || "注册失败");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div 
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]"
        onClick={onClose}
    >
        <div 
            className="w-full max-w-md bg-[#050a14] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
        >
            
            {/* Header Art */}
            <div className="h-32 bg-gradient-to-br from-tech/20 via-purple-900/20 to-black relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                
                <div className="z-10 text-center">
                    <div className="w-12 h-12 bg-black border border-tech/50 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-[0_0_20px_rgba(0,240,255,0.3)]">
                        <ShieldCheck className="w-6 h-6 text-tech" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-wider">凡哥AI</h2>
                    <p className="text-xs text-tech/80 font-mono">v1.6 深度实战版</p>
                </div>
            </div>

            {/* Form */}
            <div className="p-8 space-y-6">
                
                {/* Tabs */}
                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                    <button 
                        onClick={() => { setActiveTab('LOGIN'); setError(null); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'LOGIN' ? 'bg-white/10 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        用户登录
                    </button>
                    <button 
                        onClick={() => { setActiveTab('REGISTER'); setError(null); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'REGISTER' ? 'bg-tech/20 text-tech shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        激活新账户
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Cloud ID Field - Usually hidden or auto-filled but good to show for debugging connection */}
                    {cloudId && (
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-black/30 p-2 rounded border border-white/5">
                            <Key className="w-3 h-3" />
                            <span className="truncate flex-1">ID: {cloudId}</span>
                            {isOfflineMode && <span className="text-yellow-500 flex items-center gap-1"><WifiOff className="w-3 h-3"/> 离线模式</span>}
                        </div>
                    )}

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

                    {activeTab === 'REGISTER' && (
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
                    onClick={activeTab === 'LOGIN' ? handleLogin : handleRegister}
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-tech to-blue-600 rounded-xl text-black font-bold text-sm shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {activeTab === 'LOGIN' ? '立即登录' : '激活并注册'}
                </button>
                
                {activeTab === 'LOGIN' && (
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
