/**
 * 使用 DeepSeek API 获取 AI 新闻日报
 *
 * 工作流程：
 *   1. 调用 DeepSeek Chat API，要求联网搜索当日 AI 领域热点
 *   2. 以 JSON 结构化输出，返回分类新闻
 *   3. 输出格式与 aihot API 兼容，可无缝替换
 *
 * 环境变量：
 *   DEEPSEEK_API_KEY - DeepSeek API 密钥
 *   DEEPSEEK_MODEL   - 模型名称（默认 deepseek-chat）
 */

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

/**
 * 构造系统提示词
 */
function buildSystemPrompt(dateStr) {
  return `你是一个专业的 AI 行业新闻编辑。请搜索并整理 ${dateStr} 最新的 AI 领域重要新闻。

要求：
1. 搜索当天（${dateStr}）的 AI 相关新闻，覆盖以下 5 个类别：
   - 模型发布/更新：新模型发布、模型升级、benchmark 结果等
   - 产品发布/更新：AI 产品上线、功能更新、平台动态等
   - 行业动态：融资、收购、合作、政策、市场变化等
   - 论文研究：重要论文发布、研究突破等
   - 技巧/观点：使用技巧、行业评论、趋势分析等

2. 每个类别提供 0-5 条新闻，总共 8-15 条
3. 每条新闻包含：标题（简洁有力）、摘要（50-150字）、来源
4. 优先选择影响力大、传播广的新闻
5. 标题和摘要使用中文

请严格按以下 JSON 格式输出，不要添加任何其他文字：
{
  "date": "${dateStr}",
  "sections": [
    {
      "label": "模型发布/更新",
      "items": [
        {
          "title": "新闻标题",
          "summary": "新闻摘要，50-150字",
          "source": "来源名称"
        }
      ]
    },
    {
      "label": "产品发布/更新",
      "items": []
    },
    {
      "label": "行业动态",
      "items": []
    },
    {
      "label": "论文研究",
      "items": []
    },
    {
      "label": "技巧/观点",
      "items": []
    }
  ]
}`;
}

/**
 * 调用 DeepSeek Chat API
 */
async function callDeepSeek(systemPrompt, userPrompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "缺少 DEEPSEEK_API_KEY 环境变量。请设置后重试：\n" +
      "  export DEEPSEEK_API_KEY=sk-xxx\n" +
      "  获取密钥: https://platform.deepseek.com/api_keys"
    );
  }

  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  const resp = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`DeepSeek API 请求失败: HTTP ${resp.status} - ${errBody}`);
  }

  const result = await resp.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("DeepSeek API 返回了空内容");
  }

  return content;
}

/**
 * 解析 DeepSeek 返回的 JSON，做数据校验
 */
function parseNewsResponse(jsonStr) {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    // 尝试提取 JSON 块（模型可能包裹在 markdown 代码块里）
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      data = JSON.parse(match[1]);
    } else {
      throw new Error("DeepSeek 返回的内容不是有效 JSON");
    }
  }

  // 校验基本结构
  if (!data.sections || !Array.isArray(data.sections)) {
    throw new Error("返回数据缺少 sections 数组");
  }

  // 确保每个 section 有 label 和 items
  for (const section of data.sections) {
    if (!section.label) {
      throw new Error("section 缺少 label 字段");
    }
    if (!Array.isArray(section.items)) {
      section.items = [];
    }
    // 清理每条新闻
    section.items = section.items.map((item) => ({
      title: String(item.title || "").trim(),
      summary: String(item.summary || "").trim(),
      source: String(item.source || "").trim(),
    })).filter((item) => item.title.length > 0);
  }

  return data;
}

/**
 * 获取 AI 新闻日报（DeepSeek 数据源）
 * 返回格式与 aihot API 的 fetchDaily() 兼容
 *
 * @param {string} [date] - 日期 YYYY-MM-DD，不传则使用今天
 * @returns {Promise<object>} 与 aihot API 相同格式的日报数据
 */
export async function fetchDailyFromDeepSeek(date) {
  const now = new Date();
  const dateStr = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const systemPrompt = buildSystemPrompt(dateStr);
  const userPrompt = `请搜索并整理 ${dateStr} 的 AI 领域重要新闻，按要求的 JSON 格式输出。`;

  console.log(`   📡 正在调用 DeepSeek API (模型: ${process.env.DEEPSEEK_MODEL || "deepseek-chat"})...`);

  const rawContent = await callDeepSeek(systemPrompt, userPrompt);
  const data = parseNewsResponse(rawContent);

  // 确保有 date 字段
  data.date = data.date || dateStr;

  const totalItems = data.sections.reduce((sum, s) => sum + s.items.length, 0);
  console.log(`   ✅ DeepSeek 返回 ${totalItems} 条新闻`);

  return data;
}

// 直接运行时进行测试
if (process.argv[1] && process.argv[1].endsWith("fetch-deepseek.js")) {
  const date = process.argv[2];
  console.log(`⏳ 正在通过 DeepSeek 获取${date ? " " + date : "今日"} AI 新闻...`);
  console.log("═".repeat(40));

  try {
    const data = await fetchDailyFromDeepSeek(date);
    console.log(`\n📅 日期: ${data.date}`);
    for (const section of data.sections) {
      console.log(`\n${section.label} (${section.items.length} 条):`);
      for (const item of section.items) {
        console.log(`  • ${item.title}`);
        if (item.summary) console.log(`    ${item.summary.slice(0, 60)}...`);
      }
    }
    console.log("\n✅ 测试完成");
  } catch (err) {
    console.error(`❌ 失败: ${err.message}`);
    process.exit(1);
  }
}
