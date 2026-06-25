import { 
  MOCK_CONFIDENT_DIAGNOSIS, 
  MOCK_LOW_CONF_DIAGNOSIS, 
  MOCK_NOT_LEAF_DIAGNOSIS, 
  MOCK_HEALTHY_DIAGNOSIS, 
  MOCK_DISEASES_LIST,
  MOCK_LEAF_IMAGE_BASE64
} from './fixtures';
import { saveScan } from '../utils/db';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'https://cropdoc-api.zenverse.hackathon/api/v1';

// Device ID management (UUID)
export const getDeviceId = (): string => {
  let id = localStorage.getItem('cropdoc_device_id');
  if (!id) {
    // Generate simple UUID or use randomUUID if available
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      id = crypto.randomUUID();
    } else {
      id = 'dev-' + Math.random().toString(36).substring(2, 15) + '-' + Math.random().toString(36).substring(2, 15);
    }
    localStorage.setItem('cropdoc_device_id', id);
  }
  return id;
};

// Mock Mode management
export type MockMode = 'confident' | 'lowconf' | 'notleaf' | 'healthy' | 'disabled';

export const getMockMode = (): MockMode => {
  return (localStorage.getItem('cropdoc_mock_mode') as MockMode) || 'confident'; // default to confident mock for demo
};

export const setMockMode = (mode: MockMode) => {
  localStorage.setItem('cropdoc_mock_mode', mode);
};

// Headers builder
const getHeaders = () => {
  return {
    'X-Device-Id': getDeviceId(),
  };
};

// Main API calls
export const api = {
  // Diagnose a leaf
  diagnose: async (imageBlob: Blob, cropHint?: string, signal?: AbortSignal): Promise<any> => {
    const mockMode = getMockMode();
    
    // Simulate network delay for realistic visual transitions
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (mockMode !== 'disabled') {
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
        default:
          result = JSON.parse(JSON.stringify(MOCK_CONFIDENT_DIAGNOSIS));
      }
      
      // Inject unique scan ID and actual timestamp so demo history populates realistically
      const now = new Date();
      result.scan_id = 'scan_' + now.getTime();
      result.created_at = now.toISOString();
      if (cropHint && result.prediction) {
        result.prediction.crop = cropHint.charAt(0).toUpperCase() + cropHint.slice(1);
      }
      
      // Store in local IndexedDB history immediately
      // Capture the original image as a local URL for the history thumbnail
      const localImageUrl = URL.createObjectURL(imageBlob);
      const scanToSave = {
        ...result,
        local_image_url: localImageUrl
      };
      await saveScan(scanToSave);
      
      return result;
    }

    // Live mode
    const formData = new FormData();
    formData.append('image', imageBlob, 'leaf.jpg');
    if (cropHint) {
      formData.append('crop_hint', cropHint);
    }

    const response = await fetch(`${API_BASE_URL}/diagnose`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
      signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to analyze leaf image.');
    }

    const result = await response.json();
    
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

    const response = await fetch(`${API_BASE_URL}/diseases?${queryParams.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch disease list.');
    return response.json();
  },

  // Get full details for a single disease slug
  getDiseaseBySlug: async (slug: string): Promise<any> => {
    const mockMode = getMockMode();
    if (mockMode !== 'disabled') {
      await new Promise((resolve) => setTimeout(resolve, 200));
      // Find inside confident/lowconf fixtures or return default
      if (slug === 'tomato-early-blight') return MOCK_CONFIDENT_DIAGNOSIS.disease;
      if (slug === 'potato-late-blight') return MOCK_LOW_CONF_DIAGNOSIS.disease;
      if (slug === 'tomato-healthy') return MOCK_HEALTHY_DIAGNOSIS.disease;
      
      // Fallback stubbing
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

    const response = await fetch(`${API_BASE_URL}/diseases/${slug}`);
    if (!response.ok) throw new Error('Failed to fetch disease detail.');
    return response.json();
  },

  // Get history list
  getHistory: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/scans`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch scans history.');
    return response.json();
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

    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedback)
    });

    if (!response.ok) throw new Error('Failed to submit feedback.');
    return response.json();
  }
};
