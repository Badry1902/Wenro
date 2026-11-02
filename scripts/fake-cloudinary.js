// Test double for Cloudinary's upload and destroy APIs (signature rules as documented by Cloudinary).
// Usage: CLOUDINARY_API_SECRET=... node scripts/fake-cloudinary.js 4000 /tmp/cloudinary.jsonl
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const [port, log] = [Number(process.argv[2] || 4000), process.argv[3] || '/tmp/cloudinary.jsonl'];
const secret = process.env.CLOUDINARY_API_SECRET;
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');
const sign = (p) => sha1(Object.keys(p).sort().map((k) => `${k}=${p[k]}`).join('&') + secret);
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('latin1');
    const field = (n) => (raw.match(new RegExp(`name="${n}"\\r\\n\\r\\n([^\\r]*)`)) || [])[1] ?? new URLSearchParams(raw).get(n);
    const reply = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json', ...cors }); res.end(JSON.stringify(body)); };
    if (/\/auto\/upload$/.test(req.url)) {
      const params = { allowed_formats: field('allowed_formats'), folder: field('folder'), timestamp: field('timestamp') };
      if (sign(params) !== field('signature')) return reply(401, { error: { message: 'Invalid Signature' } });
      if (Math.abs(Date.now() / 1000 - Number(params.timestamp)) > 3600) return reply(400, { error: { message: 'Stale request' } });
      const type = (raw.match(/Content-Type: (\w+)\//) || [])[1] === 'video' ? 'video' : 'image';
      const public_id = `${params.folder}/${crypto.randomBytes(6).toString('hex')}`;
      const version = Math.floor(Date.now() / 1000);
      const out = { public_id, version, resource_type: type, signature: sha1(`public_id=${public_id}&version=${version}${secret}`), bytes: chunks.reduce((n, c) => n + c.length, 0) };
      fs.appendFileSync(log, JSON.stringify({ op: 'upload', ...out }) + '\n');
      return reply(200, out);
    }
    if (/\/(image|video)\/destroy$/.test(req.url)) {
      const p = { invalidate: field('invalidate'), public_id: field('public_id'), timestamp: field('timestamp') };
      const ok = sign(p) === field('signature');
      fs.appendFileSync(log, JSON.stringify({ op: 'destroy', public_id: p.public_id, ok }) + '\n');
      return reply(ok ? 200 : 401, { result: ok ? 'ok' : 'invalid signature' });
    }
    reply(404, { error: 'not found' });
  });
}).listen(port, () => console.log('fake cloudinary on', port));
