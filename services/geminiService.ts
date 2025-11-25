
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
const processImage = async (file: File): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error("图片处理超时 (60s)")), 60000);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        clearTimeout(timeoutId);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIMENSION = 1024;
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
        if (!ctx) { reject(new Error("Canvas error")); return; }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataURL = canvas.toDataURL('image/jpeg', 0.6);
        resolve({ mimeType: 'image/jpeg', data: dataURL.split(',')[1] });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const SYSTEM_INSTRUCTION = `
你是一位**实战派直播运营导师（凡哥）**，拥有千万级GMV的实战经验，版本号 V1.7。
你的风格：**极其接地气、一针见血、逻辑严密、洞察人性、不说废话**。

【绝对红线 - 负面清单 (严禁出现)】
1. **严禁**使用“欢迎xx”、“xx你好”、“亲爱的”等客服式开头。
2. **严禁**使用“提升互动”、“优化话术”这种正确的废话。必须说具体怎么改。
3. **严禁**机械式复述数据。
4. **严禁**客套。上来直接分析问题。

【核心方法论：深度思考 (Deep Thinking)】
你在分析任何问题时，必须遵守以下逻辑链条，不能停留在表面：
1. **现象 (Phenomenon)**: 数据跌了/没人说话。
2. **底层逻辑 (The Why)**: 必须解释背后的**算法机制** (如: ECPM = 出价*CTR*CVR) 或 **人性弱点** (如: 损失厌恶、从众心理、贪婪)。
   - *错误示范*: 流量不行是因为你没互动。
   - *正确示范*: 流量断崖是因为你在03:00处不仅没有释放福利钩子，反而进行了枯燥的参数讲解，导致互动密度低于同层级竞争对手，系统判定你的直播间留不住人，触发了推流熔断。
3. **反直觉策略 (Counter-Intuitive Strategy)**: 
   - 越想卖，越不要卖。
   - 越没人，越要赶人。
   - *示例*: 不要请求观众点关注，要说“今天的福利只有粉丝能拍，没点关注的抢不到别怪我”。
4. **具体动作 (Actionable Steps)**: 必须有画面感。如“拿起手机给镜头看时间”、“假装跟场控吵架”。

【输出接口定义】
interface AnalysisResponse {
  oneLineSummary: string; // 一针见血的总结 (狠辣)
  radarData: { subject: string; A: number; fullMark: 100 }[]; 
  highlights?: { title: string; content: string }[];
  diagnosis: {
    title: string; 
    content: string; // 必须包含 Deep Thinking (算法+人性)
    severity: 'high' | 'medium' | 'low';
  }[];
  humanFactorAnalysis: {
    rhythmScore: number; 
    toneAnalysis: string; 
    suggestion: string; 
  };
  // V1.7 核心: 深度痛点粉碎 (必须详细)
  userQuestionAnalysis?: { 
     title: string; // 用户的痛点或问题
     deepThinking: string; // 【深度思考】包含算法逻辑与人性心理分析，不少于50字，必须深刻。
     strategy: string; // 【策略】具体的反直觉打法。
     action: string; // 【动作】Step 1, Step 2, Step 3 (非常具体的操作指令)。
  }[];
  strategy: {
    title: string; 
    type: 'traffic' | 'operation' | 'content'; 
    steps: {
        depthAnalysis: string; // 融合动作与原理的大白话教学，必须解释 Why
        scriptOptimization?: string; // 话术优化（必须包含“XX先不要拍”的反向逻辑）
    }[]; 
  }[];
}
`;

