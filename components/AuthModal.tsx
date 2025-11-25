
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, User, Key, ArrowRight, Loader2, AlertCircle, Cloud, Link2, LogIn, Database, Copy, Check } from 'lucide-react';
import { User as UserType } from '../types';
import { cloudService, CloudDB } from '../services/cloudService';

interface AuthModalProps {
  onLogin: (user: UserType) => void;
  onClose: () => void;
}

type AuthMode = 'CONNECT_CLOUD' | 'LOGIN' | 'REGISTER';

const CLOUD_ID_KEY = 'streammaster_cloud_id_v1';

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, onClose }) => {
  const [mode, setMode] = useState<AuthMode>('CONNECT_CLOUD');
  const [cloudId, setCloudId] = useState('');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activationCode, setActivationCode] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialize: Check if we have a saved Cloud ID
  useEffect(() => {
    const savedId = localStorage.getItem(CLOUD_ID_KEY);
    if (savedId) {
      setCloudId(savedId);
      setMode('LOGIN'); // Auto-jump to login if ID exists
    }
  }, []);

  const handleCreateCloud = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newId = await cloudService.createDatabase();
      setCloudId(newId);
      localStorage.setItem(CLOUD_ID_KEY, newId);
      setMode('LOGIN');
      setSuccessMsg("新云端数据库创建成功！请保存您的云 ID 以便在其他设备登录。");
    } catch (err: any) {
      setError(err.message || "创建失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectCloud = async () => {
    if (!cloudId.trim()) {
      setError("请输入云端 ID");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Verify ID by fetching
      await cloudService.getDatabase(cloudId.trim());
      localStorage.setItem(CLOUD_ID_KEY, cloudId.trim());
      setMode('LOGIN');
      setSuccessMsg("成功连接到云端数据库！");
    } catch (err: any) {
      setError(err.message || "连接失败，请检查 ID 是否正确");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(cloudId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(CLOUD_ID_KEY);
    setCloudId('');
    setMode('CONNECT_CLOUD');
    setError(null);
    setSuccessMsg(null);
  };

  const validateActivationCode = (code: string): { valid: boolean; type: UserType['activationType']; duration: number } => {
    const upperCode = code.trim().toUpperCase();
    if (upperCode.startsWith('SM-PERM-')) return { valid: true, type: 'PERMANENT', duration: 99 * 365 * 24 * 3600 * 1000 };
    if (upperCode.startsWith('SM-6M-')) return { valid: true, type: '6MONTHS', duration: 180 * 24 * 3600 * 1000 };
    return { valid: false, type: 'NONE', duration: 0 };
  };

  const handleAuth = async () => {
    setError(null);
    setSuccessMsg(null);
    
    if (!username || !password) {
        setError("请输入用户名和密码");
        return;
    }
    
    setIsLoading(true);

    try {
      // 1. Fetch latest data from Cloud
      const db: CloudDB = await cloudService.getDatabase(cloudId);
      const users = db.users || {};
      const usedCodes = db.usedCodes || [];

      if (mode === 'LOGIN') {
          const user = users[username];
          if (user && user.password === password) {
              if (user.expiryDate && Date.now() > user.expiryDate) {
                   throw new Error("您的激活码已过期，请联系管理员续费。");
              }
              
              const userData: UserType = {
                  username: user.username,
                  isActivated: true,
                  activationType: user.activationType,
                  expiryDate: user.expiryDate,
                  loginTime: Date.now()
              };
              // Local session persistence
              localStorage.setItem('streammaster_current_user', JSON.stringify(userData));
              onLogin(userData);
          } else {
              throw new Error("用户名或密码错误，或账户不存在");
          }
      } else {
          // REGISTER
          if (users[username]) {
              throw new Error("该用户名已被注册，请直接登录");
          }

          const normalizedCode = activationCode.trim().toUpperCase();
          if (usedCodes.includes(normalizedCode)) {
               throw new Error("该激活码已被使用，无法重复注册。");
          }

          const codeCheck = validateActivationCode(activationCode);
          if (!codeCheck.valid) {
              throw new Error("无效的激活码。请输入 SM-PERM- 或 SM-6M- 开头的有效代码。");
          }

          // Create User Object
          const newUser: UserType & { password?: string; registeredAt?: number } = {
              username,
              password, // In a real app, hash this!
              isActivated: true,
              activationType: codeCheck.type,
              expiryDate: Date.now() + codeCheck.duration,
              loginTime: 0, // Will be updated on login
              registeredAt: Date.now()
          };

          // Update DB Object
          db.users[username] = newUser;
          db.usedCodes.push(normalizedCode);

          // 2. Sync back to Cloud
          await cloudService.updateDatabase(cloudId, db);

          // Login Success
          const userData: UserType = {
              username,
              isActivated: true,
              activationType: codeCheck.type as any,
              expiryDate: newUser.expiryDate,
              loginTime: Date.now()
          };
          
          localStorage.setItem('streammaster_current_user', JSON.stringify(userData));
          onLogin(userData);
      }
    } catch (err: any) {
      setError(err.message || "操作失败，请检查网络");
    } finally {
      setIsLoading(false);
    }
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
                        {mode === 'CONNECT_CLOUD' ? <Cloud className="w-6 h-6 text-tech" /> : <ShieldCheck className="w-6 h-6 text-tech" />}
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-wider">StreamMaster AI</h2>
                    <p className="text-xs text-tech/80 font-mono">V1.7 云端同步版</p>
                </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">

                {/* Mode 1: Cloud Connection */}
                {mode === 'CONNECT_CLOUD' && (
                  <div className="space-y-6 animate-[fadeIn_0.3s]">
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-bold text-white">连接云端数据库</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        为了实现多设备账号同步，请输入您的<b>团队云 ID</b>。<br/>
                        如果是首次使用，请创建一个新的云数据库。
                      </p>
                    </div>

                    <div className="space-y-4">
                       <div className="relative">
                          <Cloud className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                          <input 
                              type="text" 
                              value={cloudId}
                              onChange={e => setCloudId(e.target.value)}
                              className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-tech focus:ring-1 focus:ring-tech outline-none transition-all"
                              placeholder="输入 Cloud ID (例如: 12345-abcde)"
                          />
                       </div>
                       <button 
                          onClick={handleConnectCloud}
                          disabled={isLoading}
                          className="w-full py-3 bg-tech/10 border border-tech/30 rounded-xl text-tech font-bold hover:bg-tech/20 transition-all flex items-center justify-center gap-2"
                       >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                          连接现有云端
                       </button>

                       <div className="relative flex py-2 items-center">
                          <div className="flex-grow border-t border-white/10"></div>
                          <span className="flex-shrink-0 mx-4 text-gray-600 text-xs">或</span>
                          <div className="flex-grow border-t border-white/10"></div>
                       </div>

                       <button 
                          onClick={handleCreateCloud}
                          disabled={isLoading}
                          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                       >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                          创建新的团队云数据库
                       </button>
                    </div>
                  </div>
                )}

                {/* Mode 2: Login / Register */}
                {(mode === 'LOGIN' || mode === 'REGISTER') && (
                    <div className="animate-[fadeIn_0.3s]">
                         {/* Cloud ID Display Bar */}
                         <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 mb-6 border border-white/10">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Cloud className="w-3 h-3 text-green-400 shrink-0" />
                                <span className="text-[10px] text-gray-400 whitespace-nowrap">已连接 Cloud ID:</span>
                                <span className="text-xs font-mono text-white truncate max-w-[120px]">{cloudId}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={handleCopyId} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="复制 ID 分享给队友">
                                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                                <button onClick={handleDisconnect} className="text-[10px] text-red-400 hover:text-red-300 underline ml-2">
                                    断开
                                </button>
                            </div>
                         </div>

                        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10 mb-6">
                            <button 
                                onClick={() => { setMode('LOGIN'); setError(null); setSuccessMsg(null); }}
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'LOGIN' ? 'bg-white/10 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                登录账号
                            </button>
                            <button 
                                onClick={() => { setMode('REGISTER'); setError(null); setSuccessMsg(null); }}
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'REGISTER' ? 'bg-tech/20 text-tech shadow' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                注册新用户
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                    <input 
                                        type="text" 
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-tech focus:ring-1 focus:ring-tech outline-none transition-all"
                                        placeholder="用户名"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                    <input 
                                        type="password" 
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-tech focus:ring-1 focus:ring-tech outline-none transition-all"
                                        placeholder="密码"
                                    />
                                </div>
                            </div>

                            {mode === 'REGISTER' && (
                                <div className="space-y-2 animate-[fadeIn_0.3s]">
                                    <div className="relative">
                                        <Key className="absolute left-3 top-3 w-4 h-4 text-tech" />
                                        <input 
                                            type="text" 
                                            value={activationCode}
                                            onChange={e => setActivationCode(e.target.value)}
                                            className="w-full bg-tech/5 border border-tech/30 rounded-xl py-2.5 pl-10 pr-4 text-tech text-sm focus:border-tech outline-none transition-all font-mono uppercase"
                                            placeholder="激活码 (SM-PERM-...)"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handleAuth}
                            disabled={isLoading}
                            className="w-full mt-6 py-3 bg-gradient-to-r from-tech to-blue-600 rounded-xl text-black font-bold text-sm shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            {mode === 'LOGIN' ? '进入系统' : '激活并绑定'}
                        </button>
                    </div>
                )}

                {/* Feedback Messages */}
                {(error || successMsg) && (
                    <div className={`flex items-start gap-2 px-4 py-3 rounded-lg text-xs border animate-[fadeIn_0.3s] ${error ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error || successMsg}
                    </div>
                )}
                
                {mode === 'CONNECT_CLOUD' && (
                    <div className="text-center mt-4">
                        <button onClick={onClose} className="text-xs text-gray-600 hover:text-white transition-colors">
                            跳过登录 (仅本地试用)
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
