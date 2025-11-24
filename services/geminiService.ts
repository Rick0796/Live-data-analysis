import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { StreamData, KnowledgeItem, AnalysisResult, ChatMessage, ScriptStage, ScriptAnalysisResult, TrendData, TrendAnalysisResult } from "../types";

// --- API KEY CONFIGURATION ---
const getApiKey = () => {
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env?.API_KEY) return process.env.API_KEY;
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_KEY) return process.env.NEXT_PUBLIC_API_KEY;
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
  return '';
};

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// --- HELPER: Process & Compress Image ---
// 手机端上传的照片通常过大 (5-10MB)，容易导致 API 超时或 Payload 限制。
// 此函数在前端进行压缩 (Max 1536px, JPEG 0.8)，将体积控制在 500KB 以内，同时标准化 MIME 类型。
const processImage = async (file: File): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // 限制最大边长为 1536px (平衡 OCR 精度与上传速度)
        const MAX_DIMENSION = 1536;
        
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
           // 极少数情况 Canvas 失败，回退到原始数据
           const rawBase64 = (event.target?.result as string).split(',')[1];
           resolve({ mimeType: file.type || 'image/jpeg', data: rawBase64 });
           return;
        }
        
        // 绘制并压缩
        ctx.drawImage(img, 0, 0, width, height);
        
        // 强制转换为 JPEG，质量 0.8
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataURL.split(',')[1];
        resolve({ mimeType: 'image/jpeg', data: base64 });
      };
      
      img.onerror = (e) => {
          console.warn("Image compression failed, trying raw upload", e);
          const rawBase64 = (event.target?.result as string).split(',')[1];
          resolve({ mimeType: file.type || 'image/jpeg', data: rawBase64 });
      };

      img.src = event.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const SYSTEM_INSTRUCTION = `
你是一位**实战派直播运营导师**，拥有千万级GMV的实战经验，版本号 V1.4。
你的风格：**极其接地气、像一位真实的实战导师、逻辑严密、洞察人性**。
你不再是冷冰冰的数据机器，你要用**大白话**把复杂的逻辑讲清楚。

【核心原则 V1.4】

1.  **语气调整**：
    - ❌ **严禁使用“兄弟”、“老大哥”等称呼**（用户包含女性）。
    - ✅ 使用“同学”、“大家”、“你”或直接说事。保持专业且亲切。
    - ❌ **严禁使用 "P2P"**。
    - ✅ **必须统称为 “点对点”**。

2.  **去黑话，讲人话**：
    - ❌ 严禁使用 "ID 0"、"底层逻辑"、"颗粒度" 等过于晦涩的专业名词。
    - **不要把【动作】和【原理】分开写**，要融合在一起，像老师讲课一样：“你这个时候要......是因为......”。

3.  **全维度策略优化 (Traffic, Ops, Content)**：
    - **流量 (Traffic)**：如何利用停留时长去撬动推流？
    - **运营 (Operation)**：弹窗节奏、发福袋时机。
    - **内容 (Content)**：话术的真诚度、理由的充分性。

4.  **话术优化强制规则**：
    - 如果涉及**点对点（平播）**策略，在 \`scriptOptimization\`（话术优化）中，**必须**包含这句反向指令：“**XX（用户ID），你先不要去拍！**”。这是为了制造停留。

【输出铁律】
1. **策略结构**：
   - 每个策略包含 \`depthAnalysis\`（深度大白话解析）和可选的 \`scriptOptimization\`（具体的**话术优化**）。
2. **话术优化**：
   - 这里的文字颜色会不一样，专门用来给主播念的。必须口语化，不要书面语。

【输出接口定义】
interface AnalysisResponse {
  oneLineSummary: string; // 一针见血的总结
  radarData: { subject: string; A: number; fullMark: 100 }[]; 
  highlights?: { title: string; content: string }[]; // 亮点，数据好才给
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
  userQuestionAnalysis?: { // 针对用户备注的痛点解答
     title: string; // e.g. "关于你提到的'留人难'问题"
     content: string; // 具体步骤
  }[];
  strategy: {
    title: string; 
    type: 'traffic' | 'operation' | 'content'; // 必须分类
    steps: {
        depthAnalysis: string; // 融合动作与原理的大白话教学
        scriptOptimization?: string; // 话术优化（可选）
    }[]; 
  }[];
}
`;

