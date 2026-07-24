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

// Token now encodes WHICH person is logged in, signed so it can't be forged
// or edited client-side (e.g. changing "may" to "jay" in the cookie).
export async function createToken(secret, person) {
    const hash = await hmacHex(secret || DEV_FALLBACK_SECRET, `authorized_user:${person}`);
    return `${person}.${hash}`;
}

function parseCookie(request) {
    const cookieHeader = request.headers.get('Cookie') || '';
    const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    return match ? match[1] : null;
}

// Returns 'may' | 'jay' if the cookie is valid, or null if missing/invalid/forged.
export async function getAuthedPerson(request, secret) {
    const raw = parseCookie(request);
    if (!raw) return null;

    const dotIndex = raw.indexOf('.');
    if (dotIndex === -1) return null;

    const person = raw.slice(0, dotIndex);
    if (person !== 'may' && person !== 'jay') return null;

    const expected = await createToken(secret, person);
    return raw === expected ? person : null;
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