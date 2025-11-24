

export enum Tab {
  DASHBOARD = 'DASHBOARD',
  INPUT = 'INPUT',
  KNOWLEDGE = 'KNOWLEDGE',
  REPORT = 'REPORT',
  SCRIPT_ANALYSIS = 'SCRIPT_ANALYSIS',
}

export interface StreamData {
  id: string;
  date: string;
  durationMinutes?: number;
  maxConcurrent?: number;
  totalViews?: number;
  gmv?: number;
  gpm?: number; 
  retentionRate?: number; 
  ctr?: number; 
  interactionRate?: number;
  entryRate?: number; // 进房率
  clickConversionRate?: number; // 点击转化率
  transcriptSnippet: string; 
  notes: string; 
}

export interface AnalysisRecord {
  id: string;
  timestamp: number;
  data: StreamData;
  report: AnalysisResult;
}

export interface ChartDataPoint {
  subject: string;
  A: number;
  fullMark: number;
}

export interface StrategyStep {
  depthAnalysis: string; // 深度大白话解析 (动作+原理融合)
  scriptOptimization?: string; // 独立的话术优化 (话术示例)
}

export interface AnalysisResult {
  oneLineSummary: string;
  radarData: ChartDataPoint[];
  highlights?: { 
    title: string;
    content: string;
  }[];
  diagnosis: {
    title: string;
    content: string; 
    severity: 'high' | 'medium' | 'low';
  }[];
  humanFactorAnalysis: { 
    rhythmScore: number;
    toneAnalysis: string;
    suggestion: string;
  };
  // New: Dedicated section for specific user questions
  userQuestionAnalysis?: {
    title: string;
    content: string;
  }[];
  // Updated Strategy Structure
  strategy: {
    title: string;
    type: 'traffic' | 'operation' | 'content'; // 流量 | 运营 | 内容
    steps: StrategyStep[];
  }[];
  rawText?: string; 
}

export interface KnowledgeItem {
  id: string;
  title: string; 
  content: string; 
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
}

export type ScriptStage = 'newbie' | 'veteran' | 'master';

export interface ScriptAnalysisResult {
  logicDiagnosis: {
    originalFlaw: string;
    optimizedLogic: string;
  };
  simulation: {
    scenario: string; 
    trafficContext: string; 
    steps: {
      label: string; 
      logic?: string; 
      content: string;
      actionTip?: string; 
    }[];
  };
}

// Unified State for Script Analysis Persistence
export interface ScriptState {
  stage: ScriptStage;
  productName: string;
  scriptContent: string;
  result: ScriptAnalysisResult | null;
}

// Trend Analysis Interfaces
export interface TrendData {
  date: string;
  gmv: number;
  totalViews: number;
  gpm: number;
  maxConcurrent: number;
}

export interface TrendAnalysisResult {
  analysis: string; 
  suggestion: string; 
}

// Unified History Type
export type HistoryRecord = 
  | { type: 'STREAM'; id: string; timestamp: number; data: StreamData; report: AnalysisResult }
  | { type: 'TREND'; id: string; timestamp: number; data: TrendData[]; report: TrendAnalysisResult }
  | { type: 'SCRIPT'; id: string; timestamp: number; inputs: { stage: ScriptStage; product: string; content: string }; report: ScriptAnalysisResult };
