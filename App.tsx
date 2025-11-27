
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DashboardView } from './components/DashboardView';
import { InputForm } from './components/InputForm';
import { KnowledgeBase } from './components/KnowledgeBase';
import { ReportView } from './components/ReportView';
import { UploadView } from './components/UploadView';
import { HistoryView } from './components/HistoryView';
import { ScriptAnalysisView } from './components/ScriptAnalysisView';
import { AuthModal } from './components/AuthModal';
import { ParticleBackground } from './components/ParticleBackground';
import { Tab, StreamData, KnowledgeItem, AnalysisResult, HistoryRecord, TrendData, TrendAnalysisResult, ScriptAnalysisResult, ScriptStage, ScriptState, User } from './types';
import { analyzeStream } from './services/geminiService';

// Initial Knowledge Base
const INITIAL_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: '0',
    title: '低流速激活：点对点与平播的抉择 (Velocity vs Conversion)',
    content: '【核心：流速 vs 成交 (The Trade-off)】\n1. **缺流速？-> 憋单 (Holding)**：制造拥挤感，牺牲成交速度换取互动密度，撬动系统推流。\n2. **缺成交/求稳？-> 点对点平播 (One-on-One)**：放弃拉升流速，把每一个进来的流量吃干抹净，建立深度信任。\n\n【强制执行：低流速反向抓取】\n**没人/没流速时，必须先进行点对点反向抓取！**\n严禁自顾自讲品，必须盯着进场名单喊名字：“**XX（用户名）你先别拍！手停一下！**”（利用好奇心+损失厌恶，强制停留）。\n\n【极致平播成交模型 (4步法闭环)】\n1. **Step 1: 拉新/破冰 (Acquisition)**\n   - **话术**：“XX，**你先别拍！听我说完再决定**，我不能让你盲目消费。”\n   - **锚点**：引用对标渠道的高价，引出“骨折价”。\n   - **理由**：解释为什么便宜（为了口碑/冲榜/厂家直供）。\n\n2. **Step 2: 塑品/价值 (Value)**\n   - **五感营销**：使用“不是...而是...”拉踩竞品。\n   - 必须包含**视觉、触觉、使用场景**细节描述。\n   - 强调“天花板”品质，用过回不去。\n\n3. **Step 3: 保障/信任 (Assurance)**\n   - 原话1：“同等价格对比品质，同等品质对比价格。”\n   - 原话2：“收到货不满意，**你不用退回来，我一分钱不要。**”\n   - 原话3：“我干直播就一句话，**赚该赚的钱，睡安稳的觉**。”\n\n4. **Step 4: 逼单/收割 (Closing)**\n   - **指令**：明确下单动作。\n   - **施压**：“我现在直播间人少，**宁可不赚钱甚至亏本，也要把好产品推出去拉数据**。最后3单，手慢无。”',
    isActive: true,
  },
  {
    id: '1',
    title: '起号黑科技：鱼塘补单与赛马机制 (Fish Pond V1.3)',
    content: '【核心：数据递增 + 模拟真人】\n配合点对点使用，利用5-10个“洗好标签”的鱼塘号进行干预。\n\n1. **5分钟赛马机制**：系统每5分钟结算一次。我们必须在结算点前做出数据递增。\n2. **递增模型**：\n   - 第1个5分钟：补2单。\n   - 第2个5分钟：补3单。\n   - 第3个5分钟：补4单。\n3. **进场规则**：严禁直接搜账号！必须搜关键词或刷广场推荐进入，模拟真实用户行为（停留-出去-回来-互动-下单）。',
    isActive: true,
  },
  {
    id: '2',
    title: '流量分层：泛流量 vs 精准流量',
    content: '【标签优先】\n- 泛流量是毒药，精准标签才是资产。\n- 起号期不要盲目发福袋拉人，那是羊毛党，会毁了标签。\n- 如果人群不准，宁可不成交，也要先用微付费（随心推-自定义人群）或鱼塘号把模型校准。',
    isActive: true,
  },
  {
    id: '3',
    title: '单品打法策略 (Default: Single Product)',
    content: '【默认作战协议】\n- 绝大多数自然流起号，适用单品模式（测款-打爆-循环）。\n- 核心：利用爆品去做单爆循环。不要频繁过款，容易把标签打乱。\n- 除非学员明确表示要“排品/过款”，否则坚持单品打法建议。',
    isActive: true,
  },
  {
    id: '4',
    title: '十二条算法铁律 (Algorithm Rules)',
    content: '1. 抖音既去中心化又中心化（强化标签）。\n2. 二八定律：20%的人拿走80%的流量。\n3. 直播间是蓄水池：进水口(推流)和出水口(划走)决定水位。\n4. 停留互动是基础，成交是核心。\n5. eCPM = 出价 × CTR × CVR × 1000。',
    isActive: true,
  },
  {
    id: '5',
    title: '人性化信任话术 (Human-Centric Trust Template)',
    content: '【通用模板：打动观众的核心】\n1. **品质差异**：直播间所有的同学来听我讲，很多东西看上去差不多，其实差很多...服务差一点，口碑就会差。\n2. **真性价比**：所谓的性价比，不是比的谁更便宜，而且你花的每一分钱！都是物超所值。\n3. **良心宣言**：干直播就一句话，赚该赚的钱，睡安稳的觉。\n4. **老粉背书**：东西好不好不是靠我主播说，你去看看我们买过的粉丝怎么说...\n5. **无惧对比**：同等的价格去对比品质，同等的品质去对比价格。',
    isActive: true,
  },
  {
    id: '6',
    title: '控流策略：憋单 (Holding) 的本质',
    content: '【流量杠杆】\n1. **逻辑互斥与衔接**：\n   - 憋单的本质是**“牺牲转化速度，换取流量流速”**。通过制造“想买的人多 vs 库存少”的供需冲突，激发羊群效应。\n   - 当你决定要拉流速（撬动更高层级流量池）时，启用憋单。\n   - 当你决定要落袋为安（保转化率）时，切换回平播。\n2. **执行条件**：\n   - 不看绝对人数，看主播控场能力。若主播能抗住压力，10+人也能憋。\n   - 必须有足够的话术密度来填补“不卖”的空白期。',
    isActive: true,
  },
  {
    id: '7',
    title: '【战术储备】排品与节奏原则 (Advanced: Product Scheduling)',
    content: '【触发条件：学员明确提及“排品”、“过款”、“专场”、“很多款”时激活】\n\n1. **排品逻辑**：\n   - **引流款 (A款)**：炸场、不亏钱或微亏，目的是拉停留和互动。\n   - **炮灰款 (B款)**：用来做价格锚点，或者用来过渡，不求成交，只求拉长停留时长。\n   - **利润款 (C款)**：真正的承接款，质量好、价格适中，用于收割流量。\n\n2. **节奏把控**：\n   - 不要一上来就卖利润款。先用引流款把场热起来，用炮灰款把人留住，最后把利润款抛出来收割。',
    isActive: true,
  }
];

