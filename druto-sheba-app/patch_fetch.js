const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.js') && !file.includes('patch_fetch.js') && !file.includes('route.js')) results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src', 'app'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace simple GET fetches: fetch('/api/xxx') or fetch(`/api/xxx?id=${id}`)
  content = content.replace(/fetch\((['"`])(\/api\/[^'"`]+)\1\)/g, (match, quote, url) => {
    // If it already has Date.now or cache:, skip
    if (url.includes('Date.now') || url.includes('cache')) return match;
    
    // Check if it already has ?
    if (url.includes('?')) {
      return `fetch(\`${url}&t=\${Date.now()}\`, { cache: 'no-store' })`;
    } else {
      return `fetch(\`${url}?t=\${Date.now()}\`, { cache: 'no-store' })`;
    }
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Patched:', file);
  }
});