export const analyzeStream = async (
  data: StreamData, 
  knowledgeBase: KnowledgeItem[]
): Promise<AnalysisResult> => {
  
  if (!apiKey || !ai) {
    throw new Error("API Key 未配置。请在 Vercel 环境变量中添加 'API_KEY'。");
  }

  // 0. 数据预检
  if ((data.gmv || 0) === 0 && (data.totalViews || 0) === 0) {
    return {
        oneLineSummary: "数据为空，无法进行深度诊断。",
        radarData: [
            { subject: '曝光进入', A: 0, fullMark: 100 },
            { subject: '停留留存', A: 0, fullMark: 100 },
            { subject: '互动热度', A: 0, fullMark: 100 },
            { subject: 'GPM变现', A: 0, fullMark: 100 },
            { subject: '话术密度', A: 0, fullMark: 100 }
        ],
        diagnosis: [{
            title: "等待数据录入",
            content: "请录入您的直播数据，AI 将为您提供大师级诊断。",
            severity: 'low'
        }],
        humanFactorAnalysis: {
            rhythmScore: 0,
            toneAnalysis: "等待分析...",
            suggestion: "请录入数据。"
        },
        strategy: [{
            title: "起步建议",
            type: "content",
            steps: [{ depthAnalysis: "准备好脚本，调整心态，开始录入数据。" }]
        }]
    };
  }

  const activeStrategies = knowledgeBase
    .filter(k => k.isActive)
    .map(k => `${k.content}`)
    .join('\n');

  // Low CTR Trigger Logic
  let ctrInstruction = "";
  if (data.ctr !== undefined && data.ctr < 5) { 
    ctrInstruction = `
    【严重警告：CTR过低触发器】
    检测到 CTR (点击率) 仅为 ${data.ctr}%，属于偏低水平。
    你 **必须** 在 [strategy] 中增加一条类型为 'operation' (运营) 的策略，标题为“强制提升商点曝光”。
    内容必须包含以下两个动作：
    1. **高频弹窗**：明确告诉运营，每隔几分钟（如2-3分钟）必须重新弹窗一次，因为新进来的观众看不到之前的弹窗。
    2. **引导点击动作**：要求主播口播引导观众去点击右下角的商品讲解卡。
    `;
  }

  const prompt = `
    我是直播运营学员，这是我的一场直播数据。
    
    【核心数据看板】
    - 场观(UV): ${data.totalViews} | 在线峰值(PCU): ${data.maxConcurrent}
    - 成交额(GMV): ${data.gmv}
    - 平均停留: ${data.retentionRate}秒
    - GPM: ${data.gpm}
    - 商品点击率 (CTR): ${data.ctr}% 
    - 互动率: ${data.interactionRate}%
    - 点击转化率 (CVR): ${data.clickConversionRate || '未提供'}%
    
    【关键上下文 (Context)】
    1. **真实话术片段**: "${data.transcriptSnippet}"
    2. **运营自我诊断/备注 (用户疑问)**: "${data.notes}"

    【策略库参考】
    ${activeStrategies}

    【任务指令】
    1. **亮点挖掘**：检查是否有优秀数据。
    2. **针对性策略优化 (Strategy)**：
       - **重点**：请仔细阅读用户的"运营自我诊断/备注"。针对具体问题生成 \`userQuestionAnalysis\`。
       - **全方位优化**：不要只改话术。我需要流量层面的建议（怎么接流量）、运营层面的建议（怎么配合主播）以及话术层面的优化。
       - **语气**：像一个真实的导师在教我，严禁称呼我为“兄弟”。
       - **术语替换**：将所有的 "P2P" 替换为 "点对点"。
       - **平播话术**：如果有关于“点对点”的话术建议，务必加上“XX先不要去拍”这句反向指令。
    
    ${ctrInstruction}
    
    输出纯 JSON 格式。
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanText) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("AI 分析失败，请稍后重试。");
  }
};

export const sendChatMessage = async (
  message: string,
  history: ChatMessage[],
  reportContext: AnalysisResult,
  streamData: StreamData
): Promise<string> => {
  if (!apiKey || !ai) return "API Key 配置缺失。";

  // Flatten strategies for context
  const strategyContext = reportContext.strategy
    .map(s => `策略[${s.title}]: ${s.steps.map(step => step.depthAnalysis).join(' | ')}`)
    .join('\n');

  const contextString = `
    【当前复盘环境】
    - 核心诊断结论：${reportContext.oneLineSummary}
    - 关键数据：场观 ${streamData.totalViews}，平均停留 ${streamData.retentionRate}秒，在线峰值 ${streamData.maxConcurrent}人。
    - 用户备注/痛点：${streamData.notes}
    - 刚才生成的优化策略（作为你的观点基础）：
      ${strategyContext}
    
    【你的身份】
    你是**资深直播策略导师**。你说话很直，接地气，不喜欢用专业术语，喜欢用大白话讲道理。
    
    【聊天原则】
    1. **去黑话**：严禁使用"P2P"，一律说“点对点”或“一对一盯着人聊”。
    2. **语气**：不要叫用户“兄弟”，正常称呼。
    3. **针对性**：如果用户问"怎么留人"，结合刚才报告里的策略回答。
    4. **真诚**：强调直播的真诚感，反对套路。

    【用户的问题】
    "${message}"
  `;

  const chatHistory = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  try {
    const prompt = `
      ${contextString}
      
      历史对话：
      ${chatHistory.map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}
      
      请直接回复纯文本内容，不要 Markdown，像真人顾问聊天一样。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "抱歉，请再说一次。";
  } catch (error) {
    console.error("Chat Error", error);
    return "网络连接有点问题，我们稍后再聊。";
  }
};

