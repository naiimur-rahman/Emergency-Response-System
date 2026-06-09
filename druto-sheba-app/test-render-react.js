const React = require('react');
const ReactDOMServer = require('react-dom/server');

try {
  const div = React.createElement('div', { style: { width: 'NaN%' } });
  console.log(ReactDOMServer.renderToString(div));
} catch (e) {
  console.error("ERROR:", e.message);
}
