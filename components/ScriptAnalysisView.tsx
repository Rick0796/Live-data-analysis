import React, { useState, useEffect } from 'react';
import { MessageSquareText, Play, RefreshCw, Zap, Users, Send, Bot, Copy, Check, MousePointer2, Brain, RotateCcw } from 'lucide-react';
import { ScriptStage, ScriptAnalysisResult, HistoryRecord, ScriptState } from '../types';
import { analyzeScript, refineScript } from '../services/geminiService';

interface ScriptAnalysisViewProps {
  onSaveToHistory?: (record: HistoryRecord) => void;
  // New props for state persistence
  scriptState: ScriptState;
  setScriptState: React.Dispatch<React.SetStateAction<ScriptState>>;
  // Deprecated props (left optionally for interface compat, but unused)
  initialInputs?: { stage: ScriptStage; product: string; content: string };
  initialResult?: ScriptAnalysisResult | null;
}

export const ScriptAnalysisView: React.FC<ScriptAnalysisViewProps> = ({ 
  onSaveToHistory, 
  scriptState,
  setScriptState 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  // AI Agent Refinement State
  const [refineInput, setRefineInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Copy State
  const [copied, setCopied] = useState(false);

  // Fake progress bar effect
  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);
    } else {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const updateState = (updates: Partial<ScriptState>) => {
    setScriptState(prev => ({ ...prev, ...updates }));
  };

  const handleReset = () => {
    setScriptState({
        stage: 'newbie',
        productName: '',
        scriptContent: '',
        result: null
    });
  };

  const handleAnalyze = async () => {
    if (!scriptState.productName.trim() || !scriptState.scriptContent.trim()) return;
    
    setIsAnalyzing(true);
    updateState({ result: null });
    
    try {
      const analysis = await analyzeScript(scriptState.stage, scriptState.productName, scriptState.scriptContent);
      updateState({ result: analysis });

      if (onSaveToHistory) {
        onSaveToHistory({
          type: 'SCRIPT',
          id: Date.now().toString(),
          timestamp: Date.now(),
          inputs: { stage: scriptState.stage, product: scriptState.productName, content: scriptState.scriptContent },
          report: analysis
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefine = async () => {
    if (!scriptState.result || !refineInput.trim()) return;
    setIsRefining(true);
    try {
      const newResult = await refineScript(scriptState.result, refineInput);
      // Update only the result part of the global state
      updateState({ 
        result: {
            ...scriptState.result,
            simulation: newResult.simulation
        } 
      });
      setRefineInput('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefining(false);
    }
  };

  const handleCopy = () => {
    if (!scriptState.result) return;
    // Modified: Only copy the content (script), excluding the logic explanation.
    const textToCopy = scriptState.result.simulation.steps.map(s => `${s.label}: ${s.content}`).join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease-out] space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-tech/10 rounded-xl border border-tech/20 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <MessageSquareText className="w-8 h-8 text-tech" />
            </div>
            <div>
            <h2 className="text-2xl font-bold text-white">话术实战模拟器</h2>
            <p className="text-gray-400 text-sm">AI 针对不同阶段进行逻辑拆解与实时流量模拟</p>
            </div>
        </div>
        {/* Reset Button */}
        {(scriptState.productName || scriptState.scriptContent || scriptState.result) && (
            <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/30 rounded-lg transition-all"
            >
                <RotateCcw className="w-4 h-4" />
                清空 / 重新输入
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Input Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-white/10">
            
            {/* Stage Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-3">当前阶段 (决定模拟策略)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'newbie', label: '新手小白', desc: '点对点实操' },
                  { id: 'veteran', label: '老手运营', desc: '憋单节奏' },
                  { id: 'master', label: '行业高手', desc: '动态控流' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => updateState({ stage: s.id as ScriptStage })}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      scriptState.stage === s.id
                        ? 'bg-tech/20 border-tech text-white shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                        : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-bold text-sm">{s.label}</span>
                    <span className="text-[10px] opacity-70">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Product Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">核心售卖产品</label>
              <input
                type="text"
                value={scriptState.productName}
                onChange={(e) => updateState({ productName: e.target.value })}
                placeholder="例如：9.9元福利款垃圾袋 / 199元真丝衬衫"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-tech outline-none transition-all"
              />
            </div>

            {/* Script Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">现有话术 / 痛点描述</label>
              <textarea
                value={scriptState.scriptContent}
                onChange={(e) => updateState({ scriptContent: e.target.value })}
                rows={8}
                placeholder="粘贴你的草稿，或者你想表达的产品卖点..."
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-tech outline-none transition-all resize-none"
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !scriptState.productName || !scriptState.scriptContent}
              className="w-full py-4 bg-gradient-to-r from-tech to-blue-600 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              {isAnalyzing ? 'AI 正在拆解...' : '开始场景模拟'}
            </button>
          </div>
        </div>

        {/* Output Column */}
        <div className="lg:col-span-3">
          
          {/* Progress Bar */}
          {isAnalyzing && (
            <div className="mb-4">
               <div className="flex justify-between text-xs text-tech mb-1">
                 <span>深度思考中...</span>
                 <span>{Math.round(progress)}%</span>
               </div>
               <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                 <div className="h-full bg-tech transition-all duration-300" style={{ width: `${progress}%` }}></div>
               </div>
            </div>
          )}

          {scriptState.result ? (
            <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
              
              {/* Logic Diagnosis Card */}
              <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <Zap className="w-16 h-16 text-purple-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-400" /> 话术逻辑诊断
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-red-500/10 border-l-2 border-red-500 p-4 rounded-r-lg">
                    <p className="text-xs text-red-400 font-bold uppercase mb-1">逻辑诊断 (Original Flaw)</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{scriptState.result.logicDiagnosis.originalFlaw}</p>
                  </div>
                  <div className="bg-green-500/10 border-l-2 border-green-500 p-4 rounded-r-lg">
                    <p className="text-xs text-green-400 font-bold uppercase mb-1">专家优化思路 (Optimization)</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{scriptState.result.logicDiagnosis.optimizedLogic}</p>
                  </div>
                </div>
              </div>

              {/* Simulation Card */}
              <div className="glass-card rounded-2xl border border-tech/30 overflow-hidden flex flex-col">
                {/* Sim Header */}
                <div className="bg-white/5 p-4 border-b border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${scriptState.stage === 'newbie' ? 'bg-yellow-400' : 'bg-red-500'}`}></div>
                    <span className="text-white font-bold text-sm">{scriptState.result.simulation.scenario}</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2 text-xs font-mono text-tech bg-tech/10 px-3 py-1 rounded-full">
                        <Users className="w-3 h-3" />
                        {scriptState.result.simulation.trafficContext}
                    </div>
                    <button 
                        onClick={handleCopy}
                        className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-colors"
                    >
                        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        {copied ? '已复制' : '一键复制话术'}
                    </button>
                  </div>
                </div>

                {/* Sim Content Steps */}
                <div className="p-6 space-y-6">
                  {scriptState.result.simulation.steps.map((step, idx) => (
                    <div key={idx} className="relative pl-8 group">
                      {/* Timeline Line */}
                      <div className="absolute left-[11px] top-8 h-full w-[2px] bg-white/5 group-last:hidden"></div>
                      
                      {/* Step Dot */}
                      <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center z-10 group-hover:border-tech/50 group-hover:bg-tech/10 transition-colors">
                        <span className="text-[10px] font-mono text-gray-500 group-hover:text-tech">{idx + 1}</span>
                      </div>

                      {/* Content */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-tech font-bold text-sm">{step.label}</span>
                          {step.actionTip && (
                            <span className="text-[10px] text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                               <MousePointer2 className="w-3 h-3" /> {step.actionTip}
                            </span>
                          )}
                        </div>

                        {/* Logic Explanation (Deep Thinking) */}
                        {step.logic && (
                          <div className="mb-2 flex gap-2 items-start bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
                              <Brain className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                              <p className="text-[11px] text-blue-300 leading-tight">
                                <span className="font-bold opacity-80">深度思考：</span>
                                {step.logic}
                              </p>
                          </div>
                        )}

                        <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-gray-200 text-sm leading-relaxed font-medium">
                          "{step.content}"
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Agent Tweaker */}
                <div className="p-4 bg-black/40 border-t border-white/10">
                   <div className="flex items-center gap-3 mb-3">
                      <Bot className="w-4 h-4 text-tech" />
                      <span className="text-xs font-bold text-gray-400 uppercase">AI 话术精修师</span>
                   </div>
                   <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={refineInput}
                        onChange={(e) => setRefineInput(e.target.value)}
                        placeholder="不满意？告诉AI调整。例如：再狠一点，理由改成清仓..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-tech outline-none"
                        onKeyPress={(e) => e.key === 'Enter' && handleRefine()}
                      />
                      <button 
                        onClick={handleRefine}
                        disabled={isRefining || !refineInput.trim()}
                        className="bg-tech/20 hover:bg-tech/30 text-tech border border-tech/30 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
                      >
                         {isRefining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                   </div>
                </div>
              </div>

            </div>
          ) : (
            // Empty State / Placeholder
            <div className="h-full flex flex-col items-center justify-center text-center p-12 glass-card rounded-2xl border border-dashed border-white/10">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <MessageSquareText className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">等待指令</h3>
              <p className="text-gray-500 max-w-sm">请在左侧输入您的产品和话术草稿，AI 将为您生成{scriptState.stage === 'newbie' ? '点对点实操' : '动态憋单'}演示。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};