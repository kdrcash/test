const http = require('http');
const path = require('path');
const fs = require('fs/promises');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const DATA_FILE = path.join(__dirname, 'data', 'listings.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, '[]', 'utf-8');
  }
}

async function readListings() {
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  if (!raw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('Failed to parse listings file:', error);
    return [];
  }
}

async function writeListings(listings) {
  await fs.writeFile(DATA_FILE, JSON.stringify(listings, null, 2), 'utf-8');
}

function buildHeaders(additional = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    ...additional
  };
}

function sendJson(res, statusCode, payload) {
  const body = payload === undefined ? '' : JSON.stringify(payload);
  const headers = buildHeaders({ 'Content-Type': 'application/json; charset=utf-8' });
  res.writeHead(statusCode, headers);
  res.end(body);
}

function sendText(res, statusCode, text, contentType) {
  const headers = buildHeaders({ 'Content-Type': contentType });
  res.writeHead(statusCode, headers);
  res.end(text);
}

function sendFile(res, statusCode, buffer, contentType) {
  const headers = buildHeaders({ 'Content-Type': contentType });
  res.writeHead(statusCode, headers);
  res.end(buffer);
}

function isAdminAuthorized(req) {
  const provided = req.headers['x-admin-password'];
  return provided && provided === ADMIN_PASSWORD;
}

function validateListing(payload) {
  const errors = [];
  const requiredFields = ['title', 'location', 'category', 'price', 'description'];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['body'] };
  }

  const sanitized = {};

  requiredFields.forEach((field) => {
    const value = payload[field];
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(field);
    } else {
      sanitized[field] = value.trim();
    }
  });

  const highlights = Array.isArray(payload.highlights)
    ? payload.highlights
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean)
    : [];

  sanitized.highlights = highlights;

  return { valid: errors.length === 0, errors, sanitized };
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        reject(new Error('Payload too large'));
        req.connection.destroy();
      }
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', (error) => reject(error));
  });
}

async function handleGetListings(req, res) {
  if (req.headers['x-admin-password'] && !isAdminAuthorized(req)) {
    sendJson(res, 401, { error: 'Invalid administrator password' });
    return;
  }

  const listings = await readListings();
  sendJson(res, 200, listings);
}

async function handleCreateListing(req, res) {
  if (!isAdminAuthorized(req)) {
    sendJson(res, 401, { error: 'Administrator authentication required' });
    return;
  }

  let payload;
  try {
    payload = await parseBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const { valid, errors, sanitized } = validateListing(payload);
  if (!valid) {
    sendJson(res, 400, { error: 'Missing or invalid fields', fields: errors });
    return;
  }

  const listings = await readListings();
  const newListing = {
    id: Date.now().toString(36),
    ...sanitized,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  listings.push(newListing);
  await writeListings(listings);
  sendJson(res, 201, newListing);
}

async function handleUpdateListing(req, res, id) {
  if (!isAdminAuthorized(req)) {
    sendJson(res, 401, { error: 'Administrator authentication required' });
    return;
  }

  let payload;
  try {
    payload = await parseBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const { valid, errors, sanitized } = validateListing(payload);
  if (!valid) {
    sendJson(res, 400, { error: 'Missing or invalid fields', fields: errors });
    return;
  }

  const listings = await readListings();
  const index = listings.findIndex((item) => item.id === id);

  if (index === -1) {
    sendJson(res, 404, { error: 'Listing not found' });
    return;
  }

  const updatedListing = {
    ...listings[index],
    ...sanitized,
    updatedAt: new Date().toISOString()
  };

  listings[index] = updatedListing;
  await writeListings(listings);
  sendJson(res, 200, updatedListing);
}

async function handleDeleteListing(req, res, id) {
  if (!isAdminAuthorized(req)) {
    sendJson(res, 401, { error: 'Administrator authentication required' });
    return;
  }

  const listings = await readListings();
  const index = listings.findIndex((item) => item.id === id);
  if (index === -1) {
    sendJson(res, 404, { error: 'Listing not found' });
    return;
  }

  const [removed] = listings.splice(index, 1);
  await writeListings(listings);
  sendJson(res, 200, removed);
}

async function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const headers = buildHeaders();
    res.writeHead(204, headers);
    res.end();
    return true;
  }

  if (pathname === '/api/listings' && req.method === 'GET') {
    await handleGetListings(req, res);
    return true;
  }

  if (pathname === '/api/listings' && req.method === 'POST') {
    await handleCreateListing(req, res);
    return true;
  }

  if (pathname.startsWith('/api/listings/')) {
    const id = pathname.split('/')[3];
    if (!id) {
      sendJson(res, 400, { error: 'Listing identifier missing' });
      return true;
    }

    if (req.method === 'PUT') {
      await handleUpdateListing(req, res, id);
      return true;
    }

    if (req.method === 'DELETE') {
      await handleDeleteListing(req, res, id);
      return true;
    }
  }

  return false;
}

async function serveStaticFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let { pathname } = url;

  if (pathname === '/') {
    pathname = '/index.html';
  }

  if (pathname === '/admin') {
    pathname = '/admin.html';
  }

  const allowedRoots = ['/index.html', '/admin.html'];
  const isAsset = pathname.startsWith('/assets/');

  if (!isAsset && !allowedRoots.includes(pathname)) {
    return false;
  }

  const filePath = path.join(__dirname, pathname.replace(/^\/+/, ''));

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    sendFile(res, 200, data, contentType);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendText(res, 404, 'Not Found', 'text/plain; charset=utf-8');
      return true;
    }

    console.error('Error serving static file:', error);
    sendText(res, 500, 'Internal Server Error', 'text/plain; charset=utf-8');
    return true;
  }
}

async function requestHandler(req, res) {
  try {
    if (await handleApiRequest(req, res)) {
      return;
    }

    if (await serveStaticFile(req, res)) {
      return;
    }

    sendText(res, 404, 'Not Found', 'text/plain; charset=utf-8');
  } catch (error) {
    console.error('Unexpected server error:', error);
    sendText(res, 500, 'Internal Server Error', 'text/plain; charset=utf-8');
  }
}

async function start() {
  await ensureDataFile();
  const server = http.createServer((req, res) => {
    requestHandler(req, res);
  });

  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
