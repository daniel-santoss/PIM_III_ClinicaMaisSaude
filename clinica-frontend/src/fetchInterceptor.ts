import { API_URL } from './constants/api';

const originalFetch = window.fetch;
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

window.fetch = async (...args) => {
  let response = await originalFetch(...args);

  if (response.status === 401 && !args[0].toString().includes('/login') && !args[0].toString().includes('/refresh')) {
    const token = localStorage.getItem("authToken");
    const refreshToken = localStorage.getItem("refreshToken");

    if (token && refreshToken) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(newToken => {
          if (args[1]) {
            const headers = new Headers(args[1].headers);
            headers.set('Authorization', `Bearer ${newToken}`);
            args[1].headers = headers;
          }
          return originalFetch(...args);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      isRefreshing = true;

      try {
        const refreshResponse = await originalFetch(`${API_URL}/api/Auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, refreshToken })
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          localStorage.setItem("authToken", data.token);
          localStorage.setItem("refreshToken", data.refreshToken);
          
          processQueue(null, data.token);
          if (args[1]) {
             const headers = new Headers(args[1].headers);
             headers.set('Authorization', `Bearer ${data.token}`);
             args[1].headers = headers;
          } else {
              args[1] = { headers: { 'Authorization': `Bearer ${data.token}` } };
          }
          response = await originalFetch(...args);
        } else {
          processQueue(new Error("Refresh failed"), null);
          localStorage.removeItem("authToken");
          localStorage.removeItem("refreshToken");
          window.location.reload();
        }
      } catch (e) {
        processQueue(e, null);
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        window.location.reload();
      } finally {
        isRefreshing = false;
      }
    } else {
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        window.location.reload();
    }
  }

  return response;
};
