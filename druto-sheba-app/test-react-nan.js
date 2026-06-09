const React = require('react');
const ReactDOMServer = require('react-dom/server');

try {
  const el = React.createElement('div', { style: { height: NaN } });
  ReactDOMServer.renderToString(el);
  console.log("NO CRASH!");
} catch (e) {
  console.log("CRASH:", e.message);
}
