/**
 * 小红书发布服务（v2）
 *
 * 核心改进（参考 xhs_ai_publisher 最佳实践）：
 * 1. 使用 Playwright launchPersistentContext 持久化浏览器 Profile
 * 2. 支持 Cookie JSON 手动导入
 * 3. 用 API 验证登录状态（/api/galaxy/user/info）
 * 4. 登录一次后自动复用，无需重复扫码
 */

import { chromium } from "playwright";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = resolve(__dirname, "../../config");
const COOKIE_PATH = resolve(CONFIG_DIR, "xhs-cookies.json");
const USER_DATA_DIR = resolve(CONFIG_DIR, "xhs-browser-data");
const XHS_CREATOR_URL = "https://creator.xiaohongshu.com";
const XHS_PUBLISH_URL = "https://creator.xiaohongshu.com/publish/publish";
const XHS_USER_INFO_API = "https://creator.xiaohongshu.com/api/galaxy/user/info";

let activeContext = null;
let activePage = null;

const BROWSER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-blink-features=AutomationControlled",
];

/**
 * 获取持久化浏览器上下文（核心）
 * 所有 cookies/localStorage/IndexedDB 自动持久化到 USER_DATA_DIR
 */
async function getContext() {
  if (activeContext) {
    try {
      // 检查是否还活着
      activeContext.pages();
      return activeContext;
    } catch {
      activeContext = null;
      activePage = null;
    }
  }

  await mkdir(USER_DATA_DIR, { recursive: true });

  console.log("   🌐 启动持久化浏览器上下文...");
  activeContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    args: BROWSER_ARGS,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });

  // 注入反检测脚本到所有新页面
  await activeContext.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  // 尝试加载已保存的 Cookie（兼容旧版 / Cookie 导入）
  try {
    await access(COOKIE_PATH);
    const raw = await readFile(COOKIE_PATH, "utf-8");
    const cookies = JSON.parse(raw);
    if (Array.isArray(cookies) && cookies.length > 0) {
      await activeContext.addCookies(cookies);
      console.log("   🍪 已加载 " + cookies.length + " 个 Cookie");
    }
  } catch {
    // 无已保存的 Cookie，正常
  }

  return activeContext;
}

/**
 * 获取活跃页面
 */
async function getPage() {
  const ctx = await getContext();
  if (activePage && !activePage.isClosed()) {
    return activePage;
  }
  const pages = ctx.pages();
  activePage = pages.length > 0 ? pages[0] : await ctx.newPage();
  return activePage;
}

/**
 * 通过 API 验证登录状态（比 DOM 检测更可靠）
 */
async function checkLoginViaAPI() {
  try {
    const ctx = await getContext();
    const resp = await ctx.request.get(XHS_USER_INFO_API, { timeout: 10000 });
    if (resp.status() === 200) {
      const data = await resp.json().catch(() => null);
      return {
        loggedIn: true,
        userInfo: data?.data || null,
      };
    }
    return { loggedIn: false };
  } catch {
    return { loggedIn: false };
  }
}

/**
 * 保存当前上下文的 Cookie 到文件（备份用）
 */
async function saveContextCookies() {
  if (!activeContext) return;
  try {
    const cookies = await activeContext.cookies();
    const xhsCookies = cookies.filter((c) => c.domain.includes("xiaohongshu.com"));
    if (xhsCookies.length > 0) {
      await mkdir(CONFIG_DIR, { recursive: true });
      await writeFile(COOKIE_PATH, JSON.stringify(xhsCookies, null, 2), "utf-8");
      console.log("   💾 已保存 " + xhsCookies.length + " 个 Cookie");
    }
  } catch (err) {
    console.error("   ⚠️ 保存 Cookie 失败:", err.message);
  }
}

// ===================== 登录相关 =====================

/**
 * 启动扫码登录流程
 */
