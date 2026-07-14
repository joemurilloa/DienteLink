const fs = require('fs');
const path = require('path');

const functionsDir = path.join(__dirname, 'supabase', 'functions');

const corsCode = `const getCorsHeaders = (req: Request) => {
  const ALLOWED_ORIGINS = ["https://diente-link.vercel.app", "http://localhost:3000", "http://localhost:5173"];
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin"
  };
};`;

const directories = fs.readdirSync(functionsDir).filter(f => fs.statSync(path.join(functionsDir, f)).isDirectory());

directories.forEach(dir => {
  const indexTs = path.join(functionsDir, dir, 'index.ts');
  if (fs.existsSync(indexTs)) {
    let content = fs.readFileSync(indexTs, 'utf8');

    // 1. Replace corsHeaders declaration
    const corsRegex = /const corsHeaders = \{\s*"Access-Control-Allow-Origin": "\*",\s*"Access-Control-Allow-Headers": "[^"]+",\s*\}/;
    if (corsRegex.test(content)) {
      content = content.replace(corsRegex, corsCode);
    }

    // 2. Replace usages of corsHeaders
    content = content.replace(/\{ headers: corsHeaders \}/g, '{ headers: getCorsHeaders(req) }');
    content = content.replace(/\{ \.\.\.corsHeaders,\s*"Content-Type": "application\/json" \}/g, '{ ...getCorsHeaders(req), "Content-Type": "application/json" }');
    
    // SEC-06: Fix HTML Injection in notify-doctor-new-request
    if (dir === 'notify-doctor-new-request') {
      if (!content.includes('function escapeHtml')) {
        const escapeFunc = `\n    function escapeHtml(str: any): string {\n      if (!str) return '';\n      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');\n    }\n`;
        content = content.replace('const date = record.requested_date', escapeFunc + '    const date = escapeHtml(record.requested_date');
        
        content = content.replace('const time = record.requested_time', 'const time = escapeHtml(record.requested_time');
        content = content.replace('const type = record.appointment_type', 'const type = escapeHtml(record.appointment_type');
        content = content.replace('const message = record.message', 'const message = escapeHtml(record.message');
        
        content = content.replace(/\$\{record\.patient_name\}/g, '${escapeHtml(record.patient_name)}');
      }
    }

    fs.writeFileSync(indexTs, content);
    console.log(`Updated ${dir}/index.ts`);
  }
});
