// src/push.js
//
// Minimal Web Push sender for the Cloudflare Workers runtime.
//
// The popular `web-push` npm package relies on Node's `crypto`/`https`
// modules in ways that don't run on Workers, so this implements the two
// pieces of the spec by hand using the standard Web Crypto API instead:
//   - RFC 8292 (VAPID): an ES256-signed JWT proving we own the key pair
//     the browser subscribed with.
//   - RFC 8291 / RFC 8188 (aes128gcm): encrypting the notification payload
//     so only the subscriber's browser can read it.
//
// This is written carefully against the spec, but — because sending a real
// push requires a live browser subscription and a push service (FCM,
// Mozilla autopush, etc.) that this sandbox can't reach — it has not been
// exercised against a real endpoint. If notifications don't arrive after
// deployment, that's the first place to look; the subscribe/unsubscribe
// endpoints and the service worker's `push` handler are the more
// conventional, lower-risk parts of this feature.

function bytesToB64url(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(str) {
    let s = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function concatBytes(...arrays) {
    const total = arrays.reduce((sum, a) => sum + a.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const a of arrays) {
        out.set(a, offset);
        offset += a.length;
    }
    return out;
}

// Single-iteration HKDF (RFC 5869) — sufficient here since every length we
// need (32, 16, 12 bytes) is well under SHA-256's 32-byte output.
async function hkdf(salt, ikm, info, length) {
    const prkKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const prk = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, ikm));

    const infoKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const t1 = new Uint8Array(await crypto.subtle.sign('HMAC', infoKey, concatBytes(info, new Uint8Array([1]))));
    return t1.slice(0, length);
}

async function buildVapidJwt(endpoint, publicKeyB64, privateKeyB64, subject) {
    const aud = new URL(endpoint).origin;
    const header = { typ: 'JWT', alg: 'ES256' };
    const payload = { aud, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: subject };

    const encHeader = bytesToB64url(new TextEncoder().encode(JSON.stringify(header)));
    const encPayload = bytesToB64url(new TextEncoder().encode(JSON.stringify(payload)));
    const signingInput = `${encHeader}.${encPayload}`;

    const pubBytes = b64urlToBytes(publicKeyB64); // uncompressed point: 0x04 || X(32) || Y(32)
    const privBytes = b64urlToBytes(privateKeyB64); // raw 32-byte scalar 'd'

    const jwk = {
        kty: 'EC',
        crv: 'P-256',
        ext: true,
        x: bytesToB64url(pubBytes.slice(1, 33)),
        y: bytesToB64url(pubBytes.slice(33, 65)),
        d: bytesToB64url(privBytes)
    };

    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    // Web Crypto's ECDSA sign() already returns the raw (r||s) format JWTs
    // expect — no DER-to-raw conversion needed.
    const sig = new Uint8Array(
        await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput))
    );

    return `${signingInput}.${bytesToB64url(sig)}`;
}

// Encrypts `plaintext` per RFC 8291, returning the aes128gcm wire format
// (salt || record-size || key-id-length || key-id || ciphertext+tag) ready
// to POST as the push message body.
async function encryptPayload(subscription, plaintext) {
    const subscriberPublicKeyBytes = b64urlToBytes(subscription.keys.p256dh);
    const authSecret = b64urlToBytes(subscription.keys.auth);

    const senderKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const senderPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', senderKeyPair.publicKey));

    const subscriberKey = await crypto.subtle.importKey(
        'raw', subscriberPublicKeyBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []
    );
    const sharedSecret = new Uint8Array(
        await crypto.subtle.deriveBits({ name: 'ECDH', public: subscriberKey }, senderKeyPair.privateKey, 256)
    );

    const infoPrefix = new TextEncoder().encode('WebPush: info\0');
    const ikm = await hkdf(
        authSecret,
        sharedSecret,
        concatBytes(infoPrefix, subscriberPublicKeyBytes, senderPublicRaw),
        32
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
    const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
    const cek = await hkdf(salt, ikm, cekInfo, 16);
    const nonce = await hkdf(salt, ikm, nonceInfo, 12);

    // Single-record body: plaintext followed by the 0x02 "last record" delimiter.
    const padded = concatBytes(plaintext, new Uint8Array([2]));
    const cekKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, padded));

    const recordSizeBytes = new Uint8Array(4);
    new DataView(recordSizeBytes.buffer).setUint32(0, 4096, false);
    const header = concatBytes(salt, recordSizeBytes, new Uint8Array([senderPublicRaw.length]), senderPublicRaw);

    return concatBytes(header, ciphertext);
}

// subscription: the PushSubscription JSON the browser handed us
//   ({ endpoint, keys: { p256dh, auth } }).
// payloadObj: a plain object, JSON-stringified and encrypted for the browser.
// vapid: { publicKey, privateKey, subject } — base64url VAPID keys and a
//   "mailto:" (or https:) contact string, per RFC 8292.
export async function sendWebPush(subscription, payloadObj, vapid) {
    const plaintext = new TextEncoder().encode(JSON.stringify(payloadObj));
    const body = await encryptPayload(subscription, plaintext);
    const jwt = await buildVapidJwt(subscription.endpoint, vapid.publicKey, vapid.privateKey, vapid.subject);

    return fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'TTL': '86400',
            'Authorization': `vapid t=${jwt}, k=${vapid.publicKey}`
        },
        body
    });
}