export async function startLogin() {
  const page = await getPage();

  console.log("   📱 正在打开小红书创作者中心...");
  await page.goto(XHS_CREATOR_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);

  // 检查是否已登录（持久化 Profile 可能已保留登录态）
  const loginCheck = await checkLoginViaAPI();
  if (loginCheck.loggedIn) {
    await saveContextCookies();
    const screenshot = await page.screenshot({ type: "png", timeout: 60000 });
    return {
      qrCode: "data:image/png;base64," + screenshot.toString("base64"),
      message: "已经登录！无需重新扫码",
      loggedIn: true,
    };
  }

  // 切换到扫码登录模式
  console.log("   🔄 切换到扫码登录模式...");
  try {
    const qrSwitch = page.locator(".css-jjnw1w img").first();
    if (await qrSwitch.isVisible({ timeout: 5000 })) {
      await qrSwitch.click();
      await page.waitForTimeout(3000);
    }
  } catch {}

  // 截取二维码区域
  let screenshot;
  try {
    const qrImg = page.locator(".css-jjnw1w img[src^='data:image']").first();
    if (await qrImg.isVisible({ timeout: 3000 })) {
      const qrBox = await qrImg.boundingBox();
      if (qrBox) {
        screenshot = await page.screenshot({
          type: "png",
          timeout: 60000,
          clip: {
            x: Math.max(0, qrBox.x - 80),
            y: Math.max(0, qrBox.y - 60),
            width: qrBox.width + 160,
            height: qrBox.height + 140,
          },
        });
      }
    }
  } catch {}
  if (!screenshot) {
    screenshot = await page.screenshot({ type: "png", timeout: 60000 });
  }

  return {
    qrCode: "data:image/png;base64," + screenshot.toString("base64"),
    message: "请使用小红书 App 扫描二维码登录",
    loggedIn: false,
  };
}

/**
 * 短信登录 — 步骤1：输入手机号并发送验证码
 */
export async function startSmsLogin(phone) {
  if (!phone || !/^1\d{10}$/.test(phone)) {
    throw new Error("请输入有效的11位手机号");
  }

  const page = await getPage();

  console.log("   📱 正在打开小红书创作者中心...");
  await page.goto(XHS_CREATOR_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);

  // 先检查是否已登录
  const loginCheck = await checkLoginViaAPI();
  if (loginCheck.loggedIn) {
    await saveContextCookies();
    return { success: true, message: "已经登录！无需重新验证", loggedIn: true };
  }

  console.log("   📱 短信登录：输入手机号...");
  try {
    const phoneInput = page.locator('input[placeholder*="手机号"]').first();
    await phoneInput.waitFor({ state: "visible", timeout: 8000 });
    await phoneInput.click();
    await phoneInput.fill(phone);
    await page.waitForTimeout(500);

    const sendBtn = page.locator('div:has-text("发送验证码")').last();
    await sendBtn.click();
    await page.waitForTimeout(2000);

    const screenshot = await page.screenshot({ type: "png", timeout: 60000 });
    return {
      success: true,
      message: "验证码已发送，请查看短信",
      screenshot: "data:image/png;base64," + screenshot.toString("base64"),
    };
  } catch (err) {
    const screenshot = await page.screenshot({ type: "png", timeout: 60000 }).catch(() => null);
    throw Object.assign(new Error("发送验证码失败: " + err.message), {
      screenshot: screenshot ? "data:image/png;base64," + screenshot.toString("base64") : null,
    });
  }
}

/**
 * 短信登录 — 步骤2：输入验证码并登录
 */
export async function verifySmsCode(code) {
  if (!activePage || activePage.isClosed()) {
    throw new Error("请先发送验证码");
  }
  if (!code || !/^\d{4,6}$/.test(code)) {
    throw new Error("请输入4-6位数字验证码");
  }

  const page = activePage;
  console.log("   🔑 短信登录：输入验证码...");

  try {
    const codeInput = page.locator('input[placeholder*="验证码"]').first();
    await codeInput.waitFor({ state: "visible", timeout: 5000 });
    await codeInput.click();
    await codeInput.fill(code);
    await page.waitForTimeout(500);

    const loginBtn = page.locator('.beer-login-btn, button:has-text("登")').first();
    await loginBtn.click();
    await page.waitForTimeout(5000);

    // 用 API 验证
    const loginCheck = await checkLoginViaAPI();
    if (loginCheck.loggedIn) {
      await saveContextCookies();
      const screenshot = await page.screenshot({ type: "png", timeout: 60000 });
      return {
        loggedIn: true,
        message: "登录成功！",
        screenshot: "data:image/png;base64," + screenshot.toString("base64"),
      };
    }

    const screenshot = await page.screenshot({ type: "png", timeout: 60000 });
    return {
      loggedIn: false,
      message: "登录未成功，请检查验证码",
      screenshot: "data:image/png;base64," + screenshot.toString("base64"),
    };
  } catch (err) {
    throw new Error("验证码登录失败: " + err.message);
  }
}

