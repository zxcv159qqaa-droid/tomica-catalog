import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `你是 Tomica 小汽車專家。請辨識這張圖片中的 Tomica 小汽車。

請回傳以下 JSON 格式（不要加 markdown 標記）：
{
  "number": <Tomica 編號，數字>,
  "name": "<車款名稱，日文>",
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
- 注意包裝盒上的編號（左上角的數字）
- 注意車身顏色來判斷是初回特別仕様還是通常版
- 如果能看到包裝，優先從包裝文字辨識`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
    ]);

    const text = result.response.text().trim();
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
      number: parsed.number,
      name: parsed.name,
      variant: parsed.variant,
      confidence: parsed.confidence,
      raw_response: text,
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : '辨識過程發生錯誤',
    });
  }
}
