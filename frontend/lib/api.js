export async function apiFetch(url, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cit_token') : null;
  const headers = {
    ...(options.headers || {}),
  };

  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Guard against non-JSON text (e.g. 500 "Internal Server Error" from proxy) crashing res.json()
  res.json = async () => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      if (!res.ok) {
        return {
          success: false,
          error: `Server error (${res.status}): ${text.slice(0, 100).trim() || res.statusText}`,
          status: res.status,
        };
      }
      return {
        success: false,
        error: 'Invalid response format from server',
      };
    }
  };

  return res;
}

export default apiFetch;
