/**
 * 小红书发布服务
 *
 * 使用 Playwright 操作小红书创作者中心 Web 版
 * 功能：登录（扫码）、发布笔记、保存草稿
 */

import { chromium } from "playwright";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const COOKIE_PATH = resolve(__dirname, "../../config/xhs-cookies.json");
const XHS_CREATOR_URL = "https://creator.xiaohongshu.com";
const XHS_PUBLISH_URL = "https://creator.xiaohongshu.com/publish/publish";

let activeBrowser = null;
let activePage = null;

/**
 * 获取浏览器实例
 */
async function getBrowser() {
  if (activeBrowser && activeBrowser.isConnected()) {
    return activeBrowser;
  }
  activeBrowser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  return activeBrowser;
}

/**
 * 加载已保存的 Cookie
 */
async function loadCookies() {
  try {
    await access(COOKIE_PATH);
    const raw = await readFile(COOKIE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * 保存 Cookie
 */
async function saveCookies(cookies) {
  await mkdir(dirname(COOKIE_PATH), { recursive: true });
  await writeFile(COOKIE_PATH, JSON.stringify(cookies, null, 2), "utf-8");
}

/**
 * 启动登录流程 —— 返回二维码截图（Base64）
 */
export async function startLogin() {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });

  activePage = await context.newPage();

  // 注入反检测脚本
  await activePage.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  await activePage.goto(XHS_CREATOR_URL, { waitUntil: "networkidle", timeout: 30000 });

  // 等待二维码出现
  await activePage.waitForTimeout(3000);

  // 截图二维码区域
  const screenshot = await activePage.screenshot({ type: "png" });
  const base64 = screenshot.toString("base64");

  return {
    qrCode: `data:image/png;base64,${base64}`,
    message: "请使用小红书 App 扫描二维码登录",
  };
}

/**
 * 检查登录状态（扫码后调用）
 */
export async function checkLoginStatus() {
  if (!activePage) {
    return { loggedIn: false, message: "请先启动登录流程" };
  }

  try {
    // 等待页面跳转（登录成功会跳转到创作者中心首页）
    await activePage.waitForTimeout(2000);
    const url = activePage.url();

    // 检查是否已离开登录页
    if (url.includes("/publish") || url.includes("/creator") || !url.includes("/login")) {
      // 登录成功，保存 Cookie
      const context = activePage.context();
      const cookies = await context.cookies();
      await saveCookies(cookies);

      // 截图确认
      const screenshot = await activePage.screenshot({ type: "png" });
      const base64 = screenshot.toString("base64");

      return {
        loggedIn: true,
        message: "登录成功！Cookie 已保存",
        screenshot: `data:image/png;base64,${base64}`,
      };
    }

    // 还在登录页，返回当前截图
    const screenshot = await activePage.screenshot({ type: "png" });
    const base64 = screenshot.toString("base64");

    return {
      loggedIn: false,
      message: "等待扫码...",
      qrCode: `data:image/png;base64,${base64}`,
    };
  } catch (err) {
    return { loggedIn: false, message: `检查状态失败: ${err.message}` };
  }
}

/**
 * 发布笔记到小红书（或保存到草稿）
 *
 * @param {Object} options
 * @param {string[]} options.imagePaths - 图片文件路径数组（服务器本地路径）
 * @param {string} options.title - 笔记标题
 * @param {string} options.content - 笔记正文
 * @param {string[]} options.tags - 话题标签（如 ["AI日报", "人工智能"]）
 * @param {boolean} options.draft - 是否保存为草稿（默认 true）
 */
export async function publishToXHS(options) {
  const { imagePaths, title, content, tags = [], draft = true } = options;

  // 加载 Cookie
  const cookies = await loadCookies();
  if (!cookies || cookies.length === 0) {
    throw new Error("未登录小红书，请先扫码登录");
  }

  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });

  // 注入 Cookie
  await context.addCookies(cookies);

  const page = await context.newPage();

  // 反检测
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  try {
    console.log("   📱 打开小红书创作者中心...");
    await page.goto(XHS_PUBLISH_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    // 检查是否需要重新登录
    if (page.url().includes("/login")) {
      throw new Error("Cookie 已过期，请重新扫码登录");
    }

    // 上传图片
    console.log(`   🖼️ 上传 ${imagePaths.length} 张图片...`);
    const fileInput = await page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(imagePaths);
    await page.waitForTimeout(3000); // 等待上传完成

    // 填写标题
    if (title) {
      console.log(`   📝 填写标题: ${title}`);
      const titleInput = page.locator('[placeholder*="标题"]').first();
      await titleInput.click();
      await titleInput.fill(title);
      await page.waitForTimeout(500);
    }

    // 填写正文
    if (content) {
      console.log("   📝 填写正文...");
      const contentArea = page.locator('[contenteditable="true"]').first();
      await contentArea.click();

      // 输入正文
      await contentArea.fill(content);
      await page.waitForTimeout(500);
    }

    // 添加话题标签
    if (tags.length > 0) {
      console.log(`   🏷️ 添加标签: ${tags.join(", ")}`);
      for (const tag of tags) {
        // 输入 # 触发话题搜索
        const contentArea = page.locator('[contenteditable="true"]').first();
        await contentArea.press("End");
        await contentArea.type(` #${tag}`, { delay: 50 });
        await page.waitForTimeout(1000);

        // 尝试选择第一个话题建议
        const suggestion = page.locator('.topic-item, [class*="topic"]').first();
        if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
          await suggestion.click();
        }
        await page.waitForTimeout(500);
      }
    }

    // 截图预览
    const previewScreenshot = await page.screenshot({ type: "png" });
    const previewBase64 = previewScreenshot.toString("base64");

    if (draft) {
      // 保存草稿
      console.log("   💾 保存到草稿箱...");
      const draftBtn = page.locator('button:has-text("存草稿"), [class*="draft"]').first();
      if (await draftBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await draftBtn.click();
        await page.waitForTimeout(2000);
      }

      return {
        success: true,
        mode: "draft",
        message: "已保存到草稿箱",
        preview: `data:image/png;base64,${previewBase64}`,
      };
    } else {
      // 直接发布
      console.log("   🚀 发布笔记...");
      const publishBtn = page.locator('button:has-text("发布")').first();
      await publishBtn.click();
      await page.waitForTimeout(3000);

      return {
        success: true,
        mode: "publish",
        message: "笔记已发布",
        preview: `data:image/png;base64,${previewBase64}`,
      };
    }
  } catch (err) {
    // 出错时截图
    const errorScreenshot = await page.screenshot({ type: "png" }).catch(() => null);
    const errorBase64 = errorScreenshot ? errorScreenshot.toString("base64") : null;

    throw Object.assign(new Error(`小红书发布失败: ${err.message}`), {
      screenshot: errorBase64 ? `data:image/png;base64,${errorBase64}` : null,
    });
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * 生成小红书风格的文案
 */
export function generateXHSCaption(items, dateInfo) {
  const templates = [
    `今天AI圈发生了大事！这${items.length}条资讯你必须知道👇`,
    `AI行业又有新动态了！${dateInfo.month}月${dateInfo.day}日精选${items.length}条资讯🔥`,
    `每天5分钟，掌握AI最新动态！${dateInfo.full} 精选日报来了✨`,
    `今日AI热点速递！从模型发布到行业变化，一文全掌握📱`,
    `${dateInfo.full} AI日报出炉！今天这几条消息值得关注👀`,
  ];

  const title = templates[Math.floor(Math.random() * templates.length)];

  // 取前 3 条作为正文预告
  const highlights = items.slice(0, 3).map((item, i) => `${i + 1}. ${item.title}`).join("\n");

  const content = `${highlights}\n\n...更多精彩内容见图片👆\n\n关注我，每天第一时间获取AI最新资讯！`;

  const defaultTags = ["AI日报", "人工智能", "科技资讯", "AI", "ChatGPT"];

  return { title, content, tags: defaultTags };
}

/**
 * 关闭浏览器
 */
export async function closeBrowser() {
  if (activeBrowser) {
    await activeBrowser.close().catch(() => {});
    activeBrowser = null;
    activePage = null;
  }
}

/**
 * 获取 Cookie 状态
 */
export async function getCookieStatus() {
  const cookies = await loadCookies();
  if (!cookies || cookies.length === 0) {
    return { hasLogin: false, message: "未登录" };
  }

  // 检查 Cookie 是否过期
  const now = Date.now() / 1000;
  const validCookies = cookies.filter((c) => !c.expires || c.expires > now);

  if (validCookies.length === 0) {
    return { hasLogin: false, message: "Cookie 已过期" };
  }

  return {
    hasLogin: true,
    message: "已登录",
    cookieCount: validCookies.length,
    expires: new Date(Math.min(...validCookies.filter((c) => c.expires).map((c) => c.expires * 1000))).toLocaleString("zh-CN"),
  };
}
