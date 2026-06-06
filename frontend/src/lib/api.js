const BASE_URL = (typeof process.env.NEXT_PUBLIC_API_URL !== 'undefined' && process.env.NEXT_PUBLIC_API_URL !== '') ? process.env.NEXT_PUBLIC_API_URL : '';

class ApiClient {
  constructor() {
    this.baseUrl = BASE_URL;
  }

  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    // Remove Content-Type for blob responses
    if (options.responseType === 'blob') {
      delete config.responseType;
    }

    try {
      const response = await fetch(url, config);

      // Handle blob responses (Excel export)
      if (options.responseType === 'blob') {
        if (!response.ok) {
          throw new Error('Export failed');
        }
        return response.blob();
      }

      const data = await response.json();

      if (!response.ok) {
        // Auto-logout on 401
        if (response.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    ).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  del(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  getBlob(endpoint, params = {}) {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    ).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET', responseType: 'blob' });
  }
}

const api = new ApiClient();
export default api;
