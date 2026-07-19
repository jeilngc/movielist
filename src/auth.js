// src/auth.js
export const COOKIE_NAME = 'mj_session';
const DEV_FALLBACK_SECRET = 'default-dev-secret-do-not-use-in-prod';

async function hmacHex(secret, message) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
    return [...new Uint8Array(signature)]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function createToken(secret) {
    const hash = await hmacHex(secret || DEV_FALLBACK_SECRET, 'authorized_user');
    return `auth_${hash}`;
}

export async function isAuthenticated(request, secret) {
    const cookieHeader = request.headers.get('Cookie') || '';
    const expectedToken = await createToken(secret);
    return cookieHeader.includes(`${COOKIE_NAME}=${expectedToken}`);
}

export function authCookie(token) {
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    return `${COOKIE_NAME}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookie() {
    return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function json(obj, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json', ...extraHeaders }
    });
}
