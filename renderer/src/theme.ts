import type { ThemeConfig } from 'antd';

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#10a37f',
    colorSuccess: '#10a37f',
    colorWarning: '#faad14',
    colorError: '#f5222d',
    colorBgBase: '#ffffff',
    colorTextBase: '#2c2c2e',
    colorBgLayout: '#ffffff',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "WenQuanYi Micro Hei", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  components: {
    Button: {
      borderRadius: 6,
    },
    Input: {
      borderRadius: 6,
    },
  },
};
