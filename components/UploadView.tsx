import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileVideo, Cpu, CheckCircle2, FileText, ArrowRight, Target, Image as ImageIcon, Film, MousePointer2, Compass, BarChart2, AlertCircle } from 'lucide-react';
import { StreamData } from '../types';
import { recognizeStreamData } from '../services/geminiService';

interface UploadViewProps {
  onComplete: (data?: Partial<StreamData>) => void;
  onDirectEnter: () => void;
}

type Stage = 'IDLE' | 'UPLOADING' | 'ANALYZING' | 'GENERATING' | 'COMPLETE';

export const UploadView: React.FC<UploadViewProps> = ({ onComplete, onDirectEnter }) => {
  const [stage, setStage] = useState<Stage>('IDLE');
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock data for video simulation
  const mockVideoData: Partial<StreamData> = {
    transcriptSnippet: `[00:03] 主播 (高昂): "咱们这款机制真的炸裂了，所有女生准备好手速..." (语速: Fast, 情绪: High)
[02:15] 主播 (平缓): "大家看这个细节，做工非常..." -> (检测到停留下降)
[05:20] 主播 (急促): "为什么不进人呢？大家帮我点点赞..." (焦虑感检测: High)
[10:12] 主播: "最后5单，倒计时321..." (成交密度峰值)
    `,
    notes: "AI 智能诊断: \n1. 05:20处检测到主播心态波动，语调出现焦虑，建议调整心态或播放BGM掩盖。\n2. 场景贴片文字字号偏小，识别率低，导致CTR仅为9.5%。"
  };

  // Mock Process for Video
  const simulateVideoProcess = () => {
    setStage('UPLOADING');
    setProgress(0);
    
    const timer = setInterval(() => {
        setProgress((prev) => {
          let increment = 0;
          if (stage === 'UPLOADING') increment = Math.random() * 3 + 2; 
          if (stage === 'ANALYZING') increment = Math.random() * 0.8 + 0.2; 
          if (stage === 'GENERATING') increment = Math.random() * 2; 
  
          const next = prev + increment;
          return next >= 100 ? 100 : next;
        });
      }, 100);

      return () => clearInterval(timer);
  };

  // Progress Simulation Effect
  useEffect(() => {
    if (stage === 'IDLE' || stage === 'COMPLETE') return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 99) return prev;
        
        let increment = 0.5;
        if (stage === 'UPLOADING') increment = 1.5;
        if (stage === 'ANALYZING') increment = 0.5;
        if (stage === 'GENERATING') increment = 1;
        
        const next = prev + increment;

        if (prev < 30 && next >= 30 && stage === 'UPLOADING') setStage('ANALYZING');
        if (prev < 85 && next >= 85 && stage === 'ANALYZING') setStage('GENERATING');
        
        return next;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [stage]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleProcessFile = async (file: File) => {
      setErrorMsg(null);
      
      if (file.type.startsWith('image/')) {
          // Real OCR for Images
          setStage('UPLOADING');
          setProgress(10);
          
          try {
              // Simulate upload
              await new Promise(resolve => setTimeout(resolve, 800));
              setStage('ANALYZING');
              setProgress(40);
              
              // Call Gemini Vision
              const data = await recognizeStreamData(file);
              
              setStage('COMPLETE');
              setProgress(100);
              setTimeout(() => onComplete(data), 800);
          } catch (error: any) {
              console.error(error);
              setStage('IDLE');
              setProgress(0);
              setErrorMsg(error.message || "图片识别失败，请确保图片清晰。");
          }
      } else {
          // Simulation for Video/Other
          setStage('UPLOADING');
          setProgress(0);
          setTimeout(() => {
              setStage('COMPLETE');
              setProgress(100);
              setTimeout(() => onComplete(mockVideoData), 800);
          }, 4000);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleProcessFile(file);
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] px-4 animate-[fadeIn_1s_ease-out]">
      
      {/* Hero Section */}
      <div className="text-center mb-10 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-tech/30 bg-tech/5 mb-2 mt-8 animate-float">
            <span className="w-2 h-2 rounded-full bg-tech animate-pulse"></span>
            <span className="text-xs text-tech tracking-wider font-bold">v1.5</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-2 tracking-tight leading-tight">
          <span className="text-white">抖音视频号</span> <br/>
          <span className="text-[#00f0ff] drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]">
            直播复盘中心
          </span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
          基于深度学习算法，精准诊断 <span className="text-white font-medium border-b border-tech/50">罗盘数据</span>、<span className="text-white font-medium border-b border-tech/50">话术</span> 与 <span className="text-white font-medium border-b border-tech/50">成交趋势</span>。
        </p>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-8 mb-8">
            <FeatureCard 
                icon={Target} 
                title="罗盘OCR识别" 
                desc="一键提取GPM/CTR核心指标" 
            />
             <FeatureCard 
                icon={Compass} 
                title="数据可视化" 
                desc="自动生成多维雷达图" 
            />
             <FeatureCard 
                icon={BarChart2} 
                title="深度流量复盘" 
                desc="漏斗模型与策略拆解" 
            />
        </div>
      </div>

      {/* Upload Card */}
      <div 
        className={`w-full max-w-2xl rounded-2xl p-1 transition-all duration-500 backdrop-blur-xl
        ${isDragging ? 'scale-105 shadow-[0_0_50px_rgba(0,240,255,0.4)]' : 'hover:shadow-[0_0_30px_rgba(0,240,255,0.2)]'}`}
      >
        <div 
            className={`relative rounded-xl border transition-all duration-300 p-10 flex flex-col items-center justify-center min-h-[340px] bg-white/5
            ${isDragging ? 'border-tech' : 'border-white/10 hover:border-tech/50'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
          {stage === 'IDLE' ? (
            <>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-6 group cursor-pointer border border-white/10 group-hover:border-tech/50 transition-all" onClick={() => fileInputRef.current?.click()}>
                    <UploadCloud className="w-10 h-10 text-gray-300 group-hover:text-tech transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">点击或拖拽上传罗盘数据/录频</h3>
                <p className="text-gray-500 text-sm mb-6">支持 .jpg, .png (罗盘截图) 或 .mp4, .mov (录屏)</p>
                
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".jpg,.jpeg,.png,.mp4,.mov,.csv,.xlsx"
                    onChange={handleFileSelect}
                />
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-tech hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.15)] mb-6"
                >
                    立即开始诊断
                </button>

                {/* Direct Entry Option - Boxed Style */}
                <button 
                    onClick={onDirectEnter}
                    className="group relative px-6 py-3 rounded-lg border border-white/20 hover:border-tech/50 bg-white/5 hover:bg-white/10 transition-all w-full max-w-xs flex items-center justify-center gap-3 overflow-hidden"
                >
                    <div className="absolute left-0 top-0 w-1 h-full bg-tech opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <MousePointer2 className="w-4 h-4 text-gray-400 group-hover:text-tech transition-colors" />
                    <span className="text-gray-300 font-medium group-hover:text-white transition-colors">无文件？直接进入数据录入</span>
                </button>

                {errorMsg && (
                    <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-3 rounded-lg border border-red-500/20 max-w-md animate-[fadeIn_0.3s]">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-medium text-left">{errorMsg}</span>
                    </div>
                )}
            </>
          ) : (
            <div className="w-full max-w-md space-y-8">
                {/* Progress Visualizer */}
                <div className="relative pt-4">
                    <div className="flex justify-between text-xs font-mono text-tech mb-2">
                        <span>
                            {stage === 'UPLOADING' && '正在上传数据源...'}
                            {stage === 'ANALYZING' && 'AI 正在识别关键指标...'}
                            {stage === 'GENERATING' && '正在生成诊断模型...'}
                            {stage === 'COMPLETE' && '处理完成'}
                        </span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    
                    <div className="h-4 bg-black/60 rounded-full overflow-hidden relative border border-white/10 shadow-inner">
                        <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-tech/80 via-purple-500/80 to-tech/80 transition-all duration-200 ease-linear stripe-bar"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                <div className="space-y-4">
                    <StepItem 
                        icon={FileVideo} 
                        label="上传直播罗盘/视频流" 
                        status={progress > 30 ? 'done' : progress > 0 ? 'active' : 'waiting'} 
                    />
                    <StepItem 
                        icon={Cpu} 
                        label="AI 提取GPM/话术/语感" 
                        status={progress > 85 ? 'done' : progress > 30 ? 'active' : 'waiting'} 
                    />
                    <StepItem 
                        icon={FileText} 
                        label="生成深度算法诊断报告" 
                        status={progress >= 100 ? 'done' : progress > 85 ? 'active' : 'waiting'} 
                    />
                </div>
                
                {stage === 'COMPLETE' && (
                    <div className="text-center animate-bounce mt-4">
                        <span className="text-green-400 font-bold flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-5 h-5" /> 识别成功，跳转中...
                        </span>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: any, title: string, desc: string }> = ({ icon: Icon, title, desc }) => (
    <div className="glass-card p-4 rounded-xl flex items-center gap-4 border border-white/5 hover:border-tech/30 transition-all hover:-translate-y-1 bg-[#050a14]/50">
        <div className="p-2 bg-white/5 rounded-lg text-tech border border-white/5 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
            <Icon className="w-5 h-5" />
        </div>
        <div className="text-left">
            <h4 className="text-white font-bold text-sm">{title}</h4>
            <p className="text-gray-500 text-xs mt-1">{desc}</p>
        </div>
    </div>
);

const StepItem: React.FC<{ icon: any, label: string, status: 'waiting' | 'active' | 'done' }> = ({ icon: Icon, label, status }) => {
    let colorClass = 'text-gray-600';
    let bgClass = 'bg-white/5 border-white/5';
    
    if (status === 'active') {
        colorClass = 'text-tech';
        bgClass = 'bg-tech/10 border-tech/30 animate-pulse';
    } else if (status === 'done') {
        colorClass = 'text-green-400';
        bgClass = 'bg-green-500/10 border-green-500/30';
    }

    return (
        <div className={`flex items-center gap-4 p-3 rounded-lg border transition-all duration-300 ${bgClass}`}>
            <div className={`p-2 rounded-md ${status === 'active' ? 'bg-tech/20' : 'bg-transparent'}`}>
                {status === 'done' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Icon className={`w-5 h-5 ${colorClass}`} />}
            </div>
            <span className={`font-medium ${status === 'waiting' ? 'text-gray-500' : 'text-white'}`}>{label}</span>
            {status === 'active' && <ArrowRight className="w-4 h-4 ml-auto text-tech animate-pulse" />}
        </div>
    );
}