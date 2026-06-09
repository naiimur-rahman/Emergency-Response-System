const React = require('react');
const ReactDOMServer = require('react-dom/server');

try {
  const svg = React.createElement('svg', null, 
    React.createElement('path', { d: "M NaN NaN" })
  );
  console.log(ReactDOMServer.renderToString(svg));
} catch (e) {
  console.error("ERROR:", e.message);
}
