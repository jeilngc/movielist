// src/index.js
import { createToken, authCookie, clearCookie, getAuthedPerson, json } from './auth.js';

const KV_KEY = 'library:items';
const PUBLIC_PATHS = new Set(['/login.html', '/api/login', '/api/logout', '/sw.js', '/manifest.json']);
// The service worker registers (and the manifest/icons get fetched) before
// anyone has necessarily logged in, so these need to be reachable without
// a session cookie — same as the login page itself.
const PUBLIC_PREFIXES = ['/icons/'];

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const { pathname } = url;

        // --- Public endpoints (no auth required) ---
        if (pathname === '/api/login') {
            return handleLogin(request, env);
        }
        if (pathname === '/api/logout') {
            return handleLogout();
        }

        const isPublicAsset = PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
        if (isPublicAsset && pathname !== '/login.html') {
            return env.ASSETS.fetch(request);
        }

        // --- Everything else requires a valid session cookie ---
        const person = await getAuthedPerson(request, env.COOKIE_SECRET);

        if (!person) {
            if (pathname.startsWith('/api/')) {
                return json({ error: 'Unauthorized' }, 401);
            }
            if (pathname === '/login.html') {
                return env.ASSETS.fetch(request);
            }
            return Response.redirect(`${url.origin}/login.html`, 302);
        }

        // Authenticated from here on. `person` ('may' or 'jay') comes straight
        // from the verified cookie — never trust a client-supplied person field.
        if (pathname === '/api/me') {
            return json({ person });
        }
        if (pathname === '/api/items') {
            return handleItems(request, env);
        }
        if (pathname === '/api/items/add') {
            return handleAddItem(request, env);
        }
        if (pathname === '/api/rate') {
            return handleRate(request, env, person);
        }
        if (pathname === '/api/plan') {
            return handlePlan(request, env);
        }
        if (pathname.startsWith('/api/')) {
            return json({ error: 'Not found' }, 404);
        }

        // Authenticated request for a static page/asset — serve it normally.
        // (If someone lands on /login.html while already logged in, just show it;
        // no need to force a redirect loop.)
        return env.ASSETS.fetch(request);
    }
};

async function handleLogin(request, env) {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    let body = {};
    try {
        body = await request.json();
    } catch (e) {
        // missing/invalid JSON body — treat as empty
    }

    const { password } = body;
    const mayPassword = env.SITE_PASSWORD_MAY;
    const jayPassword = env.SITE_PASSWORD_JAY;

    if (!mayPassword || !jayPassword) {
        return json({ error: 'SITE_PASSWORD_MAY / SITE_PASSWORD_JAY are not configured on the server.' }, 500);
    }

    let matchedPerson = null;
    if (password === mayPassword) matchedPerson = 'may';
    else if (password === jayPassword) matchedPerson = 'jay';

    if (matchedPerson) {
        const token = await createToken(env.COOKIE_SECRET, matchedPerson);
        return json({ ok: true, person: matchedPerson }, 200, { 'Set-Cookie': authCookie(token) });
    }

    return json({ ok: false, error: 'Wrong password.' }, 401);
}

function handleLogout() {
    return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
}

async function handleItems(request, env) {
    if (request.method === 'GET') {
        try {
            const raw = await env.LIBRARY_KV.get(KV_KEY);
            const items = raw ? JSON.parse(raw) : null;
            return json(items);
        } catch (error) {
            console.error('KV Get Error:', error);
            return json({ error: 'Failed to fetch items from database.' }, 500);
        }
    }

    if (request.method === 'POST') {
        try {
            const { items } = await request.json();
            if (!Array.isArray(items)) {
                return json({ error: 'Invalid payload: items must be an array.' }, 400);
            }
            await env.LIBRARY_KV.put(KV_KEY, JSON.stringify(items));
            return json({ ok: true });
        } catch (error) {
            console.error('KV Set Error:', error);
            return json({ error: 'Failed to save items to database.' }, 500);
        }
    }

    return json({ error: 'Method not allowed' }, 405);
}

