
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { StreamData, KnowledgeItem, AnalysisResult, ChatMessage, ScriptStage, ScriptAnalysisResult, TrendData, TrendAnalysisResult, ScriptState } from "../types";

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
// V1.6 终极优化方案：1024px / 0.6
const processImage = async (file: File): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    // 60秒超时
    const timeoutId = setTimeout(() => reject(new Error("图片处理超时 (60s)，请检查手机性能或尝试截图上传")), 60000);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        clearTimeout(timeoutId);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // V1.6: 锁定 1024px
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
        if (!ctx) {
           reject(new Error("浏览器不支持图像处理"));
           return;
        }
        
        // 绘制优化
        ctx.fillStyle = '#FFFFFF'; // 填充白底
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // 导出配置：JPEG, 0.6 质量
        const dataURL = canvas.toDataURL('image/jpeg', 0.6);
        const base64 = dataURL.split(',')[1];
        
        resolve({ mimeType: 'image/jpeg', data: base64 });
      };
      
      img.onerror = (e) => {
          clearTimeout(timeoutId);
          reject(new Error("图片文件损坏或格式不支持"));
      };

      img.src = event.target?.result as string;
    };
    reader.onerror = (error) => {
        clearTimeout(timeoutId);
        reject(new Error("文件读取失败"));
    };
    reader.readAsDataURL(file);
  });
};

const SYSTEM_INSTRUCTION = `
你是一位**实战派直播运营导师**，拥有千万级GMV的实战经验，版本号 V1.6。
你的风格：**极其接地气、一针见血、逻辑严密、洞察人性**。

【核心原则 V1.6 - 严格执行】

1.  **🚫 负面清单 (严禁出现)**：
    - **严禁使用任何形式的点名欢迎**，例如：“欢迎XX”、“XX在吗”、“XX你好”。
    - **严禁机械式问候**。
    - **严禁使用 "P2P"**，必须统称为 “点对点”。
    - **严禁使用“兄弟”、“老大哥”**，统称“同学”或“大家”。

2.  **✅ 深度思考模型 (Deep Thinking)**：
    - 针对用户的痛点（User Questions），不能只给表面回答。
    - 必须按照 **[深度思考 (原因)] -> [反直觉策略 (打法)] -> [具体动作 (话术)]** 的逻辑拆解。
    - **低流速激活逻辑**：当流量低时，不要试图“拉”人，而是要“拦”人。使用反向指令：“**XX你先不要去拍！**”。

3.  **全维度策略优化**：
    - **流量 (Traffic)**：如何利用停留时长去撬动推流？（赛马机制）
    - **运营 (Operation)**：弹窗节奏、发福袋时机。
    - **内容 (Content)**：话术的真诚度、理由的充分性。

【输出接口定义】
interface AnalysisResponse {
  oneLineSummary: string; // 一针见血的总结
  radarData: { subject: string; A: number; fullMark: 100 }[]; 
  highlights?: { title: string; content: string }[];
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
  userQuestionAnalysis?: { 
     title: string; 
     deepThinking: string; 
     strategy: string; 
     action: string; 
  }[];
  strategy: {
    title: string; 
    type: 'traffic' | 'operation' | 'content'; 
    steps: {
        depthAnalysis: string; // 融合动作与原理的大白话教学
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
    .map(k => `${k.content}`)
    .join('\n');

  // Low CTR Trigger Logic
  let ctrInstruction = "";
  if (data.ctr !== undefined && data.ctr < 5) { 
    ctrInstruction = `
    【严重警告：CTR过低触发器】
    检测到 CTR (点击率) 仅为 ${data.ctr}%。
    你 **必须** 在 [strategy] 中增加一条运营策略，强调“强制提升商点曝光”。
    `;
  }

  const prompt = `
    我是直播运营学员，这是我的一场直播数据。
    【核心数据】：场观 ${data.totalViews}, 在线峰值 ${data.maxConcurrent}, GMV ${data.gmv}, GPM ${data.gpm}, CTR ${data.ctr}%, 停留 ${data.retentionRate}秒。
    【关键上下文】：话术片段: "${data.transcriptSnippet}", 用户备注: "${data.notes}"

    【知识库参考】
    ${activeStrategies}

    【任务指令 V1.6】
    1. **深度痛点粉碎**：请针对用户备注进行 Deep Thinking 拆解。
    2. **话术优化**：严禁出现“欢迎XX”。如果是低流速，必须使用“**XX你先别拍**”的反向逻辑。
    
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

  const strategyContext = reportContext.strategy
    .map(s => `策略[${s.title}]: ${s.steps.map(step => step.depthAnalysis).join(' | ')}`)
    .join('\n');

  const contextString = `
    【当前复盘环境 - 凡哥AI】
    - 核心诊断结论：${reportContext.oneLineSummary}
    - 关键数据：场观 ${streamData.totalViews}，平均停留 ${streamData.retentionRate}秒。
    - 用户备注/痛点：${streamData.notes}
    - 策略基础：${strategyContext}
    
    【你的身份 V1.6】
    你是**资深直播策略导师**。
    
    【聊天原则 - 绝对红线】
    1. **严禁**使用"欢迎XX"、"XX在吗"、"你好XX"等点名格式。
    2. **严禁**使用"P2P"。
    3. **必须**基于"Velocity vs Conversion"（流速vs转化）逻辑回答。

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
      请直接回复纯文本内容，不要 Markdown。
    `;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text || "抱歉，请再说一次。";
  } catch (error) {
    console.error("Chat Error", error);
    return "网络连接有点问题，我们稍后再聊。";
  }
};

