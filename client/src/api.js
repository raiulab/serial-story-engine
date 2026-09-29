import axios from 'axios';

const notifyUsageUpdated = (response) => {
  if (
    typeof window !== 'undefined'
    && response?.config?.method
    && response.config.method.toLowerCase() !== 'get'
  ) {
    window.dispatchEvent(new CustomEvent('ai-usage-updated'));
  }
  return response;
};

const api = axios.create({
  baseURL: '/api',
  timeout: 60000, // 60秒のタイムアウト（デフォルト、文章生成用）
  headers: {
    'Content-Type': 'application/json'
  }
});

// 画像生成専用のAPIインスタンス（タイムアウト180秒）
export const imageApi = axios.create({
  baseURL: '/api',
  timeout: 180000, // 180秒（3分）のタイムアウト（画像生成は時間がかかるため）
  headers: {
    'Content-Type': 'application/json'
  }
});

// 画像生成API用のインターセプター
imageApi.interceptors.request.use(
  (config) => {
    console.log('Image API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('Image API Request Error:', error);
    return Promise.reject(error);
  }
);

imageApi.interceptors.response.use(
  (response) => {
    return notifyUsageUpdated(response);
  },
  (error) => {
    console.error('Image API Response Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

// リクエストインターセプター（デバッグ用）
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（エラーハンドリング）
api.interceptors.response.use(
  (response) => {
    return notifyUsageUpdated(response);
  },
  (error) => {
    console.error('API Response Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

export default api;
