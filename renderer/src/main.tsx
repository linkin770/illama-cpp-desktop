import React from 'react';
import ReactDOM from 'react-dom/client';
import { StyleProvider, createCache } from '@ant-design/cssinjs';
import App from './App';

console.log('React main.tsx loaded');

const cache = createCache();

try {
  const rootElement = document.getElementById('app-root');
  console.log('Root element:', rootElement);
  
  if (!rootElement) {
    console.error('Root element not found!');
  } else {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <StyleProvider 
          cache={cache} 
          container={document.head}
          hashPriority="high"
        >
          <App />
        </StyleProvider>
      </React.StrictMode>
    );
    console.log('React app rendered successfully');
  }
} catch (error) {
  console.error('Error rendering React app:', error);
}
