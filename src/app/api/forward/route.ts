import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import axios, { AxiosError } from 'axios';

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  halfOpenRequests: 3,
};

function getCircuitBreaker(key: string): CircuitBreakerState {
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, { failures: 0, lastFailure: 0, state: 'closed' });
  }
  return circuitBreakers.get(key)!;
}

function recordSuccess(key: string) {
  const cb = getCircuitBreaker(key);
  cb.failures = 0;
  cb.state = 'closed';
}

function recordFailure(key: string) {
  const cb = getCircuitBreaker(key);
  cb.failures++;
  cb.lastFailure = Date.now();

  if (cb.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    cb.state = 'open';
  }
}

function canRequest(key: string): boolean {
  const cb = getCircuitBreaker(key);

  if (cb.state === 'closed') return true;

  if (cb.state === 'open') {
    if (Date.now() - cb.lastFailure >= CIRCUIT_BREAKER_CONFIG.resetTimeout) {
      cb.state = 'half-open';
      return true;
    }
    return false;
  }

  // half-open: allow limited requests
  return true;
}

interface ForwardPayload {
  path: string;
  method?: string;
  body?: unknown;
}

async function forwardRequest(
  payload: ForwardPayload,
  retryCount = 0
): Promise<NextResponse> {
  const MAX_RETRIES = 2;
  const REQUEST_TIMEOUT = 10000; // 10 seconds

  const { path, method = 'GET', body } = payload;
  const token = (await cookies()).get('token')?.value;

  // Skip auth for public endpoints
  const publicPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/social-login',
    '/auth/check-email',
    '/shipping-methods',
    '/iyzico/initiate',
    '/iyzico/confirm',
    '/shop-orders/track',
    '/products',
    '/categories',
    '/variations',
    '/attributes',
    '/promotions',
    '/banner-images',
    '/public',
  ];
  const isPublic = publicPaths.some(p => path.startsWith(p));

  if (!isPublic && !token) {
    return new NextResponse(JSON.stringify({ message: "You're not logged in." }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const circuitKey = `${method}:${path.split('?')[0]}`;

  if (!canRequest(circuitKey)) {
    return new NextResponse(JSON.stringify({
      message: 'Service temporarily unavailable. Please try again later.',
      retryAfter: Math.ceil((getCircuitBreaker(circuitKey).lastFailure + CIRCUIT_BREAKER_CONFIG.resetTimeout - Date.now()) / 1000)
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(CIRCUIT_BREAKER_CONFIG.resetTimeout / 1000))
      },
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await axios({
      method,
      url: `${process.env.SERVER_URL}${path}`,
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'identity'
      },
      data: body,
      signal: controller.signal,
      timeout: REQUEST_TIMEOUT,
    }).catch((err: AxiosError) => {
      return err.response;
    });

    clearTimeout(timeoutId);

    const headers = new Headers();
    if (res && res.headers) {
      for (const [key, value] of Object.entries(res.headers)) {
        if (typeof value === 'string') {
          headers.set(key, value);
        } else if (Array.isArray(value)) {
          headers.set(key, value.join(','));
        }
      }
    }

    if (!res) {
      recordFailure(circuitKey);
      return new NextResponse(JSON.stringify({ message: 'Backend unreachable' }), {
        status: 503,
        headers,
      });
    }

    // Handle 401 - try token refresh once
    if (res.status === 401 && retryCount === 0 && !isPublic && token) {
      try {
        const refreshToken = (await cookies()).get('refresh_token')?.value;
        if (refreshToken) {
          const refreshRes = await axios({
            method: 'POST',
            url: `${process.env.SERVER_URL}/auth/refresh`,
            headers: { 'Content-Type': 'application/json' },
            data: { refreshToken },
            timeout: 5000,
          });

          if (refreshRes.status === 200 && refreshRes.data?.token) {
            const { token: newToken, refreshToken: newRefreshToken, expiresAt, user } = refreshRes.data;

            const cookieStore = await cookies();
            const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

            cookieStore.set({
              name: 'token',
              value: newToken,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge,
              path: '/',
            });

            cookieStore.set({
              name: 'refresh_token',
              value: newRefreshToken,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 30,
              path: '/',
            });

            if (user?.roleName) {
              cookieStore.set({
                name: 'user_role',
                value: user.roleName,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge,
                path: '/',
              });
            }

            // Retry original request with new token
            return forwardRequest(payload, retryCount + 1);
          }
        }
      } catch {
        // Refresh failed, clear cookies and return 401
        const cookieStore = await cookies();
        cookieStore.delete('token');
        cookieStore.delete('refresh_token');
        cookieStore.delete('user_role');
      }
    }

    if (res.status >= 500) {
      recordFailure(circuitKey);
    } else {
      recordSuccess(circuitKey);
    }

    if (res.status === 204) {
      return new NextResponse(null, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    }

    return new NextResponse(JSON.stringify(res.data), {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    recordFailure(circuitKey);

    if (axios.isCancel(error) || error instanceof DOMException) {
      return new NextResponse(JSON.stringify({ message: 'Request timeout' }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (retryCount < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return forwardRequest(payload, retryCount + 1);
    }

    return new NextResponse(JSON.stringify({ message: 'Request failed after retries' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    return forwardRequest(payload);
  } catch {
    return new NextResponse(JSON.stringify({ message: 'Invalid JSON request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}