/**
 * 导入 Cookie JSON（用户从浏览器导出后粘贴）
 */
export async function importCookies(cookiesJson) {
  let cookies;
  try {
    cookies = typeof cookiesJson === "string" ? JSON.parse(cookiesJson) : cookiesJson;
  } catch {
    throw new Error("Cookie JSON 格式无效");
  }

  if (!Array.isArray(cookies) || cookies.length === 0) {
    throw new Error("Cookie 数组为空");
  }

  // 标准化 Cookie 格式（兼容不同导出工具的格式差异）
  const normalized = cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain?.startsWith(".") ? c.domain : "." + (c.domain || "xiaohongshu.com"),
    path: c.path || "/",
    ...(c.expires ? { expires: c.expires > 1e12 ? c.expires / 1000 : c.expires } : {}),
    httpOnly: c.httpOnly ?? false,
    secure: c.secure ?? true,
    sameSite: c.sameSite || "None",
  }));

  // 保存到文件
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(COOKIE_PATH, JSON.stringify(normalized, null, 2), "utf-8");

  // 加载到浏览器上下文
  const ctx = await getContext();
  await ctx.addCookies(normalized);

  // 验证是否有效
  const loginCheck = await checkLoginViaAPI();

  return {
    imported: normalized.length,
    loggedIn: loginCheck.loggedIn,
    message: loginCheck.loggedIn
      ? "成功导入 " + normalized.length + " 个 Cookie，登录有效！"
      : "已导入 " + normalized.length + " 个 Cookie，但登录未生效（Cookie 可能已过期）",
  };
}

/**
 * 检查登录状态
 */
export async function checkLoginStatus() {
  // 优先用 API 检查
  const apiCheck = await checkLoginViaAPI();
  if (apiCheck.loggedIn) {
    await saveContextCookies();
    let screenshot = null;
    if (activePage && !activePage.isClosed()) {
      try {
        const buf = await activePage.screenshot({ type: "png", timeout: 60000 });
        screenshot = "data:image/png;base64," + buf.toString("base64");
      } catch {}
    }
    return {
      loggedIn: true,
      message: "登录成功！Cookie 已保存",
      screenshot,
    };
  }

  // 检查活跃页面
  if (activePage && !activePage.isClosed()) {
    const url = activePage.url();
    if (!url.includes("/login") && url.includes("xiaohongshu")) {
      await saveContextCookies();
      const buf = await activePage.screenshot({ type: "png", timeout: 60000 });
      return {
        loggedIn: true,
        message: "登录成功！",
        screenshot: "data:image/png;base64," + buf.toString("base64"),
      };
    }

    const buf = await activePage.screenshot({ type: "png", timeout: 60000 });
    return {
      loggedIn: false,
      message: "等待扫码...",
      qrCode: "data:image/png;base64," + buf.toString("base64"),
    };
  }

  return { loggedIn: false, message: "请先启动登录流程" };
}

// ===================== 发布相关 =====================

/**
 * 发布笔记到小红书（或保存到草稿）
 */
