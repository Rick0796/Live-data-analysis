

import React from 'react';
import { HistoryRecord } from '../types';
import { Clock, ChevronRight, Activity, MessageSquareText, FileText } from 'lucide-react';

interface HistoryViewProps {
  history: HistoryRecord[];
  onViewRecord: (record: HistoryRecord) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onViewRecord }) => {
  const getTypeIcon = (type: HistoryRecord['type']) => {
    switch (type) {
      case 'STREAM': return <FileText className="w-4 h-4 text-purple-400" />;
      case 'TREND': return <Activity className="w-4 h-4 text-tech" />;
      case 'SCRIPT': return <MessageSquareText className="w-4 h-4 text-green-400" />;
    }
  };

  const getTypeText = (type: HistoryRecord['type']) => {
    switch (type) {
      case 'STREAM': return '单场复盘';
      case 'TREND': return '综合趋势';
      case 'SCRIPT': return '话术模拟';
    }
  };

  const renderContent = (record: HistoryRecord) => {
    if (record.type === 'STREAM') {
       return (
         <>
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
              {record.report.oneLineSummary}
          </p>
          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-white/5">
              <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase">GMV</span>
                  <span className="text-xs font-mono text-white">¥{(record.data.gmv || 0).toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 uppercase">CTR</span>
                    <span className={`text-xs font-mono ${(record.data.ctr || 0) < 5 ? 'text-red-400' : 'text-green-400'}`}>
                      {(record.data.ctr || 0)}%
                    </span>
              </div>
          </div>
         </>
       );
    } else if (record.type === 'TREND') {
      const avgViews = Math.round(record.data.reduce((acc, curr) => acc + (curr.totalViews || 0), 0) / record.data.length);
      return (
        <>
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
              {record.report.suggestion}
          </p>
           <div className="flex items-center gap-4 mt-2 pt-2 border-t border-white/5">
              <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase">周期</span>
                  <span className="text-xs font-mono text-white">{record.data.length} 天</span>
              </div>
               <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase">日均场观</span>
                  <span className="text-xs font-mono text-white">{avgViews.toLocaleString()}</span>
              </div>
           </div>
        </>
      )
    } else if (record.type === 'SCRIPT') {
      return (
        <>
           <div className="flex items-center gap-2 mb-1">
             <span className="text-xs bg-white/10 px-2 rounded text-white">{record.inputs.stage}</span>
             <span className="text-xs text-gray-400 font-mono truncate max-w-[120px]">{record.inputs.product}</span>
           </div>
           <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
             场景: {record.report.simulation.scenario}
           </p>
        </>
      )
    }
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">历史数据分析</h2>
      </div>
      
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                <Clock className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400 text-sm">暂无历史记录</p>
        </div>
      ) : (
        <div className="space-y-3">
            {history.map((record) => (
            <div 
                key={record.id}
                onClick={() => onViewRecord(record)}
                className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-tech/30 hover:bg-white/10 transition-all cursor-pointer group relative overflow-hidden"
            >
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <div className="p-1 rounded bg-white/5 border border-white/10">
                             {getTypeIcon(record.type)}
                           </div>
                           <span className="text-xs font-bold text-gray-300">[{getTypeText(record.type)}]</span>
                        </div>
                        <span className="text-[10px] text-gray-600 font-mono">
                            {new Date(record.timestamp).toLocaleDateString()}
                        </span>
                    </div>
                    
                    {renderContent(record)}
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
};