async function handleAddItem(request, env) {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    try {
        const body = await request.json();

        const title = String(body.title || '').trim().slice(0, 200);
        const type = body.type === 'series' ? 'series' : 'movie';
        const category = String(body.category || '').trim().slice(0, 40);
        const year = Number(body.year);
        const duration = String(body.duration || '').trim().slice(0, 40);
        const posterRaw = String(body.poster || '').trim();
        const bannerRaw = String(body.banner || '').trim();
        const description = String(body.description || '').trim().slice(0, 600);

        if (!title || !category || !posterRaw) {
            return json({ ok: false, error: 'Title, category and poster are required.' }, 400);
        }
        if (!Number.isFinite(year) || year < 1900 || year > 2100) {
            return json({ ok: false, error: 'Please enter a valid year.' }, 400);
        }

        let poster;
        try {
            poster = new URL(posterRaw).toString();
        } catch (e) {
            return json({ ok: false, error: 'Poster must be a valid URL.' }, 400);
        }

        let banner = poster;
        if (bannerRaw) {
            try {
                banner = new URL(bannerRaw).toString();
            } catch (e) {
                return json({ ok: false, error: 'Banner must be a valid URL.' }, 400);
            }
        }

        // Read-append-write happens entirely within this single request, right
        // before the write, instead of the client holding the array in memory
        // across however long the "Add a title" modal was open. That shrinks
        // (though, without a Durable Object, doesn't fully eliminate) the
        // window in which two simultaneous adds could clobber each other.
        const raw = await env.LIBRARY_KV.get(KV_KEY);
        const items = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(items)) {
            return json({ ok: false, error: 'Library data is corrupted.' }, 500);
        }

        const nextId = items.reduce((max, i) => Math.max(max, Number(i.id) || 0), 0) + 1;
        const newItem = {
            id: nextId,
            title,
            type,
            category,
            year,
            duration,
            poster,
            banner,
            description,
            plannedDate: null,
            watched: null
        };

        items.push(newItem);
        await env.LIBRARY_KV.put(KV_KEY, JSON.stringify(items));

        return json({ ok: true, item: newItem });
    } catch (error) {
        console.error('Add Item Error:', error);
        return json({ ok: false, error: 'Server error while adding item.' }, 500);
    }
}

async function handleRate(request, env, authedPerson) {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    try {
        const { id, rating, comment } = await request.json();
        // `person` is always the authenticated identity from the cookie now —
        // ignores any person field the client might send, so May can never
        // accidentally (or deliberately) save a rating as Jay or vice versa.
        const person = authedPerson;

        if (!id) {
            return json({ ok: false, error: 'Invalid rating data.' }, 400);
        }

        const raw = await env.LIBRARY_KV.get(KV_KEY);
        const items = raw ? JSON.parse(raw) : null;
        if (!items || !Array.isArray(items)) {
            return json({ ok: false, error: 'Library not found in database.' }, 404);
        }

        const itemIndex = items.findIndex((i) => i.id === Number(id));
        if (itemIndex === -1) {
            return json({ ok: false, error: 'Item not found.' }, 404);
        }

        const item = items[itemIndex];
        const numericRating = Number(rating);

        if (numericRating === 0) {
            // A 0 rating means "remove this person's rating" (not yet rated).
            if (item.watched) {
                delete item.watched[person];
                if (Object.keys(item.watched).length === 0) {
                    item.watched = null;
                }
            }
        } else {
            if (!item.watched) {
                item.watched = {};
            }
            item.watched[person] = {
                rating: numericRating,
                comment: String(comment || '')
            };
        }

        items[itemIndex] = item;
        await env.LIBRARY_KV.put(KV_KEY, JSON.stringify(items));

        return json({ ok: true, item });
    } catch (error) {
        console.error('Rate Error:', error);
        return json({ ok: false, error: 'Server error while saving rating.' }, 500);
    }
}

async function handlePlan(request, env) {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    try {
        const { id, plannedDate } = await request.json();

        if (!id) {
            return json({ ok: false, error: 'Invalid plan data.' }, 400);
        }

        // plannedDate must be either null/empty (clear it) or a valid YYYY-MM-DD string.
        let normalizedDate = null;
        if (plannedDate) {
            const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(plannedDate);
            if (!isValidFormat || Number.isNaN(new Date(`${plannedDate}T00:00:00`).getTime())) {
                return json({ ok: false, error: 'Invalid date.' }, 400);
            }
            normalizedDate = plannedDate;
        }

        const raw = await env.LIBRARY_KV.get(KV_KEY);
        const items = raw ? JSON.parse(raw) : null;
        if (!items || !Array.isArray(items)) {
            return json({ ok: false, error: 'Library not found in database.' }, 404);
        }

        const itemIndex = items.findIndex((i) => i.id === Number(id));
        if (itemIndex === -1) {
            return json({ ok: false, error: 'Item not found.' }, 404);
        }

        items[itemIndex].plannedDate = normalizedDate;
        await env.LIBRARY_KV.put(KV_KEY, JSON.stringify(items));

        return json({ ok: true, item: items[itemIndex] });
    } catch (error) {
        console.error('Plan Error:', error);
        return json({ ok: false, error: 'Server error while saving planned date.' }, 500);
    }
}