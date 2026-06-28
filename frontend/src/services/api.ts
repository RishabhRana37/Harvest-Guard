import { 
  MOCK_CONFIDENT_DIAGNOSIS, 
  MOCK_LOW_CONF_DIAGNOSIS, 
  MOCK_NOT_LEAF_DIAGNOSIS, 
  MOCK_HEALTHY_DIAGNOSIS, 
  MOCK_PEST_DIAGNOSIS,
  MOCK_SEVERE_DIAGNOSIS,
  MOCK_DISEASES_LIST,
  MOCK_LEAF_IMAGE_BASE64
} from './fixtures';
import { saveScan } from '../utils/db';
import { compressImageForUpload } from '../utils/imagePipeline';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
let normalizedBase = VITE_API_BASE_URL.replace(/\/+$/, '');
if (normalizedBase.endsWith('/api/v1')) {
  normalizedBase = normalizedBase.slice(0, -7);
}
export const API_BASE_URL = normalizedBase ? `${normalizedBase}/api/v1` : '/api/v1';

// Device ID management (UUID)
export const getDeviceId = (): string => {
  let id = localStorage.getItem('harvest_guard_device_id');
  if (!id) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      id = crypto.randomUUID();
    } else {
      id = 'dev-' + Math.random().toString(36).substring(2, 15) + '-' + Math.random().toString(36).substring(2, 15);
    }
    localStorage.setItem('harvest_guard_device_id', id);
  }
  return id;
};

// Global Toast dispatch helper
export const triggerGlobalToast = (message: string, type: string = 'info') => {
  window.dispatchEvent(new CustomEvent('harvest-guard-toast', { detail: { message, type } }));
};

// Mock Mode management
export type MockMode = 'confident' | 'lowconf' | 'notleaf' | 'healthy' | 'pest' | 'severe' | 'disabled';

export const getMockMode = (): MockMode => {
  const saved = localStorage.getItem('harvest_guard_mock_mode');
  if (saved) return saved as MockMode;
  
  // Default to disabled (live cloud mode) if VITE_API_BASE_URL is provided,
  // else default to confident mock for local standalone test
  if (import.meta.env.VITE_API_BASE_URL) {
    return 'disabled';
  }
  return 'confident';
};

export const setMockMode = (mode: MockMode) => {
  localStorage.setItem('harvest_guard_mock_mode', mode);
};

// Centralized request wrapper with headers, 503 retries, and clean error envelope translations
const request = async (
  endpoint: string,
  options: RequestInit = {},
  retryOn503 = true
): Promise<any> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  headers.set('X-Device-Id', getDeviceId());

  const finalOptions = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, finalOptions);

    if (!response.ok) {
      const status = response.status;

      // Auto-retry once on 503 after 4 seconds
      if (status === 503 && retryOn503) {
        console.warn("Model warming up (503). Retrying in 4 seconds...");
        triggerGlobalToast("warming up, retry in a few seconds", "warning");
        await new Promise((resolve) => setTimeout(resolve, 4000));
        return await request(endpoint, options, false);
      }

      // Try to parse error envelope from backend
      let errorMessage = '';
      let errorCode = 'UNKNOWN';
      try {
        const errorData = await response.json();
        if (errorData?.error) {
          errorMessage = errorData.error.message || '';
          errorCode = errorData.error.code || 'UNKNOWN';
        }
      } catch (jsonErr) {
        // Not a JSON response
      }

      let displayMessage = errorMessage;
      if (status === 413 || status === 415 || status === 422) {
        displayMessage = errorMessage || "Invalid image format or size exceeded. Please try another image.";
      } else if (status === 429) {
        displayMessage = "slow down";
      } else if (status === 503) {
        displayMessage = "warming up, retry in a few seconds";
      } else {
        displayMessage = errorMessage || `Request failed with status ${status}`;
      }

      const error = new Error(displayMessage);
      (error as any).status = status;
      (error as any).code = errorCode;
      throw error;
    }

    return await response.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err;
    }
    // Handle network drop / fetch connection failures
    if (!err.status && !err.message.includes("slow down") && !err.message.includes("warming up")) {
      throw new Error("Cannot connect to server. Please check your internet connection.");
    }
    throw err;
  }
};

