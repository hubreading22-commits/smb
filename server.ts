import express from 'express';
import path from 'path';
import net from 'net';
import { promisify } from 'util';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import SMB2 from '@marsaud/smb2';

const app = express();
const PORT = 3000;

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

// --- NETWORK HELPER: CHECK IF REAL SMB HOST IS ONLINE ---
function checkSMBOnline(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1200); // Quick check
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(445, '192.168.1.50');
  });
}

// --- SMB CLIENT GENERATOR ---
function getSMB2Client(username: string, password?: string, shareName: string = 'Public') {
  if (!SMB2) {
    throw new Error('SMB2 module is not loaded or not supported on this platform.');
  }

  // Parse DOMAIN\username
  let domain = 'digihub';
  let shortUser = username;
  if (username.includes('\\')) {
    const parts = username.split('\\');
    domain = parts[0];
    shortUser = parts[1];
  }

  return new SMB2({
    share: `\\\\192.168.1.50\\${shareName}`,
    username: shortUser,
    password: password || '',
    domain: domain,
    autoCloseTimeout: 15000
  });
}

// --- SMB PATH PARSER ---
function parseSMBPath(fullPath: string): { shareName: string; innerPath: string } {
  if (!fullPath) {
    return { shareName: '', innerPath: '' };
  }

  // Remove leading / or \ if any
  const cleanPath = fullPath.replace(/^[/\\]+/, '');

  // Split by first slash to get the share name
  const firstSlashIndex = cleanPath.indexOf('/');
  if (firstSlashIndex === -1) {
    return { shareName: cleanPath, innerPath: '' };
  }

  const shareName = cleanPath.substring(0, firstSlashIndex);
  const innerPath = cleanPath.substring(firstSlashIndex + 1);
  return { shareName, innerPath };
}

// --- RECURSIVE SCANNERS ---
async function getFilesForShareRecursively(client: any, shareName: string, subDir: string = ''): Promise<any[]> {
  let results: any[] = [];
  try {
    const list = await promisify(client.readdir.bind(client))(subDir, { stats: true });
    for (const file of list) {
      const relativePathInShare = subDir ? `${subDir}/${file.name}` : file.name;
      const fullPath = `${shareName}/${relativePathInShare}`;
      const isDir = typeof file.isDirectory === 'function' ? file.isDirectory() : file.isDirectory;

      let content = '';
      if (!isDir && file.size < 500000) {
        // Read small text files for direct viewer usage
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const textExts = ['txt', 'csv', 'json', 'ini', 'ps1', 'md'];
        if (textExts.includes(ext)) {
          try {
            content = await promisify(client.readFile.bind(client))(relativePathInShare, { encoding: 'utf8' });
          } catch (_) {}
        }
      }

      results.push({
        id: Buffer.from(fullPath).toString('base64'),
        name: file.name,
        path: fullPath,
        type: isDir ? 'folder' : 'file',
        size: file.size || 0,
        updatedAt: file.mtime ? new Date(file.mtime).toISOString() : new Date().toISOString(),
        extension: isDir ? undefined : file.name.split('.').pop() || 'dat',
        owner: isDir ? 'digihub\\administrator' : 'digihub\\847',
        content: content,
        permissions: { canRead: true, canWrite: true, canDelete: true, canRename: true }
      });

      if (isDir) {
        const subFiles = await getFilesForShareRecursively(client, shareName, relativePathInShare);
        results = results.concat(subFiles);
      }
    }
  } catch (err: any) {
    console.warn(`[SMB] Failed to read path "${subDir}" in share "${shareName}":`, err.message);
  }
  return results;
}

// --- API ENDPOINTS ---

// Check server connectivity status
app.get('/api/status', async (req, res) => {
  const isOnline = await checkSMBOnline();
  res.json({
    online: true, // Express api is running
    smbConnected: isOnline,
    mode: isOnline ? 'smb' : 'offline',
    details: isOnline 
      ? 'Active TrueNAS SMB Negotiation on port 445'
      : 'TrueNAS server at 192.168.1.50 is currently unavailable'
  });
});

