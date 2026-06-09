const fs = require('fs');

const filesToPatch = [
    "src/app/(dispatcher)/operations/page.js",
    "src/app/(dispatcher)/requests/page.js",
    "src/app/(dispatcher)/dashboard/page.js",
    "src/app/(dispatcher)/fleet/page.js",
    "src/app/(dispatcher)/trips/page.js",
    "src/app/(patient)/my-bills/page.js",
    "src/app/(patient)/history/page.js",
    "src/app/(driver)/schedule/page.js",
    "src/app/(driver)/driver-history/page.js",
    "src/app/(admin)/hospitals/page.js",
    "src/app/(admin)/maintenance/page.js",
    "src/app/(admin)/control/page.js",
    "src/app/(admin)/billing/page.js",
    "src/app/(admin)/analytics/page.js",
];

for (const file of filesToPatch) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    
    const match = content.match(/^\s*useAutoRefresh\(([A-Za-z0-9_]+)\);\s*const \1 = useCallback\(/m);
    if (match) {
        const fnName = match[1];
        const regex1 = new RegExp(`^\\s*useAutoRefresh\\(${fnName}\\);\\s*\\n`, 'm');
        content = content.replace(regex1, '');
        
        const regex2 = new RegExp(`useEffect\\(\\(\\) => \\{\\s*${fnName}\\(\\);\\s*\\}, \\[${fnName}\\]\\);`);
        content = content.replace(regex2, (m) => m + `\n\n  useAutoRefresh(${fnName});`);
        
        fs.writeFileSync(file, content);
        console.log(`Fixed order in ${file}`);
    }
}
