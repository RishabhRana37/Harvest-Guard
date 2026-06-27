// Mock Image and Heatmap constants (valid base64 Data URIs)
export const MOCK_LEAF_IMAGE_BASE64 = 
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADVJREFUeNpi/M8ABP8Z0ASgzsDACAoYQAFMEC4jKIALwEqYwFzGf6gCZEF0AboArAAkABBgAD15BAX4Nl4fAAAAAElFTkSuQmCC"; // simple leaf-green block

export const MOCK_HEATMAP_BASE64 = 
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADhJREFUeNpi/M8ABP8Z0ASgzsDACAoYQAFMEC4jKIALwEpYwFzGf6gCZEF0AaYArADJAEwAIAAA//8DAQD5qAQFjLz82wAAAABJRU5ErkJggg=="; // reddish overlay heatmap block

export const MOCK_CONFIDENT_DIAGNOSIS = {
  scan_id: "scan_665f1c2a9b3e",
  created_at: "2026-06-25T10:15:30Z",
  is_leaf: true,
  is_confident: true,
  confidence: 0.87,
  confidence_band: "high",
  severity: "mild",
  urgency_days: 3,
  prediction: {
    slug: "tomato-early-blight",
    crop: "Tomato",
    name: "Early Blight",
    prob: 0.87
  },
  top_k: [
    { slug: "tomato-early-blight", crop: "Tomato", name: "Early Blight", prob: 0.87 },
    { slug: "tomato-late-blight", crop: "Tomato", name: "Late Blight", prob: 0.07 },
    { slug: "tomato-healthy", crop: "Tomato", name: "Healthy", prob: 0.04 }
  ],
  heatmap: MOCK_HEATMAP_BASE64,
  disease: {
    slug: "tomato-early-blight",
    crop: "Tomato",
    name: "Early Blight",
    pathogen: "Alternaria solani",
    is_healthy: false,
    symptoms: [
      "Concentric brown rings on lower leaves (bullseye spots)",
      "Yellow halos surrounding lesions",
      "Premature leaf drop starting from bottom branches"
    ],
    cause: "Fungal pathogen favored by warm, humid conditions and heavy dew.",
    lifecycle: "Spreads via airborne spores in 7–10 day cycles, overwintering in plant debris.",
    treatments: {
      organic: [
        { action: "Neem oil spray", dosage: "5 ml/L", frequency: "every 7 days", safety: "Apply in late evening to avoid burning leaves." },
        { action: "Copper fungicide", dosage: "3 g/L", frequency: "every 10 days", safety: "Apply at first sign of disease; wash hands after application." }
      ],
      chemical: [
        { action: "Chlorothalonil spray", dosage: "2 g/L", frequency: "every 10 days", safety: "Wear protective gloves; 7-day pre-harvest interval (PHI)." }
      ],
      prevention: [
        "Rotate crops with non-solanaceous plants every 3 years.",
        "Remove and destroy all infected plant debris at the end of the season.",
        "Use drip irrigation to keep leaves completely dry."
      ]
    },
    confused_with: ["tomato-late-blight"],
    image_url: MOCK_LEAF_IMAGE_BASE64
  }
};

