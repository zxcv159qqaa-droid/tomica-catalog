import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
];
const MAX_RETRIES = 2;

const PROMPT = `你是 Tomica 小汽車專家。請辨識這張圖片中的 Tomica 小汽車。

請回傳以下 JSON 格式（不要加 markdown 標記）：
{
  "series": "<regular/premium/unlimited/dream/disney/asia/event/other>",
  "code": "<包裝上的編號文字原樣，例如 46、04、151、SP、RD-01、DM-13、AO-03>",
  "number": <編號中的數字部分，沒有數字（例如 SP）就填 null>,
  "name": "<包裝上的日文名稱（片假名／漢字那行），不要用英文那行>",
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
- 先判斷系列：
  - 紅白盒、左邊大「トミカ」紅標、只有數字編號 → regular（常規）
  - 黑盒「tomica premium」→ premium；「tomica unlimited」（金色∞標誌）→ unlimited
  - 盒上有「ドリームトミカ」或「Dream TOMICA」車輪標誌 → dream（編號如 151、SP、RD-01）
  - 盒上有「DISNEY MOTORS / ディズニーモータース」且編號是 DM-xx → disney
  - 盒上有「Asia Original」且編號是 AO-xx（或 A0-xx）→ asia，code 統一寫成 AO-xx
  - 盒上有圓形「TEM」標誌與「TOMICA EVENT MODEL / トミカイベントモデル」字樣（白底紅框盒，編號如 No.30）→ event（活動限定款，編號自成一套，不要當成 regular）
  - 其他系列填 other
- 各系列編號各自獨立（例如 unlimited 的 04 → code "04"、number 4；DM-13 → code "DM-13"、number 13）
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
  const failures: string[] = [];

  for (const modelName of MODELS) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const text = await tryGenerate(genAI, modelName, mimeType, imageBase64);
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const parsed = JSON.parse(jsonStr);

        if (!parsed.name || parsed.confidence === 'none') {
          return NextResponse.json({
            success: false,
            raw_response: text,
            error: '無法辨識此 Tomica 車款，請嘗試拍攝包裝盒正面',
          });
        }

        return NextResponse.json({
          success: true,
          series: parsed.series || 'other',
          code: parsed.code ? String(parsed.code) : undefined,
          number: typeof parsed.number === 'number' ? parsed.number : 0,
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
          const status = /\[(\d{3})[^\]]*\]/.exec(lastError)?.[1] ?? '?';
          failures.push(`${modelName}: ${status}`);
          break;
        }

        return NextResponse.json({ success: false, error: lastError });
      }
    }
  }

  return NextResponse.json({
    success: false,
    error: `AI 辨識服務暫時忙碌，請稍後再試。(${failures.join(', ')})`,
    detail: lastError,
  });
}