export const analyzeStream = async (
  data: StreamData, 
  knowledgeBase: KnowledgeItem[]
): Promise<AnalysisResult> => {
  
  if (!apiKey || !ai) throw new Error("API Key 未配置。");

  // 0. 数据预检
  if ((data.gmv || 0) === 0 && (data.totalViews || 0) === 0) {
    return {
        oneLineSummary: "数据为空，无法进行深度诊断。",
        radarData: [],
        diagnosis: [],
        humanFactorAnalysis: { rhythmScore: 0, toneAnalysis: "", suggestion: "" },
        strategy: []
    };
  }

  const activeStrategies = knowledgeBase
    .filter(k => k.isActive)
    .map(k => `策略[${k.title}]: ${k.content}`)
    .join('\n');

  const prompt = `
    【凡哥 V1.7 深度复盘指令】
    
    我是直播运营学员，这是我的一场直播数据，请用你的“深度思考模型”帮我粉碎痛点。
    
    【核心数据】
    - 场观: ${data.totalViews} | 在线峰值: ${data.maxConcurrent}
    - GMV: ${data.gmv} | GPM: ${data.gpm}
    - CTR: ${data.ctr}% | 停留: ${data.retentionRate}秒
    
    【关键上下文】
    1. 话术片段: "${data.transcriptSnippet}"
    2. **用户痛点/备注**: "${data.notes}" (请重点对这里进行 Deep Thinking 拆解，不要放过任何细节)

    【必须遵守的数据库底层规则】
    ${activeStrategies}

    【任务要求】
    1. **一针见血**: oneLineSummary 必须狠，直接指出是“人”的问题还是“货”的问题。
    2. **深度痛点粉碎 (userQuestionAnalysis)**: 
       - 针对用户的备注，必须给出 2-3 个维度的深度拆解。
       - 解释为什么会发生这种情况？是赛马机制输了？还是标签乱了？
    3. **策略生成**: 
       - 如果 CTR < 5%，必须在策略中包含“重做商点图”或“憋单强开”的指令。
       - 如果 停留 < 40秒，必须在策略中包含“反向抓取”话术。
    4. **Tone**: 严禁客套，像个严厉的教练。
    
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

  const strategyContext = reportContext.strategy
    .map(s => `策略[${s.title}]: ${s.steps.map(step => step.depthAnalysis).join(' | ')}`)
    .join('\n');

  const contextString = `
    【当前复盘环境 - 凡哥AI】
    - 核心诊断结论：${reportContext.oneLineSummary}
    - 关键数据：场观 ${streamData.totalViews}，平均停留 ${streamData.retentionRate}秒。
    - 用户备注/痛点：${streamData.notes}
    - 策略基础：${strategyContext}
    
    【你的身份】
    你是**凡哥**，资深直播策略导师。
    
    【对话原则 - 绝对红线】
    1. **严禁**使用"欢迎"、"你好"、"亲"等字眼。
    2. **严禁**车轱辘话。直接给答案。
    3. **Deep Thinking**: 
       - 用户问“怎么留人”，你要告诉他“留人的本质是制造未完成感”。
       - 用户问“怎么成交”，你要告诉他“成交的本质是信任倒置”。
    4. **反常识**: 多用“不要...要...”、“听我一句劝”的句式。

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
      
      请直接回复纯文本内容，不要 Markdown，像真人语音转文字一样自然。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "这个问题有点深，你再具体说说？";
  } catch (error) {
    console.error("Chat Error", error);
    return "网络连接抖动，稍等。";
  }
};