const SCRIPT_SYSTEM_INSTRUCTION = `
你是一位**实战派直播话术专家 (V1.7 深度版)**。你的目标是生成**极具煽动性、逻辑严密、细节丰富**的直播脚本。

【核心任务】
针对用户提供的【产品档案】，生成一套**1:1复刻“极致平播成交模型”**的实战脚本。
**严禁生成空洞的套话！** 每一句台词都必须结合具体的产品卖点、价格和痛点。

【必须严格执行的 4 步法闭环 (The 4-Step Loop)】

1.  **Step 1: 拉新/破冰 (Acquisition) - 必须“反向抓取”**
    - **核心逻辑**：当流速低时，不要叫卖，要“拦人”。
    - **强制话术**：“**XX（模拟点名），你先别拍！听我说完再决定**，我不能让你盲目消费。”
    - **结合输入**：必须引用【对标渠道/价格】建立高价锚点，然后给出【我的价格/机制】作为惊喜，并解释为什么便宜（为了口碑/冲榜）。

2.  **Step 2: 塑品/价值 (Value) - 必须“五感描述”**
    - **核心逻辑**：不仅仅说好，要说“怎么好”。使用“不是...而是...”句式拉踩。
    - **结合输入**：将【核心卖点/痛点】转化为具体的使用场景。例如：提到“充绒量”时，要描述“穿在身上像裹着云朵一样暖和”。
    - **话术特征**：“天花板级别的品质”、“用过就回不去”。

3.  **Step 3: 保障/信任 (Assurance) - 必须“底气十足”**
    - **强制原话1**：“**同等价格对比品质，同等品质对比价格。**”
    - **强制原话2**：“**收到货不满意，你不用退回来，我一分钱不要！**” (结合【售后保障】进行承诺)
    - **强制原话3**：“**我干直播就一句话，赚该赚的钱，睡安稳的觉。**”

4.  **Step 4: 逼单/收割 (Closing) - 必须“数据施压”**
    - **核心逻辑**：给观众一个现在下单的理由（亏本冲量）。
    - **强制话术**：“下方小黄车1号链接...**我现在直播间人少，宁可不赚钱甚至亏本，也要把好产品推出去拉数据。**...**最后3单，手慢无。**”

【输出格式 JSON】
interface ScriptAnalysisResult {
  logicDiagnosis: { originalFlaw: string; optimizedLogic: string; };
  simulation: {
    scenario: string; 
    trafficContext: string;
    steps: {
      label: string; // 必须严格为 "拉新/破冰", "塑品/价值", "保障/信任", "逼单/收割"
      logic: string; 
      content: string; 
      actionTip?: string; 
    }[];
  };
}
`;

