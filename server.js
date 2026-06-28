import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';
import SMB2 from 'smb2';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const API_PORT = process.env.API_PORT ? Number(process.env.API_PORT) : 4000;
const SMB_HOST = process.env.SMB_HOST || '192.168.1.50';
const SMB_PORT = process.env.SMB_PORT ? Number(process.env.SMB_PORT) : 445;
const SMB_SHARES = (process.env.SMB_SHARES || 'Public_Share,Finance_Reports,IT_Infrastructure,digihub_847_shared')
  .split(',')
  .map((share) => share.trim())
  .filter(Boolean);

const sessions = new Map();

const createSmbClient = ({ username, password, domain }, share) => {
  return new SMB2({
    share: `\\\\${SMB_HOST}\\${share}`,
    domain,
    username,
    password,
    port: SMB_PORT,
    autoCloseTimeout: 30000,
  });
};

const parseDomainUsername = (rawUsername) => {
  const parts = rawUsername.split('\\');
  if (parts.length === 2) {
    return { domain: parts[0], username: parts[1] };
  }
  return { domain: process.env.SMB_DOMAIN || 'WORKGROUP', username: rawUsername };
};

const authenticateRequest = (req, res, next) => {
  const authHeader = req.header('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Missing or invalid auth token.' });
  }
  req.sessionData = sessions.get(token);
  next();
};

const readDirectory = (client, path) => {
  return new Promise((resolve, reject) => {
    client.readdir(path || '', (err, files) => {
      if (err) return reject(err);
      resolve(files || []);
    });
  });
};

const readStat = (client, path) => {
  return new Promise((resolve, reject) => {
    client.stat(path, (err, stats) => {
      if (err) return reject(err);
      resolve(stats);
    });
  });
};

const readFile = (client, path) => {
  return new Promise((resolve, reject) => {
    client.readFile(path, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
};

const validateTextPreview = (name) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ['txt', 'json', 'csv', 'ini', 'ps1', 'log', 'md'].includes(ext);
};

app.use(cors());
app.use(express.json());

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const { domain, username: user } = parseDomainUsername(username);
  const credentials = { username: user, password, domain };

  const testShare = SMB_SHARES[0];
  if (!testShare) {
    return res.status(500).json({ error: 'No SMB shares configured on the server.' });
  }

  const client = createSmbClient(credentials, testShare);
  try {
    await readDirectory(client, '');
  } catch (error) {
    return res.status(401).json({ error: 'Unable to authenticate or connect to SMB server with provided credentials.' });
  } finally {
    client.close();
  }

  const token = crypto.randomBytes(24).toString('hex');
  const normalized = user.toLowerCase();
  const role = normalized === 'john' || normalized === 'admin' || normalized === 'administrator' ? 'admin'
    : normalized === 'guest' || normalized === 'visitor' ? 'guest'
    : 'employee';

  sessions.set(token, { username: user, domain, role, rawUsername: username, credentials });
  return res.json({ token, username: username, role, shortUsername: user, domain });
});

app.get('/api/shares', authenticateRequest, (req, res) => {
  const shares = SMB_SHARES.map((share, idx) => ({
    id: `${idx + 1}`,
    name: share,
    path: share,
    type: 'folder',
    size: 0,
    updatedAt: new Date().toISOString(),
    owner: req.sessionData.rawUsername,
    permissions: { canRead: true, canWrite: true, canDelete: true, canRename: true },
  }));
  res.json(shares);
});

app.get('/api/share/:share/contents', authenticateRequest, async (req, res) => {
  const share = req.params.share;
  const requestedPath = req.query.path ? String(req.query.path) : '';
  if (!SMB_SHARES.includes(share)) {
    return res.status(404).json({ error: 'Share not configured.' });
  }

  const client = createSmbClient(req.sessionData.credentials, share);
  try {
    const names = await readDirectory(client, requestedPath);
    const items = await Promise.all(names.map(async (name) => {
      if (name === '.' || name === '..') return null;
      const targetPath = requestedPath ? `${requestedPath}\\${name}` : name;
      const stats = await readStat(client, targetPath);
      const isDirectory = stats.isDirectory();
      const item = {
        id: crypto.createHash('md5').update(`${share}:${targetPath}`).digest('hex'),
        name,
        path: targetPath.replace(/\\\\/g, '/'),
        type: isDirectory ? 'folder' : 'file',
        size: stats.size || 0,
        updatedAt: stats.mtime ? stats.mtime.toISOString() : new Date().toISOString(),
        owner: req.sessionData.rawUsername,
        permissions: {
          canRead: true,
          canWrite: true,
          canDelete: true,
          canRename: true,
        },
        content: undefined,
      };

      if (!isDirectory && validateTextPreview(name) && stats.size < 150 * 1024) {
        try {
          const data = await readFile(client, targetPath);
          item.content = data.toString('utf8');
        } catch (ignored) {
          item.content = undefined;
        }
      }

      return item;
    }));

    res.json(items.filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: `Unable to list contents: ${error.message}` });
  } finally {
    client.close();
  }
});

