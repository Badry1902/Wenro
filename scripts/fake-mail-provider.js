// Test double for the email provider: records every email it receives into a JSON-lines file.
// Usage: node scripts/fake-mail-provider.js 3999 /tmp/mails.jsonl  then set RESEND_API_URL=http://localhost:3999/emails
const http = require('http');
const fs = require('fs');
const [port, out] = [Number(process.argv[2] || 3999), process.argv[3] || '/tmp/mails.jsonl'];
let n = 0;
http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    fs.appendFileSync(out, JSON.stringify({ auth: req.headers.authorization, idem: req.headers['idempotency-key'], ...JSON.parse(body || '{}') }) + '\n');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: `fake-${++n}` }));
  });
}).listen(port, () => console.log('fake provider on', port));
