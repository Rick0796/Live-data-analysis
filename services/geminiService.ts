
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
// V1.6 终极优化方案：
// 1. 最大边长锁定 1024px
// 2. 质量降至 0.6
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
        
        console.log(`[Image Processed V1.6] ${img.width}x${img.height} -> ${width}x${height}, Size: ~${Math.round(base64.length / 1024)}KB`);
        
        resolve({ mimeType: 'image/jpeg', data: base64 });
      };
      
      img.onerror = (e) => {
          clearTimeout(timeoutId);
          console.error("Image load error", e);
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
  // V1.6 New: 深度痛点粉碎
  userQuestionAnalysis?: { 
     title: string; // 用户的问题
     deepThinking: string; // 【深度思考】为什么会出现这个问题？底层算法逻辑是什么？
     strategy: string; // 【策略】反直觉的解决思路（如：不要叫卖，要劝退）
     action: string; // 【动作】具体怎么做，第一步第二步
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
  
  if (!apiKey || !ai) {
    throw new Error("API Key 未配置。");
  }

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
    
    【核心数据】
    - 场观: ${data.totalViews} | 在线峰值: ${data.maxConcurrent}
    - GMV: ${data.gmv} | GPM: ${data.gpm}
    - CTR: ${data.ctr}% | 停留: ${data.retentionRate}秒
    
    【关键上下文】
    1. 话术片段: "${data.transcriptSnippet}"
    2. **用户痛点/备注**: "${data.notes}" (请重点对这里进行 Deep Thinking 拆解)

    【知识库参考】
    ${activeStrategies}

    【任务指令 V1.6】
    1. **深度痛点粉碎 (userQuestionAnalysis)**：请务必填充此字段。
       - 不要只说“要提高互动”。
       - 要说：**Deep Thinking**: 互动低是因为你一直在索取价值... **Strategy**: 采用反向抓取... **Action**: 话术改成...
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

  // Flatten strategies for context
  const strategyContext = reportContext.strategy
    .map(s => `策略[${s.title}]: ${s.steps.map(step => step.depthAnalysis).join(' | ')}`)
    .join('\n');

  const contextString = `
    【当前复盘环境】
    - 核心诊断结论：${reportContext.oneLineSummary}
    - 关键数据：场观 ${streamData.totalViews}，平均停留 ${streamData.retentionRate}秒。
    - 用户备注/痛点：${streamData.notes}
    - 策略基础：${strategyContext}
    
    【你的身份 V1.6】
    你是**资深直播策略导师**。
    
    【聊天原则 - 绝对红线】
    1. **严禁**使用"欢迎XX"、"XX在吗"、"你好XX"等点名格式。这是机器人的特征。
    2. **严禁**使用"P2P"。
    3. **必须**基于"Velocity vs Conversion"（流速vs转化）逻辑回答。
       - 如果用户问留人，告诉他：别硬留，要用理由留。
       - 如果用户问成交，告诉他：别急着卖，先建立信任。

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

const SCRIPT_SYSTEM_INSTRUCTION = `
你是一位**实战派直播话术与心理学专家**，当前版本 V1.6。

【核心任务：构建完整的成交逻辑闭环】
很多主播只会“塑品”（讲产品），但忽略了前后逻辑。你必须强制生成包含以下**4个标准步骤**的完整脚本，缺一不可。
**重要：你需要根据用户的【阶段模式 (Stage)】生成截然不同的风格。**

【4步闭环框架】
1.  **拉新/破冰 (Acquisition)**: 利用损失厌恶，强制制造停留。
2.  **塑品/价值 (Value Building)**: 痛点 + 卖点 + 场景。
3.  **保障/信任 (Assurance & Trust)**: 售后承诺，消除顾虑。
4.  **逼单/收割 (Closing)**: 稀缺性 + 紧迫感。

【输出格式 JSON】
interface ScriptAnalysisResult {
  logicDiagnosis: {
    originalFlaw: string; // 原始话术缺了哪个环节？
    optimizedLogic: string; // 优化思路
  };
  simulation: {
    scenario: string; 
    trafficContext: string;
    steps: {
      label: string; // 必须是 "拉新/破冰", "塑品/价值", "保障/信任", "逼单/收割" 中的一个
      logic: string; // Why this works (Deep Thinking)
      content: string; // 具体话术
      actionTip?: string; // 主播动作 (e.g., 拿起手机，指着屏幕)
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

  // V1.6 Core: Logic Differentiation
  let modeInstruction = "";
  if (stage === 'newbie') {
      modeInstruction = `
      【当前模式：新手/平播 (Flat Broadcast)】
      - **核心逻辑**：真诚建立信任，点对点(P2P)互动。流量很贵，要珍惜每一个进场的人。
      - **拉新策略**：使用“**XX你先不要拍，听我讲完**”的反向指令，而不是叫卖。
      - **塑品策略**：强调性价比的**理由**（为什么这么便宜？是工厂印错标了？是老板清库存？），给足理由观众才敢买。
      - **逼单策略**：**严禁**使用高压倒计时。要用“交个朋友”的温和逼单。
      - **风格**：慢节奏、娓娓道来、真诚、像朋友聊天。
      `;
  } else {
      modeInstruction = `
      【当前模式：老手/憋单 (Holding Strategy)】
      - **核心逻辑**：利用羊群效应，制造稀缺感，拉升流速去撬动推荐流。
      - **拉新策略**：**极度夸张**的悬念。“今天这个价格我只放10单，抢不到别怪我”。
      - **塑品策略**：快速过款，只讲核心痛点，不要啰嗦。
      - **逼单策略**：**高压倒计时**。“3、2、1，上车！”、“踢人”、“锁库存”。
      - **风格**：快节奏、高亢、紧迫感、不等人。
      `;
  }

  const prompt = `
    学员阶段：${stage}
    售卖产品：${productName}
    原始话术："${scriptContent}"

    ${modeInstruction}

    任务：
    1. 诊断原始话术是否缺少了完整的成交闭环。
    2. **强制生成实战模拟**：生成的 steps 数组必须严格包含 4 个步骤 (拉新-塑品-保障-逼单)。
    3. **必须严格遵守上述【当前模式】的风格要求**。如果是新手，绝对不能出现高压逼单；如果是老手，必须要有压迫感。
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
    **核心约束**：必须保持 4 步法闭环结构（拉新-塑品-保障-逼单）不变。
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
        if (errStr.includes("User location")) throw new Error("API 区域限制错误，请检查网络代理。");
        if (errStr.includes("400")) throw new Error("上传失败：图片可能过大，已自动降质重试仍失败，请尝试手动录入。");
        
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
        throw new Error("趋势图识别失败，请确保图片清晰或手动录入。");
    }
};
