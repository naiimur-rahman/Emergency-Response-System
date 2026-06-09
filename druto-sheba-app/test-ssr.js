const React = require('react');
const ReactDOMServer = require('react-dom/server');

const data = {
    hospitalRank: [], zoneAnalysis: [], maintenanceStats: [],
    inventoryAlerts: [], costTrend: [], recentReviews: [],
    responseTime: [], specDist: [], requestTrend: [],
};

// ... try simulating the render ...
try {
  let val = (data?.zoneAnalysis?.reduce((acc, curr) => acc + parseInt(curr.count), 0) / (data?.zoneAnalysis?.length || 1)).toFixed(1) || 0;
  console.log('val:', val);
  
  let val2 = data?.maintenanceStats?.reduce((acc, curr) => acc + parseFloat(curr.cost), 0).toLocaleString() || 0;
  console.log('val2:', val2);
} catch(e) { console.error("Error:", e.message) }
