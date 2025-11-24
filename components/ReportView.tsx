
import React, { useState, useEffect, useRef } from 'react';
import { StreamData, AnalysisResult, ChatMessage } from '../types';
import { Share2, Printer, AlertTriangle, CheckCircle2, Cpu, Mic2, Zap, Target, Sparkles, Send, Bot, User, BarChart, FileDown, Loader2, Database, Network, Lock, Activity, XCircle, ThumbsUp, MessageCircleQuestion, Megaphone, Settings, ShoppingCart, Brain, ArrowRight } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { sendChatMessage } from '../services/geminiService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ReportViewProps {
  isLoading: boolean;
  report: AnalysisResult | null;
  data: StreamData | null;
  onCancel?: () => void;
}

// Utility to strip Markdown and HTML tags to clean text
const cleanText = (text: string) => {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, '') 
    .replace(/\*\*/g, '') 
    .replace(/##/g, '') 
    .replace(/__/g, '') 
    .replace(/^- /gm, '') 
    .trim();
};

export const ReportView: React.FC<ReportViewProps> = ({ isLoading, report, data, onCancel }) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Loading State
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('初始化分析引擎...');

  // Effect for Loading Simulation
  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(0);
      const steps = [
        { pct: 10, text: "正在接入直播间音频流..." },
        { pct: 25, text: "AI 识别主播语感与情绪波动..." },
        { pct: 40, text: "正在拆解流量层级与互动密度..." },
        { pct: 60, text: "深度思考用户痛点与底层逻辑..." }, // V1.6 Update
        { pct: 80, text: "构建反向抓取话术模型..." },
        { pct: 95, text: "生成最终诊断报告..." }
      ];

      let currentStepIndex = 0;
      
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 99) return 99;
          const increment = prev < 50 ? Math.random() * 3 : Math.random() * 0.5;
          const nextPct = prev + increment;
          
          if (currentStepIndex < steps.length - 1 && nextPct > steps[currentStepIndex + 1].pct) {
            currentStepIndex++;
            setLoadingStep(steps[currentStepIndex].text);
          }
          
          return nextPct;
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setLoadingProgress(100);
    }
  }, [isLoading]);


  // Initial Chat Greeting
  useEffect(() => {
    if (report && chatHistory.length === 0) {
      setChatHistory([{
        id: 'init',
        role: 'ai',
        content: `你好！我是凡哥科技AI本场复盘助手。\n\n我已根据您的备注和话术，结合数据库策略为您生成了本场报告。\n\n核心问题：${report.oneLineSummary}\n\n无论你是新手还是老手，都可以问我如何优化，我会给您最落地的建议。`,
        timestamp: Date.now()
      }]);
    }
  }, [report, chatHistory.length]);

  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isChatLoading]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !report || !data) return;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: Date.now()
    };

    setChatHistory(prev => [...prev, newUserMsg]);
    setInputMessage('');
    setIsChatLoading(true);

    try {
      const responseText = await sendChatMessage(newUserMsg.content, chatHistory, report, data);
      
      const newAiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: cleanText(responseText),
        timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, newAiMsg]);
    } catch (error) {
      console.error("Chat failed", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#050a14',
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = pdfWidth / imgWidth;
      const imgHeightInPdf = imgHeight * ratio;

      if (imgHeightInPdf > pdfHeight) {
         const longPdf = new jsPDF('p', 'mm', [pdfWidth, imgHeightInPdf]);
         longPdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeightInPdf);
         longPdf.save(`stream-master-report-${Date.now()}.pdf`);
      } else {
         pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeightInPdf);
         pdf.save(`stream-master-report-${Date.now()}.pdf`);
      }

    } catch (error) {
      console.error("PDF Export failed", error);
      alert("导出 PDF 失败，请重试。");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] w-full relative overflow-hidden">
        <div className="absolute inset-0 z-0">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-tech/5 rounded-full blur-[100px] animate-pulse"></div>
           <div className="absolute top-1/4 left-1/4 w-[2px] h-[100px] bg-gradient-to-b from-transparent via-tech/20 to-transparent animate-[float_3s_ease-in-out_infinite]"></div>
        </div>

        <div className="z-10 flex flex-col items-center max-w-md w-full">
            <div className="relative w-32 h-32 mb-10">
                <div className="absolute inset-0 rounded-full border-2 border-tech/20"></div>
                <div className="absolute inset-0 rounded-full border-t-2 border-tech animate-spin"></div>
                <div className="absolute inset-4 rounded-full border-2 border-purple-500/20 border-dashed animate-[spin-slow_10s_linear_infinite_reverse]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Cpu className="w-10 h-10 text-tech animate-pulse" />
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2 tracking-wide font-sans">智能复盘生成中</h3>
            <p className="text-tech font-mono text-sm mb-6 animate-pulse">{loadingStep}</p>

            <div className="w-full h-2 bg-black/50 border border-white/10 rounded-full overflow-hidden relative mb-2">
                <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-tech via-blue-500 to-purple-500 transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                >
                    <div className="absolute inset-0 bg-white/20 animate-[scan_2s_linear_infinite]"></div>
                </div>
            </div>
            
            <div className="w-full flex justify-between text-[10px] text-gray-500 font-mono mb-8">
                <span>系统底层运算中...</span>
                <span>{Math.round(loadingProgress)}%</span>
            </div>

            <button onClick={onCancel} className="flex items-center gap-2 px-6 py-2 rounded-full border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all group">
                <XCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">取消 / 停止分析</span>
            </button>
        </div>
      </div>
    );
  }

  if (!report || !data) {
    return (
      <div className="text-center py-32 glass-card rounded-2xl mx-auto max-w-2xl border border-dashed border-white/10">
        <div className="inline-block p-6 rounded-full bg-white/5 mb-6 border border-white/10">
            <AlertTriangle className="w-16 h-16 text-gray-500" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">暂无分析报告</h3>
        <p className="text-gray-400">请先前往「单场分析」页面提交直播数据。</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1800px] mx-auto animate-[fadeIn_0.5s_ease-out] space-y-6 pb-12">
      
      {/* 1. Header Section */}
      <div className="relative bg-black/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-tech via-purple-500 to-tech opacity-50"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
            <div>
                 <div className="flex items-center gap-4 mb-2">
                     <h2 className="text-3xl font-bold text-white tracking-tight font-sans">复盘报告</h2>
                     <div className="px-3 py-1 bg-tech/10 text-tech text-xs font-mono font-bold rounded border border-tech/20">
                        V1.6 深度策略版
                     </div>
                 </div>
                 <div className="flex items-center gap-4 text-gray-400 text-sm font-mono mt-2">
                    <span className="flex items-center gap-2"><BarChart className="w-4 h-4 text-gray-500" /> ID: {data.id}</span>
                    <span className={`${data.gpm && data.gpm >= 1000 ? 'text-green-400' : 'text-yellow-400'} border-l border-white/10 pl-4`}>
                        GPM: {data.gpm}
                    </span>
                    <span className={`${data.ctr && data.ctr >= 5 ? 'text-green-400' : 'text-red-400'} border-l border-white/10 pl-4`}>
                        CTR: {data.ctr}%
                    </span>
                 </div>
            </div>
            
            <div className="flex gap-3">
                <button 
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-6 py-3 bg-tech/10 hover:bg-tech/20 rounded-xl text-sm text-tech border border-tech/20 shadow-[0_0_15px_rgba(0,240,255,0.1)] transition-all font-bold disabled:opacity-50"
                >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    {isExporting ? '正在生成 PDF...' : '导出详细 PDF'}
                </button>
            </div>
        </div>
      </div>

      <div ref={reportRef} className="bg-[#050a14] p-6 rounded-3xl border border-white/5"> 
        {/* V1.6 Layout: BENTO GRID STYLE (Clean & Organized) */}
        <div className="space-y-8">
            
            {/* Row 1: Summary (Hero) */}
            <div className="w-full">
                <div className="bg-gradient-to-br from-purple-900/40 to-black border border-purple-500/30 rounded-3xl p-8 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                        <h3 className="text-white font-bold text-base uppercase tracking-widest">AI 核心诊断结论</h3>
                    </div>
                    <p className="text-xl text-white font-medium italic leading-relaxed border-l-4 border-purple-500 pl-6">
                        "{cleanText(report.oneLineSummary)}"
                    </p>
                </div>
            </div>

            {/* Row 2: Metrics & Deep Thinking (3 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Col 1: Radar */}
                <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.3)] flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-tech">
                        <Target className="w-5 h-5" />
                        <h3 className="text-sm font-bold uppercase tracking-widest">五维能力模型</h3>
                    </div>
                    <div className="flex-1 min-h-[250px] relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={report.radarData}>
                                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="本场表现" dataKey="A" stroke="#00f0ff" strokeWidth={3} fill="#00f0ff" fillOpacity={0.15} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Col 2: Human Factor & Highlights */}
                <div className="space-y-6">
                     {/* Human Factor */}
                    <div className="glass-card rounded-3xl p-6 border border-white/10">
                        <div className="flex items-center gap-2 mb-4 text-purple-400">
                            <Mic2 className="w-5 h-5" />
                            <h3 className="text-sm font-bold uppercase tracking-widest">主播语感分析</h3>
                        </div>
                         <div className="bg-white/5 p-4 rounded-xl mb-4">
                              <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs text-gray-400 font-bold uppercase">节奏评分</span>
                                  <span className="text-lg text-purple-400 font-mono font-bold">{report.humanFactorAnalysis?.rhythmScore || 0}</span>
                              </div>
                              <p className="text-sm text-gray-300 leading-relaxed">
                                  {cleanText(report.humanFactorAnalysis?.toneAnalysis || "暂无分析")}
                              </p>
                          </div>
                          <div className="flex gap-3 items-start text-sm text-purple-200">
                              <Zap className="w-4 h-4 text-purple-400 mt-1 shrink-0" />
                              <p>{cleanText(report.humanFactorAnalysis?.suggestion || "暂无建议")}</p>
                          </div>
                    </div>
                    
                    {/* Highlights */}
                    {report.highlights && report.highlights.length > 0 && (
                         <div className="glass-card rounded-3xl p-6 border border-green-500/30 bg-green-500/5">
                            <div className="flex items-center gap-2 mb-4 text-green-400">
                                <ThumbsUp className="w-5 h-5" />
                                <h3 className="text-sm font-bold uppercase tracking-widest">亮点复盘</h3>
                            </div>
                            <div className="space-y-3">
                                {report.highlights.slice(0, 2).map((h, i) => (
                                    <div key={i} className="flex gap-2 items-start">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                        <span className="text-sm text-gray-300">{h.content}</span>
                                    </div>
                                ))}
                            </div>
                         </div>
                    )}
                </div>

                {/* Col 3: Deep Thinking (User Q&A) */}
                <div className="glass-card rounded-3xl p-6 border border-blue-500/30 bg-blue-500/5 flex flex-col">
                     <div className="flex items-center gap-2 mb-4 text-blue-400">
                        <Brain className="w-5 h-5" />
                        <h3 className="text-sm font-bold uppercase tracking-widest">深度痛点粉碎</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[400px]">
                        {report.userQuestionAnalysis && report.userQuestionAnalysis.length > 0 ? (
                             <div className="space-y-6">
                                {report.userQuestionAnalysis.map((qa, idx) => (
                                    <div key={idx} className="space-y-2 pb-4 border-b border-blue-500/10 last:border-0 last:pb-0">
                                        <h4 className="text-white font-bold text-sm flex items-start gap-2">
                                            <MessageCircleQuestion className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                            {cleanText(qa.title)}
                                        </h4>
                                        
                                        <div className="ml-6 bg-black/20 p-3 rounded-lg border-l-2 border-blue-500/30">
                                            <div className="text-[10px] text-blue-300/60 font-bold uppercase mb-1">底层逻辑 (Why)</div>
                                            <p className="text-xs text-gray-300 leading-relaxed mb-2">{cleanText(qa.deepThinking)}</p>
                                            
                                            <div className="text-[10px] text-tech/60 font-bold uppercase mb-1">反直觉打法 (Strategy)</div>
                                            <p className="text-xs text-gray-300 leading-relaxed">{cleanText(qa.strategy)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-10">无特定痛点分析</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 3: Diagnosis & Strategy (2 Columns - Balanced) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Diagnosis List */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <h3 className="text-lg font-bold text-white">核心问题诊断</h3>
                    </div>
                    {report.diagnosis.map((issue, idx) => (
                      <div key={idx} className="bg-surface border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all hover:bg-white/5 group">
                          <div className="flex items-start gap-4">
                              <div className={`mt-2 w-2 h-2 rounded-full shrink-0 ${issue.severity === 'high' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                              <div>
                                  <h4 className={`font-bold text-base mb-2 group-hover:text-white transition-colors ${issue.severity === 'high' ? 'text-red-400' : 'text-gray-200'}`}>{cleanText(issue.title)}</h4>
                                  <p className="text-sm text-gray-400 leading-relaxed text-justify whitespace-pre-wrap">{cleanText(issue.content)}</p>
                              </div>
                          </div>
                      </div>
                  ))}
                </div>

                {/* Full Strategy */}
                <div className="glass-card rounded-3xl p-6 border border-tech/20 bg-tech/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                      <Zap className="w-32 h-32 text-tech" />
                    </div>
                    <div className="flex items-center gap-2 mb-6 relative z-10">
                        <div className="w-8 h-8 rounded-lg bg-tech/20 flex items-center justify-center text-tech">
                             <Settings className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-white">深度全维优化方案</h3>
                    </div>

                    <div className="space-y-4 relative z-10">
                         {report.strategy.map((strat, idx) => (
                          <div key={idx} className="relative bg-black/30 rounded-2xl p-5 border border-white/5 hover:border-tech/30 transition-all">
                              <div className="flex items-center gap-3 mb-4">
                                  {strat.type === 'traffic' && <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded border border-purple-500/20 flex items-center gap-1"><Network className="w-3 h-3"/> 流量层级</span>}
                                  {strat.type === 'operation' && <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded border border-blue-500/20 flex items-center gap-1"><Settings className="w-3 h-3"/> 运营节奏</span>}
                                  {strat.type === 'content' && <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded border border-green-500/20 flex items-center gap-1"><Megaphone className="w-3 h-3"/> 内容话术</span>}
                                  
                                  <h4 className="font-bold text-white text-sm uppercase tracking-wide flex-1">{cleanText(strat.title)}</h4>
                              </div>
                              
                              <div className="space-y-4 pl-2 border-l border-white/10 ml-1">
                                  {strat.steps.map((step, sIdx) => (
                                      <div key={sIdx} className="relative">
                                          <div className="absolute -left-[13px] top-2 w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                                          <p className="text-sm text-gray-300 leading-relaxed mb-2">
                                              <span className="whitespace-pre-wrap">{cleanText(step.depthAnalysis)}</span>
                                          </p>

                                          {step.scriptOptimization && (
                                              <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                                  <h5 className="text-[10px] font-bold text-yellow-500 uppercase mb-1 flex items-center gap-1">
                                                      <Mic2 className="w-3 h-3" /> 话术优化建议
                                                  </h5>
                                                  <p className="text-sm text-gray-200 italic font-medium whitespace-pre-wrap">
                                                      "{cleanText(step.scriptOptimization)}"
                                                  </p>
                                              </div>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))}
                    </div>
                </div>

            </div>

        </div>
      </div>

      {/* 3. Interactive AI Consultant */}
      <div className="mt-8 max-w-4xl mx-auto">
        <div className="glass-card rounded-3xl overflow-hidden border border-tech/30 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
            <div className="bg-white/5 p-4 border-b border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tech to-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                    <Bot className="w-5 h-5 text-black" />
                </div>
                <h3 className="text-white font-bold text-sm">AI 本场复盘助手 (专业陪跑版)</h3>
            </div>

            <div 
                ref={chatScrollRef}
                className="h-[300px] overflow-y-auto p-6 space-y-6 bg-black/40 scroll-smooth"
            >
                {chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-700' : 'bg-tech/20 text-tech'}`}>
                            {msg.role === 'user' ? <User className="w-4 h-4 text-gray-300" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-white/10 text-white rounded-tr-none' : 'bg-tech/10 text-gray-200 border border-tech/10 rounded-tl-none'}`}>
                            {cleanText(msg.content)}
                        </div>
                    </div>
                ))}
                {isChatLoading && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-tech/20 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-tech animate-pulse" />
                        </div>
                        <div className="flex gap-1 items-center p-4 bg-tech/5 rounded-2xl rounded-tl-none">
                            <span className="w-1.5 h-1.5 bg-tech/50 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-tech/50 rounded-full animate-bounce delay-100"></span>
                            <span className="w-1.5 h-1.5 bg-tech/50 rounded-full animate-bounce delay-200"></span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-white/5 border-t border-white/10 flex gap-3">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="我有经验，请深入分析..."
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-tech focus:ring-1 focus:ring-tech outline-none transition-all placeholder-gray-600 text-sm"
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={isChatLoading || !inputMessage.trim()}
                    className="px-6 bg-tech hover:bg-tech/80 text-black font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    <Send className="w-4 h-4" />
                    发送
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