// Main API calls
export const api = {
  // Check live backend connectivity
  checkHealth: async (): Promise<{ model_loaded: boolean }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        return { model_loaded: false };
      }
      const data = await response.json();
      return { model_loaded: data.model_loaded === true };
    } catch {
      return { model_loaded: false };
    }
  },

  // Diagnose a leaf
  diagnose: async (imageBlob: Blob, cropHint?: string, signal?: AbortSignal): Promise<any> => {
    const mockMode = getMockMode();
    
    // Simulate network delay for mock visual transitions
    if (mockMode !== 'disabled') {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      let result;
      switch (mockMode) {
        case 'confident':
          result = JSON.parse(JSON.stringify(MOCK_CONFIDENT_DIAGNOSIS));
          break;
        case 'lowconf':
          result = JSON.parse(JSON.stringify(MOCK_LOW_CONF_DIAGNOSIS));
          break;
        case 'notleaf':
          result = JSON.parse(JSON.stringify(MOCK_NOT_LEAF_DIAGNOSIS));
          break;
        case 'healthy':
          result = JSON.parse(JSON.stringify(MOCK_HEALTHY_DIAGNOSIS));
          break;
        case 'pest':
          result = JSON.parse(JSON.stringify(MOCK_PEST_DIAGNOSIS));
          break;
        case 'severe':
          result = JSON.parse(JSON.stringify(MOCK_SEVERE_DIAGNOSIS));
          break;
        default:
          result = JSON.parse(JSON.stringify(MOCK_CONFIDENT_DIAGNOSIS));
      }
      
      const now = new Date();
      result.scan_id = 'scan_' + now.getTime();
      result.created_at = now.toISOString();
      if (cropHint && result.prediction) {
        result.prediction.crop = cropHint.charAt(0).toUpperCase() + cropHint.slice(1);
      }
      
      const localImageUrl = URL.createObjectURL(imageBlob);
      const scanToSave = {
        ...result,
        local_image_url: localImageUrl
      };
      await saveScan(scanToSave);
      
      return result;
    }

    // Live mode — always compress before sending
    const uploadBlob = await compressImageForUpload(imageBlob);
    const formData = new FormData();
    formData.append('image', uploadBlob, 'leaf.jpg');
    if (cropHint) {
      formData.append('crop_hint', cropHint);
    }

    const result = await request('/diagnose', {
      method: 'POST',
      body: formData,
      signal
    });
    
    // Save to local scan history database
    const localImageUrl = URL.createObjectURL(imageBlob);
    await saveScan({
      ...result,
      local_image_url: localImageUrl
    });

    return result;
  },

  // Get disease list from Knowledge Base
  getDiseases: async (params: { crop?: string; q?: string; page?: number; page_size?: number } = {}): Promise<any> => {
    const mockMode = getMockMode();
    if (mockMode !== 'disabled') {
      await new Promise((resolve) => setTimeout(resolve, 300));
      let items = [...MOCK_DISEASES_LIST.items];
      
      if (params.crop) {
        items = items.filter(item => item.crop.toLowerCase() === params.crop!.toLowerCase());
      }
      if (params.q) {
        const query = params.q.toLowerCase();
        items = items.filter(item => 
          item.name.toLowerCase().includes(query) || 
          item.crop.toLowerCase().includes(query) ||
          item.slug.toLowerCase().includes(query)
        );
      }
      
      const page = params.page || 1;
      const pageSize = params.page_size || 20;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedItems = items.slice(start, end);

      return {
        items: paginatedItems,
        page,
        page_size: pageSize,
        total: items.length
      };
    }

    const queryParams = new URLSearchParams();
    if (params.crop) queryParams.append('crop', params.crop);
    if (params.q) queryParams.append('q', params.q);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.page_size) queryParams.append('page_size', String(params.page_size));

    return await request(`/diseases?${queryParams.toString()}`);
  },

  // Get full details for a single disease slug
  getDiseaseBySlug: async (slug: string): Promise<any> => {
    const mockMode = getMockMode();
    if (mockMode !== 'disabled') {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (slug === 'tomato-early-blight') return MOCK_CONFIDENT_DIAGNOSIS.disease;
      if (slug === 'potato-late-blight') return MOCK_LOW_CONF_DIAGNOSIS.disease;
      if (slug === 'tomato-healthy') return MOCK_HEALTHY_DIAGNOSIS.disease;
      
      const found = MOCK_DISEASES_LIST.items.find(item => item.slug === slug);
      return {
        slug: slug,
        crop: found?.crop || 'Crop',
        name: found?.name || 'Disease Detail',
        pathogen: 'Alternaria species',
        is_healthy: found?.is_healthy || false,
        symptoms: ['Chlorotic spots', 'Premature leaf yellowing'],
        cause: 'Fungal or environmental factors',
        lifecycle: 'Spreads in moist air currents',
        treatments: {
          organic: [{ action: 'Neem oil spray', dosage: '5ml/L', frequency: 'Weekly', safety: 'Spray in shade' }],
          chemical: [{ action: 'Copper fungicide', dosage: '2g/L', frequency: '10 days', safety: 'Wear gear' }],
          prevention: ['Crop hygiene', 'Drip watering']
        },
        confused_with: [],
        image_url: MOCK_LEAF_IMAGE_BASE64
      };
    }

    return await request(`/diseases/${slug}`);
  },

  // Get history list
  getHistory: async (): Promise<any> => {
    return await request('/scans');
  },

  // Submit feedback
  submitFeedback: async (feedback: { scan_id: string; agreed: boolean; corrected_slug?: string; note?: string }): Promise<any> => {
    const mockMode = getMockMode();
    if (mockMode !== 'disabled') {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        feedback_id: 'feed_' + Math.random().toString(36).substring(2, 9),
        scan_id: feedback.scan_id,
        received: true
      };
    }

    return await request('/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedback)
    });
  }
};