// Perform session login authentication directly with TrueNAS & Active Directory
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Validate format DOMAIN\username
  const domainRegex = /^[a-zA-Z0-9._-]+\\[a-zA-Z0-9._-]+$/;
  if (!domainRegex.test(username)) {
    return res.status(400).json({ error: 'Invalid username format. Must be DOMAIN\\username (e.g., digihub\\847)' });
  }

  const parts = username.split('\\');
  const domain = parts[0];
  const shortUsername = parts[1];

  let role: 'admin' | 'employee' | 'guest' = 'employee';
  const normUser = shortUsername.toLowerCase();
  
  if (normUser === 'john' || normUser === 'admin' || normUser === 'administrator') {
    role = 'admin';
  } else if (normUser === 'guest' || normUser === 'visitor') {
    role = 'guest';
  }

  // Try to authenticate directly with TrueNAS (by connecting to the Public share)
  try {
    const client = new SMB2({
      share: '\\\\192.168.1.50\\Public',
      username: shortUsername,
      password: password,
      domain: domain,
      autoCloseTimeout: 3000
    });
    
    // Test directory access
    await promisify(client.readdir.bind(client))('');
    client.disconnect();
  } catch (err: any) {
    return res.status(401).json({ 
      error: `TrueNAS Active Directory authentication failed: ${err.message || 'Connection refused'}` 
    });
  }

  res.json({
    username,
    domain,
    shortUsername,
    role,
    loginTime: new Date().toISOString()
  });
});

// List Files for current user session from TrueNAS shares
app.get('/api/files', async (req, res) => {
  const username = (req.headers['x-username'] as string);
  const password = (req.headers['x-password'] as string);

  if (!username) {
    return res.status(400).json({ error: 'Session credentials missing.' });
  }

  const shares = ['Public', 'students_backup'];
  let allFiles: any[] = [];
  let successfulConnections = 0;
  let connectionErrors: string[] = [];

  // Add root folders for visual browsing in the explorer
  allFiles.push({
    id: Buffer.from('Public').toString('base64'),
    name: 'Public',
    path: 'Public',
    type: 'folder',
    size: 0,
    updatedAt: new Date().toISOString(),
    owner: 'digihub\\administrator',
    permissions: { canRead: true, canWrite: true, canDelete: false, canRename: false }
  });

  allFiles.push({
    id: Buffer.from('students_backup').toString('base64'),
    name: 'students_backup',
    path: 'students_backup',
    type: 'folder',
    size: 0,
    updatedAt: new Date().toISOString(),
    owner: 'digihub\\administrator',
    permissions: { canRead: true, canWrite: true, canDelete: false, canRename: false }
  });

  for (const share of shares) {
    try {
      const client = getSMB2Client(username, password, share);
      const files = await getFilesForShareRecursively(client, share);
      allFiles = allFiles.concat(files);
      successfulConnections++;
      client.disconnect();
    } catch (err: any) {
      connectionErrors.push(`${share}: ${err.message}`);
    }
  }

  if (successfulConnections === 0 && connectionErrors.length > 0) {
    return res.status(503).json({ 
      error: `TrueNAS SMB unavailable. Details:\n${connectionErrors.join('\n')}` 
    });
  }

  res.json(allFiles);
});

// Create folder directly on TrueNAS
app.post('/api/files/create-folder', async (req, res) => {
  const { path: relativePath } = req.body;
  const username = (req.headers['x-username'] as string);
  const password = (req.headers['x-password'] as string);

  if (!relativePath) {
    return res.status(400).json({ error: 'Folder path is required.' });
  }

  const { shareName, innerPath } = parseSMBPath(relativePath);
  if (!shareName) {
    return res.status(400).json({ error: 'Invalid share name.' });
  }

  try {
    const client = getSMB2Client(username, password, shareName);
    await promisify(client.mkdir.bind(client))(innerPath);
    client.disconnect();
    res.json({ status: 'success', message: 'Folder created successfully on TrueNAS.' });
  } catch (err: any) {
    res.status(500).json({ error: `TrueNAS folder creation failed: ${err.message}` });
  }
});