app.post('/api/share/:share/folder', authenticateRequest, async (req, res) => {
  const share = req.params.share;
  const { path = '' } = req.body;
  const folderName = req.body.folderName;
  if (!folderName) {
    return res.status(400).json({ error: 'folderName is required.' });
  }
  if (!SMB_SHARES.includes(share)) {
    return res.status(404).json({ error: 'Share not configured.' });
  }

  const target = path ? `${path}\\${folderName}` : folderName;
  const client = createSmbClient(req.sessionData.credentials, share);
  try {
    await new Promise((resolve, reject) => {
      client.mkdir(target, (err) => (err ? reject(err) : resolve()));
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: `Unable to create folder: ${error.message}` });
  } finally {
    client.close();
  }
});

app.post('/api/share/:share/upload', authenticateRequest, upload.single('file'), async (req, res) => {
  const share = req.params.share;
  const path = req.query.path ? String(req.query.path) : '';
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'A file must be uploaded in field "file".' });
  }
  if (!SMB_SHARES.includes(share)) {
    return res.status(404).json({ error: 'Share not configured.' });
  }

  const target = path ? `${path}\\${file.originalname}` : file.originalname;
  const client = createSmbClient(req.sessionData.credentials, share);
  try {
    await new Promise((resolve, reject) => {
      client.writeFile(target, file.buffer, (err) => (err ? reject(err) : resolve()));
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: `Unable to upload file: ${error.message}` });
  } finally {
    client.close();
  }
});

app.post('/api/share/:share/rename', authenticateRequest, async (req, res) => {
  const share = req.params.share;
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) {
    return res.status(400).json({ error: 'oldPath and newPath are required.' });
  }
  if (!SMB_SHARES.includes(share)) {
    return res.status(404).json({ error: 'Share not configured.' });
  }

  const client = createSmbClient(req.sessionData.credentials, share);
  try {
    await new Promise((resolve, reject) => {
      client.rename(oldPath.replace(/\//g, '\\'), newPath.replace(/\//g, '\\'), (err) => (err ? reject(err) : resolve()));
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: `Unable to rename item: ${error.message}` });
  } finally {
    client.close();
  }
});

app.delete('/api/share/:share/item', authenticateRequest, async (req, res) => {
  const share = req.params.share;
  const { path = '' } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'path query parameter is required.' });
  }
  if (!SMB_SHARES.includes(share)) {
    return res.status(404).json({ error: 'Share not configured.' });
  }

  const target = String(path);
  const client = createSmbClient(req.sessionData.credentials, share);
  try {
    await new Promise((resolve, reject) => {
      client.stat(target, (err, stats) => {
        if (err) return reject(err);
        const action = stats.isDirectory() ? client.rmdir.bind(client) : client.unlink.bind(client);
        action(target, (removeErr) => (removeErr ? reject(removeErr) : resolve()));
      });
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: `Unable to delete item: ${error.message}` });
  } finally {
    client.close();
  }
});

app.get('/api/share/:share/download', authenticateRequest, async (req, res) => {
  const share = req.params.share;
  const path = req.query.path ? String(req.query.path) : '';
  if (!path) {
    return res.status(400).json({ error: 'path query parameter is required.' });
  }
  if (!SMB_SHARES.includes(share)) {
    return res.status(404).json({ error: 'Share not configured.' });
  }

  const client = createSmbClient(req.sessionData.credentials, share);
  try {
    const fileBuffer = await readFile(client, path);
    res.setHeader('Content-Disposition', `attachment; filename="${path.split(/\\|\//).pop()}"`);
    res.send(fileBuffer);
  } catch (error) {
    res.status(500).json({ error: `Unable to download file: ${error.message}` });
  } finally {
    client.close();
  }
});

app.listen(API_PORT, () => {
  console.log(`SMB proxy server running on http://localhost:${API_PORT}`);
});