const SCRIPT_SYSTEM_INSTRUCTION = `
你是一位**实战派直播话术与心理学专家** (凡哥AI V1.7)。

【核心任务：构建完整的成交逻辑闭环】
你不仅要生成话术，还要解释**每一句话背后的心理学原理**。

【4步闭环框架】
1.  **拉新/破冰**: 利用损失厌恶(Loss Aversion)，强制制造停留。
2.  **塑品/价值**: 痛点(Pain) + 卖点(Gain) + 场景(Context)。
3.  **保障/信任**: 风险逆转(Risk Reversal)。
4.  **逼单/收割**: 稀缺性(Scarcity) + 紧迫感(Urgency)。

【输出格式 JSON】
interface ScriptAnalysisResult {
  logicDiagnosis: {
    originalFlaw: string; // 深度诊断：原始话术哪里没做好？
    optimizedLogic: string; // 优化思路：为什么要这么改？
  };
  simulation: {
    scenario: string; 
    trafficContext: string;
    steps: {
      label: string; 
      logic: string; // 【Deep Thinking】必须解释这句话是为了触发用户的什么心理？
      content: string; // 具体话术
      actionTip?: string; // 主播动作
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

  let modeInstruction = "";
  if (stage === 'newbie') {
      modeInstruction = `
      【当前模式：新手/平播】
      - **核心逻辑**：信任大于流量。
      - **拉新**：使用“反向指令” -> “XX你先不要拍，听我讲完”。
      - **逼单**：严禁倒计时，要用“改价”、“送运费险”等温和手段。
      `;
  } else {
      modeInstruction = `
      【当前模式：老手/憋单】
      - **核心逻辑**：流量大于信任。
      - **拉新**：极度夸张的悬念。“今天这个机制，我只讲一遍”。
      - **逼单**：高压倒计时。“3、2、1，上车！锁库存！”。
      `;
  }

  const prompt = `
    学员阶段：${stage}
    售卖产品：${productName}
    原始话术："${scriptContent}"

    ${modeInstruction}

    任务：
    1. 诊断原始话术。
    2. **强制生成实战模拟**：必须包含 4 个步骤。
    3. **Logic 字段必须填写**：解释每句话的心理学原理。
    4. 输出纯 JSON。
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
    用户的修改指令："${userInstruction}"
    
    请优化 simulation 部分。
    **核心约束**：必须保持 4 步法闭环结构。
    **Tone**: 凡哥风格，犀利、直接。
    输出纯 JSON。
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

export const analyzeTrend = async (data: TrendData[]): Promise<TrendAnalysisResult> => {
    if (!apiKey || !ai) throw new Error("API Key 缺失");
  
    const prompt = `
      请对以下近 ${data.length} 天的直播数据进行深度趋势诊断：${JSON.stringify(data)}
      要求：
      1. 寻找拐点。
      2. 解释数据波动背后的逻辑 (如：GMV涨了但GPM跌了，说明流量泛了)。
      输出 JSON: { "analysis": "...", "suggestion": "..." }
    `;
  
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const text = response.text || "{}";
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText) as TrendAnalysisResult;
    } catch (error) {
      return { analysis: "AI 分析服务暂时繁忙。", suggestion: "建议关注核心指标波动。" };
    }
  }

export const recognizeStreamData = async (imageFile: File): Promise<Partial<StreamData>> => {
    if (!apiKey || !ai) throw new Error("API Key 缺失");

    try {
        const { mimeType, data } = await processImage(imageFile);

        const prompt = `
          请识别这张直播数据大屏或罗盘截图。返回 JSON:
          {
            "maxConcurrent": number, "totalViews": number, "gmv": number, "gpm": number, 
            "retentionRate": number, "ctr": number, "interactionRate": number, 
            "entryRate": number, "clickConversionRate": number, "durationMinutes": number
          }
          只返回数值。
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { mimeType, data } }, { text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        const text = response.text || "{}";
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanText) as Partial<StreamData>;
        
        const hasValue = Object.values(result).some(v => v !== undefined && v !== null);
        if (!hasValue) throw new Error("未能识别到有效数字");
        
        return result;

    } catch (error: any) {
        console.error("Stream OCR Error Detail:", error);
        const errStr = error.message || error.toString();
        
        if (errStr.includes("图片处理超时")) throw new Error(errStr);
        if (errStr.includes("400")) throw new Error("上传失败：图片处理异常，请重试。");
        
        throw new Error(`AI 视觉服务连接失败: ${errStr.slice(0, 50)}...`);
    }
};

export const recognizeTrendData = async (imageFile: File): Promise<TrendData[]> => {
    if (!apiKey || !ai) throw new Error("API Key 缺失");

    try {
        const { mimeType, data } = await processImage(imageFile);
        const prompt = `识别趋势图表格。返回 JSON Array: [{ "date": string, "gmv": number, "totalViews": number, "gpm": number, "maxConcurrent": number }]`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { mimeType, data } }, { text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        const text = response.text || "[]";
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanText);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Trend OCR Error:", error);
        throw new Error("趋势图识别失败");
    }
};