// --- SCRIPT ANALYSIS FUNCTIONS ---

const SCRIPT_SYSTEM_INSTRUCTION = `
你是一位**实战派直播话术与心理学专家**。

【底层思维：深度心理博弈 + 极致真诚 + 逻辑闭环】
你的任务是根据用户的阶段（小白/老手）和场景，提供**逻辑严密、理由充分、极具说服力**的优化方案。
请去除过重的个人表演色彩（不要大喊大叫），而是用**娓娓道来**的方式，让观众无法拒绝。

1. **场景化策略 (Contextual Strategy)**：
   - **小白/低在线 (点对点单兵互动)**：
     - **核心逻辑**：基于知识库的“反向抓取”。
     - **强制话术结构**：
       1. **反向指令**：“**XX（用户ID）你先别拍！手停一下！**”（强制制造停留，利用损失厌恶）。
       2. **给理由**：“为什么要拦你？因为......”（给出非常具体、生活化的理由，如“印标歪了”、“包装压皱了”）。
       3. **给方案**：“我不赚你钱，我给你改价/送个东西，当交个朋友”。
     - **禁止**：禁止直接说“喜欢的扣1”，禁止机械化叫卖。

   - **老手/憋单 (Holding)**：
     - 制造紧缺感，但语气要稳，不要歇斯底里。用库存数字的递减来施压。
     - 保持现有逻辑不变。

2. **输出要求**：
   - **steps 结构**：每一步必须包含：
     - **label**: 动作标签
     - **logic**: **【深度思考】** 分析这一步运用了什么心理学原理。
     - **content**: 极其口语化、真诚的逐字稿。
   - 输出纯文本 JSON，严禁 Markdown。

【输出格式 JSON】
interface ScriptAnalysisResult {
  logicDiagnosis: {
    originalFlaw: string; // 逻辑漏洞分析 (客观、理性)
    optimizedLogic: string; // 优化思路 (基于心理学和底层逻辑)
  };
  simulation: {
    scenario: string; 
    trafficContext: string;
    steps: {
      label: string; 
      logic: string; // Why this works (Psychology/Strategy)
      content: string; // Natural, sincere, conversational script
      actionTip?: string; 
    }[];
  };
}
`;

export const analyzeScript = async (
  stage: ScriptStage,
  productName: string,
  scriptContent: string
): Promise<ScriptAnalysisResult> => {
  if (!apiKey || !ai) throw new Error("API Key 缺失");

  const prompt = `
    学员阶段：${stage} (如果是 'newbie'，请严格执行“点对点”反向抓取策略)
    售卖产品：${productName}
    原始话术：
    "${scriptContent}"

    任务：
    1. 诊断问题。指出原始话术中逻辑不通、虚假叫卖或缺乏真诚感的地方。
    2. 模拟实战 (Simulation)。
       - 语气要求：**真诚、真实、理由充分**。
       - **小白/点对点模式**必须包含：“XX先不要去拍”。
       - 每一句话都要基于底层数据库的逻辑进行思考。
    3. 输出纯 JSON。
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SCRIPT_SYSTEM_INSTRUCTION,
        temperature: 0.5,
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText) as ScriptAnalysisResult;
  } catch (error) {
    console.error("Script Analysis Error:", error);
    throw new Error("话术模拟生成失败，请重试。");
  }
};

export const refineScript = async (
  originalResult: ScriptAnalysisResult,
  userInstruction: string
): Promise<ScriptAnalysisResult> => {
  if (!apiKey || !ai) throw new Error("API Key 缺失");

  const prompt = `
    当前生成的话术结果：${JSON.stringify(originalResult)}
    
    用户的修改指令（AI Agent）："${userInstruction}"
    
    请根据指令优化 simulation 部分。
    核心原则：
    - 保持真诚、真实的基调。
    - 理由要充分。
    - 小白模式保持“XX先不要拍”的逻辑。
    - 严禁 Markdown。
    - 保持 JSON 格式。
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SCRIPT_SYSTEM_INSTRUCTION,
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText) as ScriptAnalysisResult;
  } catch (error) {
    console.error("Refine Script Error:", error);
    throw new Error("AI 修改话术失败");
  }
};

