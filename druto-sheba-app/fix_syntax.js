const fs = require('fs');
const path = require('path');

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
    
    // Fix `(interval);` and `return () => (interval);`
    content = content.replace(/return \(\) =>\s*\(interval\);/g, '');
    content = content.replace(/^\s*\(\s*interval\s*\)\s*;/gm, '');
    content = content.replace(/return \(\) =>\s*;/gm, '');

    // Check if fetch function is defined inside useEffect
    // e.g. useEffect(() => { const fetchData = () => { ... }
    const match = content.match(/useEffect\(\(\) => \{\s*const (fetch[A-Za-z0-9_]+) = (\([^)]*\) => \{[\s\S]*?\});\s*\1\(\);\s*\}, \[\]\);/);
    if (match) {
        const fnName = match[1];
        const fnBody = match[2];
        const fullUseEffect = match[0];
        
        // Ensure useCallback is imported
        if (!content.includes('useCallback')) {
            content = content.replace(/import \{([^}]+)\} from 'react';/, "import { $1, useCallback } from 'react';");
        }
        
        const newCode = `const ${fnName} = useCallback(${fnBody}, []);\n\n  useEffect(() => {\n    ${fnName}();\n  }, [${fnName}]);`;
        content = content.replace(fullUseEffect, newCode);
    }
    
    fs.writeFileSync(file, content);
    console.log(`Fixed syntax in ${file}`);
}
