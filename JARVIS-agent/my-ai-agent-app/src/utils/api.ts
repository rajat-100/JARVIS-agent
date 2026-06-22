const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

type RequestBody = Record<string, unknown>;

export const fetchData = async (endpoint: string) => {
  const response = await fetch(`${API_BASE_URL}/${endpoint}`);

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
};

export const postData = async (endpoint: string, data: RequestBody) => {
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
};
