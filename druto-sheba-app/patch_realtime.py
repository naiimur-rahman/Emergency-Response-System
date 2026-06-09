import os
import re

files_to_patch = [
    ("src/app/(dispatcher)/operations/page.js", "fetchData"),
    ("src/app/(dispatcher)/requests/page.js", "fetchData"),
    ("src/app/(dispatcher)/dashboard/page.js", "fetchData"),
    ("src/app/(dispatcher)/fleet/page.js", "fetchData"),
    ("src/app/(dispatcher)/trips/page.js", "fetchTrips"),
    ("src/app/(patient)/track/page.js", "fetchTrip"),
    ("src/app/(patient)/my-bills/page.js", "fetchBills"),
    ("src/app/(patient)/history/page.js", "fetchHistory"),
    ("src/app/(driver)/schedule/page.js", "fetchData"),
    ("src/app/(driver)/driver-history/page.js", "fetchData"),
    ("src/app/(driver)/duty/page.js", "fetchTrip"),
    ("src/app/(admin)/hospitals/page.js", "fetchData"),
    ("src/app/(admin)/maintenance/page.js", "fetchData"),
    ("src/app/(admin)/control/page.js", "fetchData"),
    ("src/app/(admin)/billing/page.js", "fetchBills"),
    ("src/app/(admin)/analytics/page.js", ["fetchHealth", "fetchAnalytics"]),
]

for file_path, fn_names in files_to_patch:
    if not os.path.exists(file_path):
        continue
    with open(file_path, "r") as f:
        content = f.read()

    # Add import if missing
    if "useAutoRefresh" not in content:
        content = re.sub(r"(import .*?from .*?;)", r"\1\nimport { useAutoRefresh } from '@/hooks/useAutoRefresh';", content, count=1)

    if isinstance(fn_names, list):
        for fn in fn_names:
            content = re.sub(r"const .*? = setInterval\(" + fn + r",.*?\);.*?(//.*)?\n.*?clearInterval.*?;?", "", content)
            # Add hook call after useEffect
            if f"useAutoRefresh({fn})" not in content:
                content = content.replace("useEffect(() => {", f"useAutoRefresh({fn});\n  useEffect(() => {{", 1)
    else:
        # Match data-fetching setIntervals
        # const interval = setInterval(fetchData, 10000);
        # return () => clearInterval(interval);
        
        # Track/Page uses:
        # const intervalMs = ...
        # const interval = setInterval(fetchTrip, intervalMs);
        if "intervalMs" in content and "fetchTrip" in content:
            content = re.sub(r"const intervalMs.*?\n.*setInterval.*?;\n.*?clearInterval.*?;\n", "", content)
        else:
            content = re.sub(r"const .*? = setInterval\(" + fn_names + r",.*?\);.*?(//.*)?\n.*?clearInterval.*?;?", "", content)
            
        if f"useAutoRefresh({fn_names})" not in content:
            # Try to place it near the component start or before return
            content = content.replace("useEffect(() => {", f"useAutoRefresh({fn_names});\n  useEffect(() => {{", 1)

    with open(file_path, "w") as f:
        f.write(content)
    print(f"Patched {file_path}")

