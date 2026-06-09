const React = require('react');
const ReactDOMServer = require('react-dom/server');

try {
  const svg = React.createElement('svg', null, 
    React.createElement('circle', { cx: NaN, cy: NaN })
  );
  console.log(ReactDOMServer.renderToString(svg));
} catch (e) {
  console.error(e.message);
}