// Rename file or folder directly on TrueNAS
app.post('/api/files/rename', async (req, res) => {
  const { oldPath, newPath } = req.body;
  const username = (req.headers['x-username'] as string);
  const password = (req.headers['x-password'] as string);

  if (!oldPath || !newPath) {
    return res.status(400).json({ error: 'Both oldPath and newPath are required.' });
  }

  const oldParsed = parseSMBPath(oldPath);
  const newParsed = parseSMBPath(newPath);

  if (oldParsed.shareName !== newParsed.shareName) {
    return res.status(400).json({ error: 'Renaming across different shares is not supported.' });
  }

  try {
    const client = getSMB2Client(username, password, oldParsed.shareName);
    await promisify(client.rename.bind(client))(oldParsed.innerPath, newParsed.innerPath);
    client.disconnect();
    res.json({ status: 'success', message: 'Item renamed successfully on TrueNAS.' });
  } catch (err: any) {
    res.status(500).json({ error: `TrueNAS rename failed: ${err.message}` });
  }
});

// Delete file or folder directly on TrueNAS
app.post('/api/files/delete', async (req, res) => {
  const { path: relativePath, isDirectory } = req.body;
  const username = (req.headers['x-username'] as string);
  const password = (req.headers['x-password'] as string);

  if (!relativePath) {
    return res.status(400).json({ error: 'Path to delete is required.' });
  }

  const { shareName, innerPath } = parseSMBPath(relativePath);

  try {
    const client = getSMB2Client(username, password, shareName);
    if (isDirectory) {
      await promisify(client.rmdir.bind(client))(innerPath);
    } else {
      await promisify(client.unlink.bind(client))(innerPath);
    }
    client.disconnect();
    res.json({ status: 'success', message: 'Item deleted successfully on TrueNAS.' });
  } catch (err: any) {
    res.status(500).json({ error: `TrueNAS delete failed: ${err.message}` });
  }
});

// Upload file directly to TrueNAS
app.post('/api/files/upload', upload.single('file'), async (req, res) => {
  const relativeDir = req.body.path || '';
  const username = (req.headers['x-username'] as string);
  const password = (req.headers['x-password'] as string);

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { shareName, innerPath } = parseSMBPath(relativeDir);
  if (!shareName) {
    return res.status(400).json({ error: 'Cannot upload files to the root level.' });
  }

  const fileName = req.file.originalname;
  const destFilePath = innerPath ? `${innerPath}/${fileName}` : fileName;

  try {
    const client = getSMB2Client(username, password, shareName);
    await promisify(client.writeFile.bind(client))(destFilePath, req.file.buffer);
    client.disconnect();
    res.json({ status: 'success', message: 'File written successfully on TrueNAS.' });
  } catch (err: any) {
    res.status(500).json({ error: `TrueNAS upload failed: ${err.message}` });
  }
});

// Download file directly from TrueNAS
app.get('/api/files/download', async (req, res) => {
  const relativePath = req.query.path as string;
  const username = (req.headers['x-username'] as string);
  const password = (req.headers['x-password'] as string);

  if (!relativePath) {
    return res.status(400).json({ error: 'Path parameter is required.' });
  }

  const { shareName, innerPath } = parseSMBPath(relativePath);

  try {
    const client = getSMB2Client(username, password, shareName);
    const data = await promisify(client.readFile.bind(client))(innerPath);
    client.disconnect();

    const fileName = path.basename(innerPath);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(data);
  } catch (err: any) {
    res.status(500).json({ error: `TrueNAS download failed: ${err.message}` });
  }
});

// --- VITE DEV / PRODUCTION ENGINE ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