export const MOCK_LOW_CONF_DIAGNOSIS = {
  scan_id: "scan_665f1c2a9b40",
  created_at: "2026-06-25T10:16:00Z",
  is_leaf: true,
  is_confident: false,
  confidence: 0.48,
  confidence_band: "low",
  severity: "mild",
  urgency_days: 5,
  prediction: {
    slug: "potato-late-blight",
    crop: "Potato",
    name: "Late Blight",
    prob: 0.48
  },
  top_k: [
    { slug: "potato-late-blight", crop: "Potato", name: "Late Blight", prob: 0.48 },
    { slug: "potato-early-blight", crop: "Potato", name: "Early Blight", prob: 0.31 },
    { slug: "potato-healthy", crop: "Potato", name: "Healthy", prob: 0.21 }
  ],
  heatmap: MOCK_HEATMAP_BASE64,
  disease: {
    slug: "potato-late-blight",
    crop: "Potato",
    name: "Late Blight",
    pathogen: "Phytophthora infestans",
    is_healthy: false,
    symptoms: [
      "Dark, water-soaked spots on leaves expanding rapidly",
      "White mold growth on the undersides of leaves in humid weather"
    ],
    cause: "Oomycete pathogen thriving in cool, wet conditions.",
    lifecycle: "Extremely fast-spreading spore cycles that can decimate a field in days.",
    treatments: {
      organic: [
        { action: "Copper soap spray", dosage: "4 ml/L", frequency: "every 5 days", safety: "Apply thoroughly to both sides of leaves." }
      ],
      chemical: [
        { action: "Mancozeb application", dosage: "2.5 g/L", frequency: "every 7 days", safety: "Ensure full coverage; wear respiratory mask during spray." }
      ],
      prevention: [
        "Plant certified disease-free seed tubers.",
        "Harvest only during dry weather to prevent tuber infection.",
        "Destroy any volunteer potato plants immediately."
      ]
    },
    confused_with: ["potato-early-blight"],
    image_url: MOCK_LEAF_IMAGE_BASE64
  }
};

export const MOCK_NOT_LEAF_DIAGNOSIS = {
  scan_id: "scan_665f1c2a9b41",
  created_at: "2026-06-25T10:16:20Z",
  is_leaf: false,
  is_confident: false,
  confidence: null,
  confidence_band: null,
  severity: null,
  urgency_days: null,
  prediction: null,
  top_k: [],
  heatmap: null,
  disease: null
};

export const MOCK_HEALTHY_DIAGNOSIS = {
  scan_id: "scan_665f1c2a9b42",
  created_at: "2026-06-25T10:17:00Z",
  is_leaf: true,
  is_confident: true,
  confidence: 0.95,
  confidence_band: "high",
  severity: "healthy",
  urgency_days: null,
  prediction: {
    slug: "tomato-healthy",
    crop: "Tomato",
    name: "Healthy",
    prob: 0.95
  },
  top_k: [
    { slug: "tomato-healthy", crop: "Tomato", name: "Healthy", prob: 0.95 },
    { slug: "tomato-early-blight", crop: "Tomato", name: "Early Blight", prob: 0.03 },
    { slug: "tomato-late-blight", crop: "Tomato", name: "Late Blight", prob: 0.02 }
  ],
  heatmap: null,
  disease: {
    slug: "tomato-healthy",
    crop: "Tomato",
    name: "Healthy",
    pathogen: "None",
    is_healthy: true,
    symptoms: ["Green, vibrant foliage with no visible spots or discoloration."],
    cause: "Excellent crop care, optimal water, nutrients, and sunlight.",
    lifecycle: "Normal vegetative growth.",
    treatments: {
      organic: [],
      chemical: [],
      prevention: ["Continue regular weeding", "Apply organic mulch to retain soil moisture"]
    },
    confused_with: [],
    image_url: MOCK_LEAF_IMAGE_BASE64
  }
};

export const MOCK_PEST_DIAGNOSIS = {
  scan_id: "scan_665f1c2a9b43",
  created_at: "2026-06-25T10:18:00Z",
  is_leaf: true,
  is_confident: true,
  confidence: 0.92,
  confidence_band: "high",
  severity: "severe",
  urgency_days: 2,
  scan_mode: "pest",
  prediction: {
    slug: "pest-aphids",
    crop: "Tomato",
    name: "Aphids Infestation",
    prob: 0.92
  },
  top_k: [
    { slug: "pest-aphids", crop: "Tomato", name: "Aphids Infestation", prob: 0.92 },
    { slug: "pest-whitefly", crop: "Tomato", name: "Whitefly Infestation", prob: 0.05 },
    { slug: "tomato-healthy", crop: "Tomato", name: "Healthy", prob: 0.03 }
  ],
  heatmap: MOCK_HEATMAP_BASE64,
  pest: {
    slug: "pest-aphids",
    crop: "Tomato",
    name: "Aphids",
    severity: "severe",
    description: "Clusters of small, soft-bodied sap-sucking insects on the undersides of leaves, causing yellowing, curling, and honeydew mold secretion.",
    treatments: {
      organic: [
        "Hose leaves with strong water streams to dislodge clusters.",
        "Apply organic neem oil solution (5ml/L) or insecticidal soaps."
      ],
      chemical: [
        "Spray systemic acetamiprid according to local product safety guides.",
        "Wear masks and gloves; observe a 7-day pre-harvest limit."
      ]
    }
  }
};

