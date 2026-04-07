const { execFile } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const { promisify } = require('util');

const { startServer, stopServer, getServerUrl } = require('../helpers/startServer');
const { startTestSite, stopTestSite, getTestSiteUrl } = require('../helpers/testSite');

const execFileAsync = promisify(execFile);

async function postJson(serverUrl, path, body) {
  const res = await fetch(`${serverUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.CAMOFOX_API_KEY ? { Authorization: `Bearer ${process.env.CAMOFOX_API_KEY}` } : {}),
    },
    body: JSON.stringify(body),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { res, data };
}

async function deleteSession(serverUrl, userId) {
  const res = await fetch(`${serverUrl}/sessions/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: process.env.CAMOFOX_API_KEY ? { Authorization: `Bearer ${process.env.CAMOFOX_API_KEY}` } : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { res, data };
}

describe('Session invariants', () => {
  let serverUrl;
  let testSiteUrl;
  const cleanupUsers = new Set();

  function trackUser(prefix) {
    const userId = `${prefix}-${crypto.randomUUID()}`;
    cleanupUsers.add(userId);
    return userId;
  }

  beforeAll(async () => {
    await startServer(0, { CAMOFOX_MAX_SESSIONS: '1', CAMOFOX_API_KEY: '' });
    serverUrl = getServerUrl();
    await startTestSite();
    testSiteUrl = getTestSiteUrl();
  }, 120000);

  afterEach(async () => {
    for (const userId of cleanupUsers) {
      await deleteSession(serverUrl, userId).catch(() => {});
    }
    cleanupUsers.clear();
  });

  afterAll(async () => {
    await stopTestSite();
    await stopServer();
  }, 30000);

  test('reuses canonical profile when the request omits overrides', async () => {
    const userId = trackUser('reuse');

    const established = await postJson(serverUrl, '/tabs', {
      userId,
      sessionKey: 'default',
      url: `${testSiteUrl}/pageA`,
      preset: 'us-east',
    });
    expect(established.res.status).toBe(200);

    const reused = await postJson(serverUrl, '/tabs', {
      userId,
      sessionKey: 'secondary',
      url: `${testSiteUrl}/pageB`,
    });
    expect(reused.res.status).toBe(200);
    expect(reused.data.tabId).toBeDefined();
  });

  test('compares canonical equality using resolved overrides after preset expansion', async () => {
    const userId = trackUser('equivalent');

    const established = await postJson(serverUrl, '/tabs', {
      userId,
      sessionKey: 'default',
      url: `${testSiteUrl}/pageA`,
      preset: 'us-east',
    });
    expect(established.res.status).toBe(200);

    const equivalent = await postJson(serverUrl, '/tabs', {
      userId,
      sessionKey: 'equivalent',
      url: `${testSiteUrl}/pageB`,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      geolocation: { latitude: 40.7128, longitude: -74.006 },
    });
    expect(equivalent.res.status).toBe(200);

    const conflict = await postJson(serverUrl, '/tabs', {
      userId,
      sessionKey: 'conflict',
      url: `${testSiteUrl}/pageA`,
      preset: 'germany',
    });
    expect(conflict.res.status).toBe(409);
    expect(conflict.data.error).toBe('Context override conflict');
  });

  test('passive eviction preserves the canonical profile and reuses stored overrides on rebuild', async () => {
    const scriptPath = path.join(__dirname, '../helpers/passiveSessionInvariantCheck.js');
    const result = await execFileAsync(process.execPath, [scriptPath], {
      cwd: path.join(__dirname, '../..'),
      env: process.env,
      timeout: 120000,
    });

    expect(result.stdout).toContain('PASS passive-session-invariant');
  }, 120000);

  test('openclaw first use requires an established canonical profile', async () => {
    const userId = trackUser('openclaw-first');

    const response = await postJson(serverUrl, '/tabs/open', {
      userId,
      url: `${testSiteUrl}/pageA`,
    });
    expect(response.res.status).toBe(409);
    expect(response.data.error).toBe('No canonical profile');
  });

  test('openclaw reuses an existing canonical profile', async () => {
    const userId = trackUser('openclaw-reuse');

    const established = await postJson(serverUrl, '/tabs', {
      userId,
      sessionKey: 'default',
      url: `${testSiteUrl}/pageA`,
    });
    expect(established.res.status).toBe(200);

    const response = await postJson(serverUrl, '/tabs/open', {
      userId,
      url: `${testSiteUrl}/pageB`,
    });
    expect(response.res.status).toBe(200);
    expect(response.data.targetId || response.data.tabId).toBeDefined();
  });

  test('cookie import without tabId remains non-creating and returns 409 without a canonical profile', async () => {
    const userId = trackUser('cookies');

    const response = await postJson(serverUrl, `/sessions/${encodeURIComponent(userId)}/cookies`, {
      cookies: [{ name: 'session', value: '1', domain: '.example.com' }],
    });
    expect(response.res.status).toBe(409);
    expect(response.data.error).toBe('No canonical profile');
  });

  test('failed first tab create does not leave stale canonical profile', async () => {
    const userId = trackUser('fail-create');

    const failed = await postJson(serverUrl, '/tabs', {
      userId,
      sessionKey: 'default',
      url: 'chrome://invalid-url',
      preset: 'us-east',
    });
    expect(failed.res.status).toBeGreaterThanOrEqual(400);

    const openclaw = await postJson(serverUrl, '/tabs/open', {
      userId,
      url: `${testSiteUrl}/pageA`,
    });
    expect(openclaw.res.status).toBe(409);
    expect(openclaw.data.error).toBe('No canonical profile');

    const cookie = await postJson(serverUrl, `/sessions/${encodeURIComponent(userId)}/cookies`, {
      cookies: [{ name: 'session', value: '1', domain: '.example.com' }],
    });
    expect(cookie.res.status).toBe(409);
    expect(cookie.data.error).toBe('No canonical profile');
  });

  test('runtime failure during first tab create rolls back canonical profile', async () => {
    const userId = trackUser('rollback');

    // Use a URL that passes validation (http scheme) but fails at navigation
    const failed = await postJson(serverUrl, '/tabs', {
      userId,
      sessionKey: 'default',
      url: 'http://localhost:1/',
      preset: 'us-east',
    });
    expect(failed.res.status).toBe(500);

    // Canonical must have been rolled back
    const openclaw = await postJson(serverUrl, '/tabs/open', {
      userId,
      url: testSiteUrl + '/pageA',
    });
    expect(openclaw.res.status).toBe(409);
    expect(openclaw.data.error).toBe('No canonical profile');

    const cookie = await postJson(serverUrl, `/sessions/${encodeURIComponent(userId)}/cookies`, {
      cookies: [{ name: 'session', value: '1', domain: '.example.com' }],
    });
    expect(cookie.res.status).toBe(409);
    expect(cookie.data.error).toBe('No canonical profile');
  }, 30000);

  test('concurrent first-create: failing request does not corrupt canonical state', async () => {
    const userId = trackUser('concurrent');

    const responseA = postJson(serverUrl, '/tabs', {
      userId,
      sessionKey: 'a',
      url: 'http://localhost:1/',
      preset: 'us-east',
    });

    await new Promise(r => setTimeout(r, 50));
    const responseB = postJson(serverUrl, '/tabs', {
      userId,
      sessionKey: 'b',
      url: `${testSiteUrl}/pageA`,
      preset: 'us-east',
    });

    const [a, b] = await Promise.all([responseA, responseB]);

    expect(a.res.status).toBeGreaterThanOrEqual(400);

    expect(b.res.status).toBe(200);
    expect(b.data.tabId).toBeDefined();

    const reuse = await postJson(serverUrl, '/tabs', {
      userId,
      sessionKey: 'c',
      url: `${testSiteUrl}/pageB`,
    });
    expect(reuse.res.status).toBe(200);
    expect(reuse.data.tabId).toBeDefined();
  }, 60000);

  test('enforces per-user tab cap under canonical profile contract', async () => {
    const userId = trackUser('tab-cap');

    const first = await postJson(serverUrl, '/tabs', {
      userId,
      sessionKey: 'default',
      url: `${testSiteUrl}/pageA`,
    });
    expect(first.res.status).toBe(200);

    let lastStatus = 200;
    let tabCount = 1;
    const tabIds = [first.data.tabId];
    while (lastStatus === 200 && tabCount < 100) {
      const resp = await postJson(serverUrl, '/tabs', {
        userId,
        sessionKey: `cap-${tabCount}`,
        url: `${testSiteUrl}/pageA`,
      });
      lastStatus = resp.res.status;
      if (lastStatus === 200) {
        tabCount++;
        tabIds.push(resp.data.tabId);
      } else {
        expect(lastStatus).toBe(429);
        expect(resp.data.error).toMatch(/maximum tabs/i);
      }
    }

    expect(lastStatus).toBe(429);
    expect(tabCount).toBeGreaterThanOrEqual(2);
    expect(tabIds.length).toBe(tabCount);
  });

  test('explicit session close clears the canonical profile', async () => {
    const userId = trackUser('close');

    const established = await postJson(serverUrl, '/tabs', {
      userId,
      sessionKey: 'default',
      url: `${testSiteUrl}/pageA`,
    });
    expect(established.res.status).toBe(200);

    const closed = await deleteSession(serverUrl, userId);
    expect(closed.res.status).toBe(200);

    const openclawResponse = await postJson(serverUrl, '/tabs/open', {
      userId,
      url: `${testSiteUrl}/pageA`,
    });
    expect(openclawResponse.res.status).toBe(409);
    expect(openclawResponse.data.error).toBe('No canonical profile');

    const cookieResponse = await postJson(serverUrl, `/sessions/${encodeURIComponent(userId)}/cookies`, {
      cookies: [{ name: 'session', value: '1', domain: '.example.com' }],
    });
    expect(cookieResponse.res.status).toBe(409);
    expect(cookieResponse.data.error).toBe('No canonical profile');
  });
});