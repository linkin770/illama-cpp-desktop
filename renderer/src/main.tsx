// React 应用入口文件
import React from 'react';
import ReactDOM from 'react-dom/client';
import { StyleProvider, createCache } from '@ant-design/cssinjs';
import { XProvider } from '@ant-design/x';
import zhCN from '@ant-design/x/locale/zh_CN';
import App from './App';

console.log('React main.tsx loaded');

// 创建样式缓存
const cache = createCache();

try {
  // 获取挂载点
  const rootElement = document.getElementById('app-root');
  console.log('Root element:', rootElement);
  
  if (!rootElement) {
    console.error('Root element not found!');
  } else {
    // 创建 React 根并渲染应用
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        {/* StyleProvider 确保样式正确注入到当前 document */}
        <StyleProvider 
          cache={cache} 
          container={document.head}
          hashPriority="high"
        >
          {/* XProvider 配置 Ant Design X 全局上下文 */}
          <XProvider
            locale={zhCN}
            theme={{
              token: {
                colorPrimary: '#1890ff',
                colorSuccess: '#52c41a',
                colorWarning: '#faad14',
                colorError: '#f5222d',
                borderRadius: 8,
              },
              components: {
                Button: {
                  borderRadius: 6,
                },
              },
            }}
            // 可以配置各个 X 组件的默认属性
            bubble={{}}
            sender={{}}
            conversations={{}}
            prompts={{}}
            suggestion={{}}
          >
            <App />
          </XProvider>
        </StyleProvider>
      </React.StrictMode>
    );
    console.log('React app rendered successfully');
  }
} catch (error) {
  console.error('Error rendering React app:', error);
}
