import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Bảo vệ API câu hỏi lái xe cho app iOS/Android (chuyển từ middleware.ts của ckk-biz, giữ nguyên luật)

// Allowed web origins for browser requests
const ALLOWED_ORIGINS = new Set([
  'https://hallovn.de',
  'https://www.hallovn.de',
  'https://ckk.biz',
  'https://www.ckk.biz',
  'http://localhost:3000',
  'http://localhost:8081',
  'http://localhost:19006',
]);

// Known automated scrapers and CLI bot user agents
const BOT_USER_AGENTS = [
  'curl',
  'wget',
  'python-requests',
  'python-urllib',
  'httpx',
  'aiohttp',
  'scrapy',
  'postmanruntime',
  'insomnia',
  'httpie',
  'go-http-client',
];

// App Secret Key (can be configured in Vercel environment variables)
const VALID_APP_KEY = process.env.FUEHRERSCHEIN_APP_KEY || 'dt_app_2026_sec_7f9c2d1b8e4a605f';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory sliding window rate limiter
const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Lazy cleanup if map grows too large
  if (rateLimitMap.size > 5000) {
    for (const [k, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) rateLimitMap.delete(k);
    }
  }

  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    const newEntry = { count: 1, resetAt: now + windowMs };
    rateLimitMap.set(key, newEntry);
    return { allowed: true, remaining: limit - 1, resetAt: newEntry.resetAt };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export function fuehrerscheinGuard(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;


  const origin = request.headers.get('origin');
  const userAgent = request.headers.get('user-agent') || '';
  const clientAppKey = request.headers.get('x-app-key');
  const isDev = process.env.NODE_ENV === 'development';

  // Chế độ cưỡng chế App Key (Bước 4): Đặt REQUIRE_APP_KEY=true trên Vercel để từ chối các request không có key
  const isKeyEnforced = process.env.REQUIRE_APP_KEY === 'true' || process.env.FUEHRERSCHEIN_REQUIRE_APP_KEY === 'true';

  // 1. CORS Enforcement (Web Browser callers)
  if (origin) {
    if (!ALLOWED_ORIGINS.has(origin)) {
      return NextResponse.json(
        { error: 'CORS policy violation: Origin not allowed' },
        { status: 403 }
      );
    }

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept, X-App-Key, X-Client-Platform, X-Client-Version',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
  }

  // 2. Chặn Bot Scraper / CLI qua User-Agent
  const lowerUA = userAgent.toLowerCase().trim();
  if (!isDev) {
    if (!lowerUA) {
      return NextResponse.json(
        { error: 'Access denied: User-Agent header required' },
        { status: 403 }
      );
    }

    const isBot = BOT_USER_AGENTS.some(bot => lowerUA.includes(bot));
    if (isBot) {
      return NextResponse.json(
        { error: 'Automated scraping is prohibited' },
        { status: 403 }
      );
    }
  }

  // 3. Xác thực App Key & Dual-Mode (Bước 2, 3, 4)
  let isAppAuthenticated = false;

  if (clientAppKey) {
    if (clientAppKey === VALID_APP_KEY) {
      isAppAuthenticated = true;
    } else {
      // Có gửi key nhưng key sai -> Chặn ngay
      return NextResponse.json(
        { error: 'Invalid app key' },
        { status: 403 }
      );
    }
  } else {
    // Không có key:
    if (isKeyEnforced && !isDev) {
      // Bước 4: Khóa cứng hoàn toàn
      return NextResponse.json(
        {
          error: 'Unauthorized: App key is required. Please update your app to the latest version.',
          code: 'APP_UPDATE_REQUIRED',
        },
        { status: 401 }
      );
    }
    // Bước 3: Dual-Mode -> Vẫn cho phép app cũ truy cập, nhưng với hạn mức thấp hơn
  }

  // 4. Rate Limiting theo IP & Chế độ xác thực
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) || '127.0.0.1';

  const windowMs = 60 * 1000;
  let limit: number;

  if (isAppAuthenticated) {
    // Hạn mức ưu tiên cho App đã nâng cấp có X-App-Key (thoải mái học & update)
    if (pathname.endsWith('/questions')) {
      limit = 30; // 30 req/phút
    } else if (pathname.includes('/translations/')) {
      limit = 60; // 60 req/phút
    } else {
      limit = 120; // 120 req/phút cho version / validate-receipt
    }
  } else {
    // Hạn mức thắt chặt cho app cũ hoặc caller chưa có key (chống crawl hàng loạt)
    if (pathname.endsWith('/questions')) {
      limit = 5; // 5 req/phút
    } else if (pathname.includes('/translations/')) {
      limit = 10; // 10 req/phút
    } else {
      limit = 20; // 20 req/phút
    }
  }

  const routeGroup = pathname.includes('/questions')
    ? 'questions'
    : pathname.includes('/translations')
      ? 'translations'
      : 'version';

  const rateLimitKey = `${ip}:${isAppAuthenticated ? 'auth' : 'anon'}:${routeGroup}`;
  const rateLimit = checkRateLimit(rateLimitKey, limit, windowMs);

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: isAppAuthenticated
          ? 'Rate limit exceeded. Please wait a moment.'
          : 'Too many requests. Please update the app or try again later.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, retryAfter)),
          'Content-Type': 'application/json',
        },
      }
    );
  }

  const response = NextResponse.next();

  // Thêm header CORS cho origin hợp lệ
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept, X-App-Key, X-Client-Platform, X-Client-Version');
  }

  // Thêm header Rate Limit & Authentication status
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetAt / 1000)));
  response.headers.set('X-App-Authenticated', isAppAuthenticated ? 'true' : 'false');

  return response;
}
