import { NextResponse } from 'next/server';
import { isPasswordConfigured, sessionFromCookieHeader } from './auth';

/**
 * 游客可以直接访问的公共 API。
 *
 * 注意：
 * /api/proxy
 * /api/live/stream
 *
 * 故意不加入这里。
 * 游客只能搜索、查看详情、读取直播列表/EPG，
 * 不能使用 LibreTV 的影视/直播代理。
 */
const GUEST_PUBLIC_PATHS = new Set([
  '/api/search',
  '/api/detail',

  // 首页/推荐
  '/api/douban',
  '/api/bangumi/calendar',
  '/api/hot-list',

  // 预置订阅（DEFAULT_SUBSCRIPTIONS）
  '/api/source-list',

  // 直播
  '/api/live/playlist',
  '/api/live/epg',
]);

function isGuestAccessEnabled(): boolean {
  return process.env.GUEST_ACCESS === 'true';
}

function isGuestPublicPath(req: Request): boolean {
  if (!isGuestAccessEnabled()) return false;

  try {
    const pathname = new URL(req.url).pathname;
    return GUEST_PUBLIC_PATHS.has(pathname);
  } catch {
    return false;
  }
}

/**
 * API Route 共享守卫：
 *
 * 1. PASSWORD 未配置：
 *    保持原有行为，返回 503。
 *
 * 2. 已登录：
 *    保持原有行为，所有 API 放行。
 *
 * 3. 未登录 + GUEST_ACCESS=true + 公共 API：
 *    游客放行。
 *
 * 4. 其他未登录请求：
 *    返回 401。
 *
 * 因此：
 *
 * 游客：
 *   /api/search         ✅
 *   /api/detail         ✅
 *   /api/live/playlist  ✅
 *   /api/live/epg       ✅
 *   /api/proxy          ❌
 *   /api/live/stream    ❌
 *
 * 管理员登录后：
 *   所有 API 保持原有权限。
 */
export function guardRequest(req: Request): NextResponse | null {
  // PASSWORD 仍然必须保留，用于管理员登录/代理权限。
  if (!isPasswordConfigured()) {
    return NextResponse.json(
      { error: '服务器未设置 PASSWORD 环境变量' },
      { status: 503 }
    );
  }

  // 已登录管理员：保持原有全部权限。
  if (sessionFromCookieHeader(req.headers.get('cookie'))) {
    return null;
  }

  // 游客模式：仅放行指定的公共 API。
  if (isGuestPublicPath(req)) {
    return null;
  }

  // 其他 API 继续要求登录。
  return NextResponse.json({ error: '未登录' }, { status: 401 });
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
