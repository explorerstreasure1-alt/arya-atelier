import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN ortam değişkeni tanımlanmamış.' });
    }

    // Parse multipart form data manually
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || '';

    // Extract boundary
    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'Geçersiz form verisi: boundary bulunamadı.' });
    }
    const boundary = boundaryMatch[1];

    // Parse multipart body
    const parts = parseMultipart(buffer, boundary);
    const filePart = parts.find(p => p.name === 'file');

    if (!filePart) {
      return res.status(400).json({ error: 'Dosya bulunamadı.' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(filePart.contentType)) {
      return res.status(400).json({ error: 'Desteklenmeyen dosya türü. Yalnızca JPG, PNG, WEBP, GIF.' });
    }

    // Validate file size (8MB max)
    if (filePart.data.length > 8 * 1024 * 1024) {
      return res.status(400).json({ error: 'Dosya boyutu 8 MB\'ı aşıyor.' });
    }

    // Generate unique filename
    const ext = filePart.contentType.split('/')[1].replace('jpeg', 'jpg');
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = `arya/hizmetler/${timestamp}-${random}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(filename, filePart.data, {
      access: 'public',
      token,
      contentType: filePart.contentType,
      addRandomSuffix: false,
    });

    return res.status(200).json({
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      pathname: blob.pathname,
      size: filePart.data.length,
    });

  } catch (err) {
    console.error('[ARYA Upload Error]', err);
    return res.status(500).json({
      error: 'Yükleme sırasında hata oluştu: ' + (err.message || 'Bilinmeyen hata'),
    });
  }
}

/**
 * Minimal multipart/form-data parser
 */
function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuf = Buffer.from('--' + boundary);
  const CRLF = Buffer.from('\r\n');
  const CRLFCRLF = Buffer.from('\r\n\r\n');

  let pos = 0;

  while (pos < buffer.length) {
    // Find boundary
    const boundaryIdx = bufIndexOf(buffer, boundaryBuf, pos);
    if (boundaryIdx === -1) break;

    pos = boundaryIdx + boundaryBuf.length;

    // Check for final boundary (--)
    if (buffer[pos] === 0x2D && buffer[pos + 1] === 0x2D) break;

    // Skip CRLF after boundary
    if (buffer[pos] === 0x0D && buffer[pos + 1] === 0x0A) pos += 2;

    // Find end of headers
    const headerEndIdx = bufIndexOf(buffer, CRLFCRLF, pos);
    if (headerEndIdx === -1) break;

    const headerSection = buffer.slice(pos, headerEndIdx).toString('utf8');
    pos = headerEndIdx + 4;

    // Find next boundary
    const nextBoundary = bufIndexOf(buffer, Buffer.from('\r\n--' + boundary), pos);
    const dataEnd = nextBoundary !== -1 ? nextBoundary : buffer.length;
    const data = buffer.slice(pos, dataEnd);

    // Parse headers
    const headers = {};
    headerSection.split('\r\n').forEach(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        const key = line.slice(0, colonIdx).trim().toLowerCase();
        const value = line.slice(colonIdx + 1).trim();
        headers[key] = value;
      }
    });

    // Extract name and filename from Content-Disposition
    const disposition = headers['content-disposition'] || '';
    const nameMatch = disposition.match(/name="([^"]+)"/);
    const filenameMatch = disposition.match(/filename="([^"]+)"/);
    const contentType = headers['content-type'] || 'application/octet-stream';

    parts.push({
      name: nameMatch ? nameMatch[1] : '',
      filename: filenameMatch ? filenameMatch[1] : '',
      contentType,
      data,
    });

    pos = dataEnd;
  }

  return parts;
}

function bufIndexOf(haystack, needle, start = 0) {
  for (let i = start; i <= haystack.length - needle.length; i++) {
    let found = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
}