export async function publishToXHS(options) {
  const { imagePaths, title, content, tags = [], draft = true } = options;

  // 验证登录
  const loginCheck = await checkLoginViaAPI();
  if (!loginCheck.loggedIn) {
    throw new Error("未登录小红书，请先登录");
  }

  const ctx = await getContext();
  const page = await ctx.newPage();

  try {
    console.log("   📱 打开小红书创作者中心...");
    await page.goto(XHS_PUBLISH_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    // 检查是否需要重新登录
    if (page.url().includes("/login")) {
      throw new Error("登录态已过期，请重新登录");
    }

    // 上传图片
    console.log("   🖼️ 上传 " + imagePaths.length + " 张图片...");
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(imagePaths);
    await page.waitForTimeout(3000);

    // 填写标题
    if (title) {
      console.log("   📝 填写标题: " + title);
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
      await contentArea.fill(content);
      await page.waitForTimeout(500);
    }

    // 添加话题标签
    if (tags.length > 0) {
      console.log("   🏷️ 添加标签: " + tags.join(", "));
      for (const tag of tags) {
        const contentArea = page.locator('[contenteditable="true"]').first();
        await contentArea.press("End");
        await contentArea.type(" #" + tag, { delay: 50 });
        await page.waitForTimeout(1000);

        const suggestion = page.locator('.topic-item, [class*="topic"]').first();
        if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
          await suggestion.click();
        }
        await page.waitForTimeout(500);
      }
    }

    // 截图预览
    const previewBuf = await page.screenshot({ type: "png" });
    const previewBase64 = previewBuf.toString("base64");

    if (draft) {
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
        preview: "data:image/png;base64," + previewBase64,
      };
    } else {
      console.log("   🚀 发布笔记...");
      const publishBtn = page.locator('button:has-text("发布")').first();
      await publishBtn.click();
      await page.waitForTimeout(3000);
      return {
        success: true,
        mode: "publish",
        message: "笔记已发布",
        preview: "data:image/png;base64," + previewBase64,
      };
    }
  } catch (err) {
    const errorBuf = await page.screenshot({ type: "png" }).catch(() => null);
    throw Object.assign(new Error("小红书发布失败: " + err.message), {
      screenshot: errorBuf ? "data:image/png;base64," + errorBuf.toString("base64") : null,
    });
  } finally {
    await page.close().catch(() => {});
  }
}

// ===================== 工具函数 =====================

/**
 * 生成小红书风格的文案
 */
export function generateXHSCaption(items, dateInfo) {
  const templates = [
    "今天AI圈发生了大事！这" + items.length + "条资讯你必须知道👇",
    "AI行业又有新动态了！" + dateInfo.month + "月" + dateInfo.day + "日精选" + items.length + "条资讯🔥",
    "每天5分钟，掌握AI最新动态！" + dateInfo.full + " 精选日报来了✨",
    "今日AI热点速递！从模型发布到行业变化，一文全掌握📱",
    dateInfo.full + " AI日报出炉！今天这几条消息值得关注👀",
  ];

  const title = templates[Math.floor(Math.random() * templates.length)];
  const highlights = items.slice(0, 3).map((item, i) => (i + 1) + ". " + item.title).join("\n");
  const content = highlights + "\n\n...更多精彩内容见图片👆\n\n关注我，每天第一时间获取AI最新资讯！";
  const defaultTags = ["AI日报", "人工智能", "科技资讯", "AI", "ChatGPT"];

  return { title, content, tags: defaultTags };
}

/**
 * 关闭浏览器
 */
export async function closeBrowser() {
  if (activeContext) {
    await activeContext.close().catch(() => {});
    activeContext = null;
    activePage = null;
  }
}

/**
 * 获取登录状态（快速检查）
 */
export async function getCookieStatus() {
  // 优先用 API 检查
  try {
    const apiCheck = await checkLoginViaAPI();
    if (apiCheck.loggedIn) {
      const userName = apiCheck.userInfo?.nickname || apiCheck.userInfo?.name || "已登录";
      return {
        hasLogin: true,
        message: "已登录 (" + userName + ")",
        userName,
      };
    }
  } catch {}

  // 降级检查 Cookie 文件
  try {
    await access(COOKIE_PATH);
    const raw = await readFile(COOKIE_PATH, "utf-8");
    const cookies = JSON.parse(raw);
    const now = Date.now() / 1000;
    const valid = cookies.filter((c) => !c.expires || c.expires > now);
    if (valid.length > 0) {
      return {
        hasLogin: true,
        message: "有 Cookie（未验证）",
        cookieCount: valid.length,
        expires: new Date(
          Math.min(...valid.filter((c) => c.expires).map((c) => c.expires * 1000))
        ).toLocaleString("zh-CN"),
      };
    }
  } catch {}

  return { hasLogin: false, message: "未登录" };
}
