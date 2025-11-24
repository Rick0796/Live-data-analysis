
import React, { useState } from 'react';
import { BookOpen, Plus, CheckCircle, Circle, Lock } from 'lucide-react';
import { KnowledgeItem } from '../types';

interface KnowledgeBaseProps {
  knowledge: KnowledgeItem[];
  setKnowledge: React.Dispatch<React.SetStateAction<KnowledgeItem[]>>;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ knowledge, setKnowledge }) => {
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const toggleActive = (id: string) => {
    setKnowledge(prev => prev.map(item => 
      item.id === id ? { ...item, isActive: !item.isActive } : item
    ));
  };

  const handleAdd = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const newItem: KnowledgeItem = {
      id: Date.now().toString(),
      title: newTitle,
      content: newContent,
      isActive: true
    };
    setKnowledge(prev => [...prev, newItem]);
    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
  };

  return (
    <div className="max-w-5xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">AI 策略知识库</h2>
          <p className="text-gray-400 max-w-2xl">
            这是系统的**核心策略大脑**。AI 将根据这些规则来判断学员执行是否到位。
            <br/><span className="text-tech text-sm">凡哥 V1.3 内核已加载：默认基于纯自然流起号逻辑，包含鱼塘干预与赛马算法。</span>
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white transition-all"
        >
          <Plus className="w-4 h-4" />
          添加新策略
        </button>
      </div>

      {isAdding && (
        <div className="bg-surface border border-tech/30 rounded-xl p-6 mb-8 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
          <h3 className="text-lg font-medium text-white mb-4">录入新知识</h3>
          <div className="space-y-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="策略名称 (例如: 憋单三部曲)"
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-tech outline-none"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
              placeholder="详细描述该策略的逻辑。例如：第一步必须提问痛点，第二步抛出福利钩子，第三步倒计时..."
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-tech outline-none"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-white px-4 py-2">取消</button>
              <button onClick={handleAdd} className="bg-tech text-black font-bold px-6 py-2 rounded-lg hover:bg-tech/90">确认添加</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {knowledge.map((item) => (
          <div 
            key={item.id} 
            className={`bg-surface border ${item.isActive ? 'border-purple-500/30' : 'border-white/5'} rounded-xl p-6 transition-all hover:border-purple-500/50 flex gap-4`}
          >
            <button 
              onClick={() => toggleActive(item.id)}
              className={`mt-1 ${item.isActive ? 'text-tech' : 'text-gray-600'}`}
            >
              {item.isActive ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
            </button>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <h3 className={`text-lg font-semibold ${item.isActive ? 'text-white' : 'text-gray-500'}`}>{item.title}</h3>
                    {['0', '1', '2', '3', '4', '5', '6'].includes(item.id) && (
                        <span className="flex items-center gap-1 text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-500 border border-white/5">
                            <Lock className="w-3 h-3" /> 凡哥核心
                        </span>
                    )}
                </div>
                {/* Delete button removed to protect core strategies */}
              </div>
              <p className={`mt-2 text-sm leading-relaxed ${item.isActive ? 'text-gray-300' : 'text-gray-600'} whitespace-pre-wrap`}>
                {item.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