export const MOCK_DISEASES_LIST = {
  items: [
    { slug: "tomato-early-blight", crop: "Tomato", name: "Early Blight", is_healthy: false, image_url: MOCK_LEAF_IMAGE_BASE64 },
    { slug: "tomato-late-blight", crop: "Tomato", name: "Late Blight", is_healthy: false, image_url: MOCK_LEAF_IMAGE_BASE64 },
    { slug: "tomato-healthy", crop: "Tomato", name: "Healthy", is_healthy: true, image_url: MOCK_LEAF_IMAGE_BASE64 },
    { slug: "potato-early-blight", crop: "Potato", name: "Early Blight", is_healthy: false, image_url: MOCK_LEAF_IMAGE_BASE64 },
    { slug: "potato-late-blight", crop: "Potato", name: "Late Blight", is_healthy: false, image_url: MOCK_LEAF_IMAGE_BASE64 },
    { slug: "potato-healthy", crop: "Potato", name: "Healthy", is_healthy: true, image_url: MOCK_LEAF_IMAGE_BASE64 },
    { slug: "rice-blast", crop: "Rice", name: "Blast", is_healthy: false, image_url: MOCK_LEAF_IMAGE_BASE64 },
    { slug: "rice-healthy", crop: "Rice", name: "Healthy", is_healthy: true, image_url: MOCK_LEAF_IMAGE_BASE64 },
    { slug: "wheat-rust", crop: "Wheat", name: "Rust", is_healthy: false, image_url: MOCK_LEAF_IMAGE_BASE64 },
    { slug: "wheat-healthy", crop: "Wheat", name: "Healthy", is_healthy: true, image_url: MOCK_LEAF_IMAGE_BASE64 },
    { slug: "maize-smut", crop: "Maize", name: "Smut", is_healthy: false, image_url: MOCK_LEAF_IMAGE_BASE64 },
    { slug: "maize-healthy", crop: "Maize", name: "Healthy", is_healthy: true, image_url: MOCK_LEAF_IMAGE_BASE64 },
    { slug: "pest-aphids", crop: "Tomato", name: "Aphids Infestation", is_healthy: false, image_url: MOCK_LEAF_IMAGE_BASE64 }
  ],
  page: 1,
  page_size: 20,
  total: 13
};

export const MOCK_SCANS_LIST = {
  items: [
    {
      scan_id: "scan_665f1c2a9b3e",
      created_at: "2026-06-25T10:15:30Z",
      predicted: { slug: "tomato-early-blight", crop: "Tomato", name: "Early Blight", prob: 0.87 },
      confidence: 0.87,
      confidence_band: "high",
      severity: "mild",
      is_leaf: true,
      thumb_url: MOCK_LEAF_IMAGE_BASE64
    },
    {
      scan_id: "scan_665f1c2a9b42",
      created_at: "2026-06-25T10:17:00Z",
      predicted: { slug: "tomato-healthy", crop: "Tomato", name: "Healthy", prob: 0.95 },
      confidence: 0.95,
      confidence_band: "high",
      severity: "healthy",
      is_leaf: true,
      thumb_url: MOCK_LEAF_IMAGE_BASE64
    }
  ],
  page: 1,
  page_size: 20,
  total: 2
};
