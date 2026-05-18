import type { ThemeConfig } from 'antd';

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#16a34a',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#f5222d',
    colorBgBase: '#ffffff',
    colorTextBase: '#1a1a1a',
    colorBgLayout: '#faf8f5',
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

export const darkThemeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#4ade80',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#f87171',
    colorBgBase: '#1E1E1E',
    colorTextBase: '#f0f0f0',
    colorBgLayout: '#1E1E1E',
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
  algorithm: undefined,
};
