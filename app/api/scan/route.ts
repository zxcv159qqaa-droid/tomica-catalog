import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
const MAX_RETRIES = 2;

const PROMPT = `你是 Tomica 小汽車專家。請辨識這張圖片中的 Tomica 小汽車。

請回傳以下 JSON 格式（不要加 markdown 標記）：
{
  "series": "<regular/premium/unlimited/dream/other>",
  "number": <Tomica 編號，數字>,
  "name": "<車款名稱，日文，照包裝上的完整名稱>",
  "variant": "<版本描述，例如：初回特別仕様（金色）或 通常版（紅色）>",
  "confidence": "<high/medium/low>"
}

如果無法辨識，回傳：
{
  "number": null,
  "name": null,
  "variant": null,
  "confidence": "none"
}

重要提示：
- 先判斷系列：紅白盒、左邊大「トミカ」紅標是 regular（常規）；黑盒「tomica premium」是 premium；「tomica unlimited」（金色∞標誌）是 unlimited；「ドリームトミカ」是 dream；其他系列填 other
- 各系列編號各自獨立，number 填該系列的編號（例如 unlimited 的 04 就填 4）
- 注意包裝盒上的編號
- 注意車身顏色來判斷是初回特別仕様還是通常版
- 如果能看到包裝，優先從包裝文字辨識`;

async function tryGenerate(
  genAI: GoogleGenerativeAI,
  modelName: string,
  mimeType: string,
  imageBase64: string
) {
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent([
    PROMPT,
    { inlineData: { mimeType, data: imageBase64 } },
  ]);
  return result.response.text().trim();
}

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType, apiKey: clientKey } = await req.json();

  const apiKey = clientKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: '未設定 Gemini API Key' },
      { status: 400 }
    );
  }

  if (!imageBase64 || !mimeType) {
    return NextResponse.json(
      { success: false, error: '缺少圖片資料' },
      { status: 400 }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = '';

  for (const modelName of MODELS) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const text = await tryGenerate(genAI, modelName, mimeType, imageBase64);
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const parsed = JSON.parse(jsonStr);

        if (parsed.number === null || parsed.confidence === 'none') {
          return NextResponse.json({
            success: false,
            raw_response: text,
            error: '無法辨識此 Tomica 車款，請嘗試拍攝包裝盒正面',
          });
        }

        return NextResponse.json({
          success: true,
          series: parsed.series || 'other',
          number: parsed.number,
          name: parsed.name,
          variant: parsed.variant,
          confidence: parsed.confidence,
          raw_response: text,
        });
      } catch (e) {
        lastError = e instanceof Error ? e.message : '辨識過程發生錯誤';
        const isRetryable =
          lastError.includes('503') ||
          lastError.includes('429') ||
          lastError.includes('overloaded') ||
          lastError.includes('Unavailable');

        if (isRetryable && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        const isModelGone =
          lastError.includes('404') ||
          lastError.includes('not found') ||
          lastError.includes('no longer available');

        if (isModelGone || (isRetryable && attempt >= MAX_RETRIES)) {
          break;
        }

        return NextResponse.json({ success: false, error: lastError });
      }
    }
  }

  return NextResponse.json({
    success: false,
    error: `所有模型都暫時無法使用，請稍後再試。(${lastError})`,
  });
}