// --- TREND ANALYSIS ---
export const analyzeTrend = async (data: TrendData[]): Promise<TrendAnalysisResult> => {
  if (!apiKey || !ai) throw new Error("API Key 缺失");

  const prompt = `
    请对以下近 ${data.length} 天的直播数据进行深度趋势诊断：
    ${JSON.stringify(data)}
    
    【核心原则】
    - 默认基于“纯自然流”起号逻辑。
    - 检查是否有“数据递增”趋势（5分钟赛马机制的宏观体现）。
    - 综合判断流速与成交的关系。
    
    任务：
    1. **深度思考逻辑** (Pros & Cons)。
    2. **排版美学**：严禁 Markdown，用空格/换行分层。
    
    输出 JSON:
    {
      "analysis": "...",
      "suggestion": "..."
    }
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const text = response.text || "{}";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText) as TrendAnalysisResult;
  } catch (error) {
    console.error("Trend Analysis Error:", error);
    return {
        analysis: "AI 分析服务暂时繁忙，请检查网络。",
        suggestion: "建议关注核心指标波动。"
    };
  }
}

// --- IMAGE RECOGNITION (OCR) FUNCTIONS ---

export const recognizeStreamData = async (imageFile: File): Promise<Partial<StreamData>> => {
    if (!apiKey || !ai) throw new Error("API Key 缺失");

    // Use the new compression helper
    const { mimeType, data } = await processImage(imageFile);

    const prompt = `
      请识别这张直播罗盘/数据大屏图片中的关键数据。
      你需要尽可能精准地提取以下字段，如果图片中没有该字段则忽略。
      
      请返回 JSON 格式：
      {
        "maxConcurrent": number, // 最高在线/PCU
        "totalViews": number, // 场观/累积观看人数
        "gmv": number, // 成交金额
        "gpm": number, // 千次成交 (GPM)
        "retentionRate": number, // 平均停留时长 (秒)
        "ctr": number, // 商品点击率 (%)
        "interactionRate": number, // 互动率 (%)
        "entryRate": number, // 进房率 (%)
        "clickConversionRate": number, // 点击转化率 (%)
        "durationMinutes": number // 直播时长 (分钟)
      }
      
      注意：请自动过滤货币符号或单位，只返回数值。
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data } }, // Use processed data
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text || "{}";
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText) as Partial<StreamData>;
    } catch (error) {
        console.error("Stream OCR Error:", error);
        throw new Error("图片识别失败，请确保图片清晰或手动录入。");
    }
};

export const recognizeTrendData = async (imageFile: File): Promise<TrendData[]> => {
    if (!apiKey || !ai) throw new Error("API Key 缺失");

    // Use the new compression helper
    const { mimeType, data } = await processImage(imageFile);

    const prompt = `
      请识别这张包含多天/多场直播数据的表格或趋势图截图。
      请提取每一行/每一天的数据，并返回一个数组。
      
      JSON 格式要求：
      [
        {
           "date": string, // 日期 (例如 "10/24" 或 "Day 1")
           "gmv": number, // 成交金额
           "totalViews": number, // 场观
           "gpm": number, // GPM
           "maxConcurrent": number // PCU
        },
        ...
      ]

      注意：如果无法精确识别日期，可以用 "Day 1", "Day 2" 代替。只提取最近的 7 条以内的数据。
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data } }, // Use processed data
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text || "[]";
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanText);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Trend OCR Error:", error);
        throw new Error("趋势图识别失败，请手动录入。");
    }
};
