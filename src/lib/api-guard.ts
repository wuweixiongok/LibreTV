import { NextResponse } from 'next/server';
import { isPasswordConfigured, sessionFromCookieHeader } from './auth';

/**
 * 游客模式允许访问的只读 API。
 *
 * 注意：
 * - /api/proxy
 * - /api/live/stream
 *
 * 故意不在这里，游客仍然不能使用影视/直播代理。
 *
 * 这些普通 API 主要用于：
 * - 搜索
 * - 影片详情
 * - 首页推荐
 * - 直播列表 / EPG
 */
const GUEST_PUBLIC_PATHS = new Set([
  '/api/search',
  '/api/detail',
  '/api/douban',
  '/api/bangumi/calendar',
  '/api/hot-list',
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
 * 1. 没有 PASSWORD：
 *    → 继续保持原来的 503
 *
 * 2. 已登录：
 *    → 全部放行
 *
 * 3. 未登录 + GUEST_ACCESS=true + 公共只读 API：
 *    → 游客放行
 *
 * 4. 其他未登录请求：
 *    → 继续 401
 *
 * 因此 /api/proxy 与 /api/live/stream 不会被游客放行。
 */
export function guardRequest(req: Request): NextResponse | null {
  if (!isPasswordConfigured()) {
    return NextResponse.json(
      { error: '服务器未设置 PASSWORD 环境变量' },
      { status: 503 }
    );
  }

  // 管理员已登录：保持原有全部权限
  if (sessionFromCookieHeader(req.headers.get('cookie'))) {
    return null;
  }

  // 开启游客模式后，仅允许指定的公共只读接口
  if (isGuestPublicPath(req)) {
    return null;
  }

  // 其余接口继续要求登录
  return NextResponse.json({ error: '未登录' }, { status: 401 });
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
