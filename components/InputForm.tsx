import React, { useEffect, useState, useRef } from 'react';
import { StreamData } from '../types';
import { Sparkles, ScanEye, Keyboard, UploadCloud, Loader2, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { recognizeStreamData } from '../services/geminiService';

interface InputFormProps {
  data: Partial<StreamData>;
  onChange: (data: Partial<StreamData>) => void;
  onSubmit: () => void;
  onClear: () => void;
}

type InputMode = 'manual' | 'ocr';

export const InputForm: React.FC<InputFormProps> = ({ data, onChange, onSubmit, onClear }) => {
  // Default to OCR mode
  const [mode, setMode] = useState<InputMode>('ocr');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Effect: If data exists (beyond default ID/Date), switch to manual mode automatically
  // This helps when coming from UploadView
  useEffect(() => {
    const hasData = data.gmv !== undefined || data.totalViews !== undefined || data.notes;
    if (hasData) {
      setMode('manual');
    }
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    onChange({
      ...data,
      [name]: type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setErrorMsg(null);
    
    try {
      const extractedData = await recognizeStreamData(file);
      onChange({
        ...data,
        ...extractedData,
        // Preserve notes/transcript if they existed and new data doesn't have them
        transcriptSnippet: data.transcriptSnippet || extractedData.transcriptSnippet,
        notes: data.notes || extractedData.notes
      });
      setMode('manual'); // Switch to manual view to let user review
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || '识别失败，请尝试重新上传或手动输入');
    } finally {
      setIsScanning(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleClear = () => {
    if (window.confirm("确定要清空当前所有录入的数据吗？")) {
        onClear();
        setMode('ocr'); // Reset to default mode
    }
  };

  return (
    <div className="w-full bg-black/40 backdrop-blur-xl rounded-xl p-8 animate-[fadeIn_0.5s_ease-out]">
        <div className="mb-8 border-b border-white/10 pb-6 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">录入本场直播数据</h2>
            <p className="text-gray-400">
              {data.gmv ? 
                <span className="text-tech flex items-center gap-2"><Sparkles className="w-4 h-4" /> 数据已加载，请复核核心指标</span> : 
                "精准的数据录入是 AI 深度诊断的基础。"}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Mode Switcher */}
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                <button
                    onClick={() => setMode('ocr')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'ocr' ? 'bg-tech text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <ScanEye className="w-4 h-4" />
                    OCR 智能识别
                </button>
                <button
                    onClick={() => setMode('manual')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'manual' ? 'bg-tech text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Keyboard className="w-4 h-4" />
                    手动录入
                </button>
            </div>
            
            {/* Clear Button (Visible only when data exists) */}
            {(data.gmv || data.totalViews || data.notes) && (
                 <button 
                    onClick={handleClear}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                    title="清空重置"
                 >
                    <Trash2 className="w-5 h-5" />
                 </button>
            )}
          </div>
        </div>

        {mode === 'ocr' ? (
             <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors relative overflow-hidden">
                {isScanning ? (
                    <div className="flex flex-col items-center z-10">
                        <Loader2 className="w-12 h-12 text-tech animate-spin mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">AI 视觉引擎正在解析罗盘...</h3>
                        <p className="text-gray-400 text-sm">正在提取 GPM、CTR 及流量结构 (过程可能需要 30秒)</p>
                    </div>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-tech/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,240,255,0.2)]">
                            <UploadCloud className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">上传罗盘/数据大屏截图</h3>
                        <p className="text-gray-400 text-sm mb-8 max-w-sm text-center">支持 .jpg, .png 格式。AI 将自动识别关键指标并填入表单。</p>
                        
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            accept="image/*"
                            className="hidden" 
                            onChange={handleFileChange}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-tech transition-colors shadow-lg"
                        >
                            选择图片上传
                        </button>

                        {errorMsg && (
                           <div className="mt-6 flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-3 rounded-lg border border-red-500/20 max-w-md">
                              <AlertCircle className="w-5 h-5 shrink-0" />
                              <span className="text-sm font-medium">{errorMsg}</span>
                           </div>
                        )}
                    </>
                )}
                {/* Background scanning effect */}
                {isScanning && (
                   <div className="absolute inset-0 bg-gradient-to-b from-transparent via-tech/5 to-transparent animate-[scan_1.5s_linear_infinite]"></div>
                )}
             </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            {/* Section 1: Basic Metrics */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-tech flex items-center">
                    <span className="w-1 h-6 bg-tech mr-3 rounded-full shadow-[0_0_10px_#00f0ff]"></span>
                    罗盘核心指标
                    </h3>
                    <button 
                        type="button" 
                        onClick={() => setMode('ocr')}
                        className="text-xs text-tech hover:text-white flex items-center gap-1"
                    >
                        <RefreshCw className="w-3 h-3" /> 重新识别
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { label: '最高在线 (PCU)', name: 'maxConcurrent', type: 'number', unit: '人' },
                    { label: '场观', name: 'totalViews', type: 'number', unit: '人' },
                    { label: 'GMV (成交额)', name: 'gmv', type: 'number', unit: '元' },
                    { label: 'GPM (千次成交)', name: 'gpm', type: 'number', unit: '元' },
                    { label: '平均停留时长', name: 'retentionRate', type: 'number', unit: '秒' },
                    { label: '商品点击率 (CTR)', name: 'ctr', type: 'number', unit: '%' },
                    { label: '互动率', name: 'interactionRate', type: 'number', unit: '%' },
                    { label: '进房率', name: 'entryRate', type: 'number', unit: '%' },
                    { label: '点击转化率', name: 'clickConversionRate', type: 'number', unit: '%' },
                    { label: '直播时长', name: 'durationMinutes', type: 'number', unit: '分钟' },
                ].map((field) => (
                    <div key={field.name} className="group">
                    <label className="block text-sm font-medium text-gray-400 mb-2 group-focus-within:text-tech transition-colors">
                        {field.label}
                    </label>
                    <div className="relative">
                        <input
                        type={field.type}
                        name={field.name}
                        value={(data as any)[field.name] ?? ''}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-12 py-3 text-white focus:border-tech focus:bg-white/10 focus:ring-1 focus:ring-tech transition-all outline-none"
                        />
                        <span className="absolute right-4 top-3 text-gray-500 text-sm font-mono pointer-events-none">{field.unit}</span>
                    </div>
                    </div>
                ))}
                </div>
            </div>

            {/* Section 2: Context */}
            <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-6 flex items-center">
                <span className="w-1 h-6 bg-purple-500 mr-3 rounded-full shadow-[0_0_10px_#8b5cf6]"></span>
                内容与话术上下文
                </h3>
                <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                    关键话术片段 / 违规预警点 (AI 语音转录)
                    </label>
                    <textarea
                    name="transcriptSnippet"
                    rows={4}
                    value={data.transcriptSnippet || ''}
                    onChange={handleChange}
                    placeholder="例如：10:05秒的时候，主播说了‘全网最低价’，然后流量掉了..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:bg-white/10 focus:ring-1 focus:ring-purple-500 transition-all outline-none resize-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                    运营自我诊断 / 备注
                    </label>
                    <textarea
                    name="notes"
                    rows={2}
                    value={data.notes || ''}
                    onChange={handleChange}
                    placeholder="感觉今天憋单节奏没带好，前面铺垫太长了..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:bg-white/10 focus:ring-1 focus:ring-purple-500 transition-all outline-none resize-none"
                    />
                </div>
                </div>
            </div>

            <div className="pt-4 flex justify-end border-t border-white/10">
                <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-tech to-blue-600 text-black font-bold rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] hover:scale-105 transition-all duration-300"
                >
                开始 AI 深度诊断
                </button>
            </div>
            </form>
        )}
    </div>
  );
};