export const analyzeScript = async (
  stage: ScriptStage,
  inputs: Omit<ScriptState, 'result' | 'stage'>
): Promise<ScriptAnalysisResult> => {
  if (!apiKey || !ai) throw new Error("API Key 缺失");

  const prompt = `
    学员阶段：${stage}
    【产品档案】
    产品名称：${inputs.productName}
    对标渠道/价格：${inputs.benchmark}
    我的价格/机制：${inputs.priceMechanism}
    核心卖点/痛点：${inputs.sellingPoints}
    售后保障：${inputs.guarantee}

    任务：
    1. 分析该产品的售卖逻辑。
    2. **强制生成实战模拟**：如果是 'newbie'，必须严格复刻 SCRIPT_SYSTEM_INSTRUCTION 中的 **极致平播成交模型 (4步法)**，必须将上述产品信息融入到话术中，必须包含所有强制原话。
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

export const refineScript = async (originalResult: ScriptAnalysisResult, userInstruction: string): Promise<ScriptAnalysisResult> => {
  if (!apiKey || !ai) throw new Error("API Key 缺失");
  const prompt = `当前生成的话术：${JSON.stringify(originalResult)}。用户指令："${userInstruction}"。请优化 simulation，保持 4 步法闭环不变。输出 JSON。`;
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { systemInstruction: SCRIPT_SYSTEM_INSTRUCTION, temperature: 0.7, responseMimeType: "application/json" }
    });
    const text = response.text || "{}";
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()) as ScriptAnalysisResult;
  } catch (error) {
    throw new Error("AI 修改话术失败");
  }
};
// ... analyzeTrend & recognizeStreamData & recognizeTrendData remain same
export const analyzeTrend = async (data: TrendData[]): Promise<TrendAnalysisResult> => {
    if (!apiKey || !ai) throw new Error("API Key 缺失");
    const prompt = `请对以下近 ${data.length} 天的直播数据进行深度趋势诊断：${JSON.stringify(data)} 输出 JSON: { "analysis": "...", "suggestion": "..." }`;
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json" } });
      const text = response.text || "{}";
      return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()) as TrendAnalysisResult;
    } catch (error) {
      return { analysis: "AI 分析服务暂时繁忙。", suggestion: "建议关注核心指标波动。" };
    }
}
export const recognizeStreamData = async (imageFile: File): Promise<Partial<StreamData>> => {
    if (!apiKey || !ai) throw new Error("API Key 缺失");
    try {
        const { mimeType, data } = await processImage(imageFile);
        const prompt = `请识别直播数据截图。返回 JSON: { "maxConcurrent": number, "totalViews": number, "gmv": number, "gpm": number, "retentionRate": number, "ctr": number, "interactionRate": number, "entryRate": number, "clickConversionRate": number, "durationMinutes": number }`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [{ inlineData: { mimeType, data } }, { text: prompt }] }, config: { responseMimeType: "application/json" } });
        const text = response.text || "{}";
        const result = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()) as Partial<StreamData>;
        const hasValue = Object.values(result).some(v => v !== undefined && v !== null);
        if (!hasValue) throw new Error("未能识别到有效数字");
        return result;
    } catch (error: any) {
        const errStr = error.message || error.toString();
        if (errStr.includes("图片处理超时")) throw new Error(errStr);
        if (errStr.includes("User location")) throw new Error("API 区域限制错误。");
        if (errStr.includes("400")) throw new Error("上传失败：图片可能过大。");
        throw new Error(`AI 视觉服务连接失败: ${errStr.slice(0, 50)}...`);
    }
};
export const recognizeTrendData = async (imageFile: File): Promise<TrendData[]> => {
    if (!apiKey || !ai) throw new Error("API Key 缺失");
    try {
        const { mimeType, data } = await processImage(imageFile);
        const prompt = `识别趋势图表格。返回 JSON Array: [{ "date": string, "gmv": number, "totalViews": number, "gpm": number, "maxConcurrent": number }]`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [{ inlineData: { mimeType, data } }, { text: prompt }] }, config: { responseMimeType: "application/json" } });
        const text = response.text || "[]";
        const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        throw new Error("趋势图识别失败，请确保图片清晰或手动录入。");
    }
};
