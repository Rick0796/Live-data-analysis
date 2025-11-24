import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Activity, Users, ShoppingBag, BarChart2, Sparkles, Save, Camera, Loader2 } from 'lucide-react';
import { TrendData, TrendAnalysisResult, HistoryRecord } from '../types';
import { analyzeTrend, recognizeTrendData } from '../services/geminiService';

interface DashboardViewProps {
  onSaveToHistory?: (record: HistoryRecord) => void;
  initialData?: TrendData[];
  initialResult?: TrendAnalysisResult | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onSaveToHistory, initialData, initialResult }) => {
  const [dayMode, setDayMode] = useState<3 | 7>(3);
  const [hasData, setHasData] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [analysisResult, setAnalysisResult] = useState<TrendAnalysisResult | null>(null);

  // Image Upload State
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from props if available (History Restore)
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setTrendData(initialData);
      setDayMode(Math.min(initialData.length, 7) as 3 | 7);
      setHasData(true);
      if (initialResult) {
        setAnalysisResult(initialResult);
      }
    } else if (trendData.length === 0) {
      handleModeChange(3);
    }
  }, [initialData, initialResult]);

  const handleModeChange = (mode: 3 | 7) => {
    setDayMode(mode);
    setHasData(false);
    setAnalysisResult(null);
    const initial = Array.from({ length: mode }, (_, i) => ({
      date: `Day ${i + 1}`,
      gmv: 0,
      totalViews: 0,
      gpm: 0,
      maxConcurrent: 0
    }));
    setTrendData(initial);
  };

  const handleInputChange = (index: number, field: keyof TrendData, value: string) => {
    const newData = [...trendData];
    newData[index] = {
      ...newData[index],
      [field]: field === 'date' ? value : Number(value)
    };
    setTrendData(newData);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const extractedData = await recognizeTrendData(file);
      if (extractedData.length > 0) {
        // Merge extracted data with existing structure, trimming to current dayMode or expanding if needed
        // For simplicity, we'll try to map up to dayMode, or update dayMode
        const mode = extractedData.length >= 5 ? 7 : 3;
        setDayMode(mode as 3|7);
        
        // Pad if extracted is less than mode
        const newData = [...extractedData];
        while (newData.length < mode) {
            newData.push({
                date: `Day ${newData.length + 1}`,
                gmv: 0, totalViews: 0, gpm: 0, maxConcurrent: 0
            });
        }
        setTrendData(newData.slice(0, 7)); // Cap at 7
      } else {
        alert("未能在图片中识别到有效数据。");
      }
    } catch (error) {
      console.error(error);
      alert("识别出错，请重试");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    setHasData(true);
    setIsAnalyzing(true);
    try {
      const result = await analyzeTrend(trendData);
      setAnalysisResult(result);
      
      // Auto-save to history
      if (onSaveToHistory) {
        onSaveToHistory({
          type: 'TREND',
          id: Date.now().toString(),
          timestamp: Date.now(),
          data: trendData,
          report: result
        });
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!hasData) {
    return (
      <div className="animate-[fadeIn_0.5s_ease-out] max-w-4xl mx-auto">
        <div className="glass-card p-8 rounded-2xl border border-white/10">
          <div className="mb-8 flex justify-between items-end">
             <div>
                <h2 className="text-2xl font-bold text-white mb-2">综合数据录入</h2>
                <p className="text-gray-400">请选择分析周期并录入核心数据，AI 将为您生成深度趋势诊断。</p>
             </div>
             
             {/* OCR Button */}
             <div>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload} 
                 />
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg transition-all"
                 >
                    {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    {isUploadingImage ? 'AI 识别中...' : '📸 识别趋势图'}
                 </button>
             </div>
          </div>

          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => handleModeChange(3)}
              className={`px-6 py-2 rounded-lg border transition-all ${dayMode === 3 ? 'bg-tech text-black border-tech font-bold' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
            >
              近 3 天数据
            </button>
            <button
              onClick={() => handleModeChange(7)}
              className={`px-6 py-2 rounded-lg border transition-all ${dayMode === 7 ? 'bg-tech text-black border-tech font-bold' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
            >
              近 7 天数据
            </button>
          </div>

          <div className="grid gap-6">
            {trendData.map((data, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="text-tech font-mono font-bold">
                    <input 
                        type="text" 
                        value={data.date} 
                        onChange={(e) => handleInputChange(index, 'date', e.target.value)}
                        className="bg-transparent border-none text-tech font-bold w-16 focus:outline-none focus:border-b border-tech"
                    />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">成交额 (GMV)</label>
                  <input 
                    type="number" 
                    value={data.gmv || ''} 
                    onChange={(e) => handleInputChange(index, 'gmv', e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-sm focus:border-tech outline-none" 
                  />
                </div>
                <div>
                   <label className="text-xs text-gray-500 block mb-1">场观 (Total Views)</label>
                   <input 
                    type="number" 
                    value={data.totalViews || ''}
                    onChange={(e) => handleInputChange(index, 'totalViews', e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-sm focus:border-tech outline-none" 
                  />
                </div>
                <div>
                   <label className="text-xs text-gray-500 block mb-1">千次成交 (GPM)</label>
                   <input 
                    type="number" 
                    value={data.gpm || ''}
                    onChange={(e) => handleInputChange(index, 'gpm', e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-sm focus:border-tech outline-none" 
                  />
                </div>
                <div>
                   <label className="text-xs text-gray-500 block mb-1">最高在线 (PCU)</label>
                   <input 
                    type="number" 
                    value={data.maxConcurrent || ''}
                    onChange={(e) => handleInputChange(index, 'maxConcurrent', e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-sm focus:border-tech outline-none" 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-gradient-to-r from-tech to-blue-600 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-105 transition-all"
            >
              生成可视化趋势 & AI 诊断
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals/averages for top cards
  const totalGMV = trendData.reduce((acc, curr) => acc + (curr.gmv || 0), 0);
  const avgViews = Math.round(trendData.reduce((acc, curr) => acc + (curr.totalViews || 0), 0) / trendData.length);
  const lastDay = trendData[trendData.length - 1];
  const firstDay = trendData[0];
  const gmvTrend = lastDay.gmv > firstDay.gmv ? 'up' : 'down';

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-tech" />
            综合数据看板 ({dayMode}天周期)
        </h2>
        <button onClick={() => setHasData(false)} className="text-sm text-gray-400 hover:text-white underline">
            重新录入数据
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="周期总 GMV" value={`¥${totalGMV.toLocaleString()}`} sub={gmvTrend === 'up' ? "呈上升趋势" : "呈下降趋势"} trend={gmvTrend} icon={ShoppingBag} />
        <Card title="平均日场观" value={avgViews.toLocaleString()} sub="流量大盘" trend="up" icon={Users} />
        <Card title="最新 GPM" value={lastDay.gpm.toString()} sub="变现效率" trend="up" icon={Activity} />
        <Card title="最新 PCU" value={lastDay.maxConcurrent.toString()} sub="在线峰值" trend="down" icon={Users} />
      </div>

      <div className="glass-card rounded-2xl p-6 border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-tech" />
                多维趋势分析
            </h3>
            <div className="flex gap-4">
                <span className="text-xs flex items-center gap-2 text-gray-400"><div className="w-2 h-2 rounded-full bg-tech shadow-[0_0_8px_#00f0ff]"></div> GMV</span>
                <span className="text-xs flex items-center gap-2 text-gray-400"><div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#8b5cf6]"></div> 场观</span>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(0,240,255,0.3)', backdropFilter: 'blur(10px)', borderRadius: '8px' }} 
                    itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="totalViews" name="场观" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                <Area type="monotone" dataKey="gmv" name="GMV" stroke="#00f0ff" strokeWidth={2} fillOpacity={1} fill="url(#colorGmv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
      </div>

      {/* AI Deep Diagnosis Section */}
      <div className="glass-card rounded-2xl p-6 border border-tech/30 bg-gradient-to-br from-purple-900/10 to-black relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
              <Sparkles className="w-32 h-32 text-tech" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-tech" />
              AI 深度趋势诊断
          </h3>

          {isAnalyzing ? (
              <div className="flex items-center gap-4 py-8">
                  <div className="w-6 h-6 border-2 border-tech border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-400 animate-pulse">正在深度分析近 {dayMode} 天的数据波动...</span>
              </div>
          ) : analysisResult ? (
              <div className="space-y-6 relative z-10">
                  <div className="bg-white/5 p-4 rounded-xl border-l-4 border-purple-500">
                      <h4 className="text-sm font-bold text-purple-400 mb-2 uppercase tracking-wider">深度思考分析 (先优后劣)</h4>
                      <p className="text-gray-200 leading-relaxed text-sm whitespace-pre-wrap">
                          {analysisResult.analysis}
                      </p>
                  </div>
                  
                  <div className="bg-tech/5 p-4 rounded-xl border-l-4 border-tech">
                      <h4 className="text-sm font-bold text-tech mb-2 uppercase tracking-wider">凡哥改进建议</h4>
                      <p className="text-gray-200 leading-relaxed text-sm">
                          {analysisResult.suggestion}
                      </p>
                  </div>
              </div>
          ) : (
              <div className="text-gray-500 italic">数据解析失败，请重试。</div>
          )}
      </div>
    </div>
  );
};

const Card: React.FC<{ title: string; value: string; sub: string; trend: 'up' | 'down'; icon: any }> = ({ title, value, sub, trend, icon: Icon }) => (
  <div className="glass-card rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] hover:border-tech/40">
    <div className="absolute -right-6 -top-6 w-32 h-32 bg-tech/10 rounded-full group-hover:scale-110 transition-transform blur-3xl"></div>
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div>
        <p className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold text-white font-mono">{value}</h3>
      </div>
      <div className="p-2 bg-white/5 rounded-lg text-tech border border-white/10 group-hover:text-white group-hover:bg-tech/20 transition-all">
        <Icon className="w-6 h-6" />
      </div>
    </div>
    <div className="flex items-center gap-2 relative z-10">
      <span className={`flex items-center text-xs font-bold px-2 py-1 rounded backdrop-blur-sm ${trend === 'up' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'}`}>
        {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
        {sub}
      </span>
    </div>
  </div>
);