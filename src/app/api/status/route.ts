import { NextResponse } from 'next/server';
import { isPasswordConfigured, sessionFromCookieHeader } from '@/lib/auth';
import { getEnvSources } from '@/lib/env-sources';
import { getEnvLiveSources } from '@/lib/env-live-sources';
import { getEnvSubscriptions } from '@/lib/env-subscriptions';
import { getEnvRecommendSource } from '@/lib/env-recommend-source';
import { getEnvImageMode } from '@/lib/env-image-mode';

export const runtime = 'nodejs';

/**
 * 站点状态：
 * - 客户端据此决定是否弹出登录框
 * - 判断当前是否已验证
 * - 获取部署者预置的点播源、直播源、订阅等
 * - guestAccess=true 时允许游客使用普通功能
 */
export async function GET(req: Request) {
  const passwordRequired = isPasswordConfigured();

  // GUEST_ACCESS=true 表示允许游客使用普通站内功能。
  // 注意：这不代表游客获得 /api/proxy 或 /api/live/stream 权限。
  const guestAccess = process.env.GUEST_ACCESS === 'true';

  const authenticated = passwordRequired && sessionFromCookieHeader(req.headers.get('cookie'));

  // 对前端来说：
  // 已登录用户 = verified
  // 游客模式下的游客 = 也视为 verified
  //
  // 代理权限仍然由 api-guard.ts 单独控制，因此这里不会给游客代理权限。
  const verified = authenticated || guestAccess;

  return NextResponse.json({
    passwordRequired,
    verified,
    guestAccess,

    // 构建时由 next.config.ts 从 package.json 注入
    version: process.env.APP_VERSION || 'dev',

    // 部署者通过 DEFAULT_SOURCES 预置的采集站
    defaultSources: getEnvSources(),

    // 部署者通过 DEFAULT_LIVE_SOURCES 预置的直播源
    defaultLiveSources: getEnvLiveSources(),

    // 部署者通过 DEFAULT_SUBSCRIPTIONS 预置的 SourceList 订阅链接
    defaultSubscriptions: getEnvSubscriptions(),

    // 首页推荐数据源默认值
    defaultRecommendSource: getEnvRecommendSource() ?? null,

    // 封面图加载方式默认值
    defaultImageMode: getEnvImageMode() ?? null,
  });
}