const DEFAULT_INPUT_DATA: Partial<StreamData> = {
    date: new Date().toISOString().split('T')[0],
    durationMinutes: undefined,
    maxConcurrent: undefined,
    totalViews: undefined,
    gmv: undefined,
    gpm: undefined,
    retentionRate: undefined,
    ctr: undefined,
    interactionRate: undefined,
    entryRate: undefined,
    clickConversionRate: undefined,
    transcriptSnippet: "",
    notes: ""
};

const DB_HISTORY_PREFIX = 'streammaster_history_';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [hasStarted, setHasStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>(INITIAL_KNOWLEDGE);
  
  const [inputFormData, setInputFormData] = useState<Partial<StreamData>>(DEFAULT_INPUT_DATA);
  const [report, setReport] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [initialTrendData, setInitialTrendData] = useState<TrendData[] | undefined>(undefined);
  const [initialTrendResult, setInitialTrendResult] = useState<TrendAnalysisResult | null>(undefined);

  const [scriptState, setScriptState] = useState<ScriptState>({
    stage: 'newbie',
    productName: '',
    benchmark: '',
    priceMechanism: '',
    sellingPoints: '',
    guarantee: '',
    result: null
  });

  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Restore session
  useEffect(() => {
    const savedSession = localStorage.getItem('streammaster_current_user');
    if (savedSession) {
        try {
            const parsedUser = JSON.parse(savedSession);
            // Check expiry
            if (!parsedUser.expiryDate || Date.now() < parsedUser.expiryDate) {
                 setUser(parsedUser);
            } else {
                 localStorage.removeItem('streammaster_current_user');
            }
        } catch (e) {
            console.error("Session parse error", e);
        }
    }
  }, []);

  // Load History on Login
  useEffect(() => {
    if (user) {
        const key = `${DB_HISTORY_PREFIX}${user.username}`;
        const savedHistory = localStorage.getItem(key);
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error("Failed to load history");
            }
        }
    } else {
        setHistory([]);
    }
  }, [user]);

  // Persist History on Change (if logged in)
  useEffect(() => {
    if (user && history.length > 0) {
        const key = `${DB_HISTORY_PREFIX}${user.username}`;
        localStorage.setItem(key, JSON.stringify(history));
    }
  }, [history, user]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [activeTab, hasStarted]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const checkAccess = () => {
    if (!user || !user.isActivated) {
        setShowAuthModal(true);
        return false;
    }
    return true;
  };

  const handleUploadComplete = (extractedData?: Partial<StreamData>) => {
    if (!checkAccess()) return;
    
    setHasStarted(true);
    if (extractedData) {
      setInputFormData(prev => ({ ...prev, ...extractedData }));
      setActiveTab(Tab.INPUT); 
    } else {
      setActiveTab(Tab.DASHBOARD);
    }
  };

  const handleDirectEntry = () => {
    if (!checkAccess()) return;
    setHasStarted(true);
    setActiveTab(Tab.INPUT);
  };

  const handleNavigateToHome = () => {
    setHasStarted(false);
    setActiveTab(Tab.DASHBOARD);
  };

  const handleInputClear = () => {
      setInputFormData(DEFAULT_INPUT_DATA);
      setReport(null);
  };

  const handleDataSubmit = async () => {
    if (!checkAccess()) return;

    const dataToSubmit = { ...inputFormData, id: Date.now().toString() } as StreamData;
    
    setActiveTab(Tab.REPORT);
    setIsAnalyzing(true);
    setReport(null);
    
    try {
      const resultJSON = await analyzeStream(dataToSubmit, knowledgeBase);
      setReport(resultJSON);
      
      const newRecord: HistoryRecord = {
        type: 'STREAM',
        id: Date.now().toString(),
        timestamp: Date.now(),
        data: dataToSubmit,
        report: resultJSON
      };
      // History persistence is handled by useEffect
      setHistory(prev => [newRecord, ...prev]);

    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCancelAnalysis = () => {
    setIsAnalyzing(false);
    setActiveTab(Tab.INPUT); 
    setReport(null);
  };

  const handleSaveToHistory = (record: HistoryRecord) => {
    setHistory(prev => [record, ...prev]);
  }

  const handleViewHistory = (record: HistoryRecord) => {
    setHasStarted(true); // Ensure we move out of upload view
    
    if (record.type === 'STREAM') {
      setInputFormData(record.data); 
      setReport(record.report); 
      setActiveTab(Tab.REPORT);
    } else if (record.type === 'TREND') {
      setInitialTrendData(record.data);
      setInitialTrendResult(record.report);
      setActiveTab(Tab.DASHBOARD);
    } else if (record.type === 'SCRIPT') {
      setScriptState({
        stage: record.inputs.stage,
        productName: record.inputs.productName,
        benchmark: record.inputs.benchmark,
        priceMechanism: record.inputs.priceMechanism,
        sellingPoints: record.inputs.sellingPoints,
        guarantee: record.inputs.guarantee,
        result: record.report
      });
      setActiveTab(Tab.SCRIPT_ANALYSIS);
    }
    setShowHistory(false);
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('streammaster_current_user'); // Clear session
    setUser(null);
    setShowAuthModal(true); // Prompt login again
    setHasStarted(false); // Reset to landing page
  };

  return (
    <div className="min-h-screen text-gray-200 font-sans selection:bg-tech selection:text-black relative overflow-hidden flex flex-col">
      <ParticleBackground />
      
      {showAuthModal && (
        <AuthModal 
            onLogin={handleLogin} 
            onClose={() => setShowAuthModal(false)} 
        />
      )}

      <Header 
        user={user}
        onNavigateToDashboard={handleNavigateToHome} 
        setActiveTab={setActiveTab} 
        onToggleHistory={() => setShowHistory(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {showHistory && (
        <div className="fixed inset-0 z-[60] flex justify-end">
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
                onClick={() => setShowHistory(false)}
            ></div>
            <div className="relative w-96 h-full bg-[#050a14] border-l border-white/10 shadow-2xl p-6 overflow-y-auto animate-[slideInRight_0.3s_ease-out]">
                <HistoryView history={history} onViewRecord={handleViewHistory} />
            </div>
        </div>
      )}

      {!hasStarted ? (
        <div className="pt-20 relative z-10 flex-1">
            <UploadView onComplete={handleUploadComplete} onDirectEnter={handleDirectEntry} />
            <Footer />
        </div>
      ) : (
        <div className="flex pt-20 flex-1 overflow-hidden h-[calc(100vh-80px)]">
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={handleTabChange} 
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
          
          <main className="flex-1 overflow-y-auto pl-0 md:pl-64 relative z-10 scroll-smooth w-full">
            <div className="max-w-[1600px] mx-auto min-h-screen flex flex-col">
              <div className="p-4 md:p-8 flex-1">
                {activeTab === Tab.DASHBOARD && (
                  <DashboardView 
                    onSaveToHistory={handleSaveToHistory} 
                    initialData={initialTrendData}
                    initialResult={initialTrendResult}
                  />
                )}
                
                {activeTab === Tab.INPUT && (
                  <div className="glass-card rounded-2xl p-1">
                      <InputForm 
                        data={inputFormData} 
                        onChange={setInputFormData}
                        onSubmit={handleDataSubmit} 
                        onClear={handleInputClear}
                      />
                  </div>
                )}

                {activeTab === Tab.SCRIPT_ANALYSIS && (
                  <ScriptAnalysisView 
                    onSaveToHistory={handleSaveToHistory}
                    scriptState={scriptState}
                    setScriptState={setScriptState}
                  />
                )}
                
                {activeTab === Tab.KNOWLEDGE && (
                  <KnowledgeBase knowledge={knowledgeBase} setKnowledge={setKnowledgeBase} />
                )}
                
                {activeTab === Tab.REPORT && (
                  <ReportView 
                    isLoading={isAnalyzing} 
                    report={report} 
                    data={inputFormData as StreamData} 
                    onCancel={handleCancelAnalysis}
                  />
                )}
              </div>
              
              <Footer />
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default App;
