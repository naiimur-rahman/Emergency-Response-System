import React from 'react';
import ReactDOMServer from 'react-dom/server';

// Mock lucide-react to avoid importing the real one
const IconMock = () => React.createElement('div');
const lucide = {
  Activity: IconMock, BarChart3: IconMock, ShieldAlert: IconMock, Map: IconMock,
  TrendingUp: IconMock, Star: IconMock, MessageSquare: IconMock, Clock: IconMock,
  Server: IconMock, Wifi: IconMock, Cpu: IconMock, Database: IconMock
};

// ... we don't have Babel setup to compile JSX easily here.
