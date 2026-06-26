import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      appName: 'CropDoc AI',
      nav: {
        scan: 'Scan',
        history: 'History',
        library: 'Library',
        settings: 'Settings'
      },
      onboarding: {
        skip: 'Skip',
        getStarted: 'Get Started',
        card1: {
          title: 'Snap a leaf',
          desc: 'Take a clear, close-up photo of any single cropped leaf in natural sunlight.'
        },
        card2: {
          title: 'Get a diagnosis',
          desc: 'Our advanced clinical AI analyzes the leaf to identify diseases with high confidence.'
        },
        card3: {
          title: 'Treat in time',
          desc: 'Get immediate organic and chemical treatments to protect your harvest and family.'
        }
      },
      home: {
        scanCTA: 'Scan a leaf',
        cameraTip: 'Fill the frame with one leaf, good light, steady hands.',
        takePhoto: 'Take Photo',
        uploadGallery: 'Upload from Gallery',
        recentScans: 'Recent Scans',
        emptyScans: 'Your scans will appear here.',
        blurryTitle: 'Photo looks blurry',
        blurryDesc: 'A blurry photo might reduce diagnosis accuracy. We recommend retaking it.',
        useAnyway: 'Use Anyway',
        retake: 'Retake Photo'
      },
      analyzing: {
        cancel: 'Cancel Analysis',
        uploading: 'Uploading photo...',
        analyzing: 'Analyzing leaf...',
        identifying: 'Identifying disease...',
        preparing: 'Preparing treatment plan...',
        slowConnection: 'Still working... check your connection',
        retry: 'Retry'
      },
      result: {
        confidence: 'Confidence',
        confidenceBand: {
          high: 'High Confidence (≥80%)',
          medium: 'Medium Confidence (60-79%)',
          low: 'Low Confidence (<60%)'
        },
        severity: {
          title: 'Severity',
          healthy: 'Healthy',
          mild: 'Mild Severity',
          severe: 'Severe Severity'
        },
        urgency: 'Act within ~{{days}} days',
        healthyResult: 'This leaf is healthy! Continue standard crop maintenance.',
        evidence: 'Evidence Heatmap',
        togglePhoto: 'Original Photo',
        toggleHeatmap: 'AI Heatmap',
        heatmapSlider: 'Heatmap Intensity',
        heatmapCaption: 'Red areas most influenced the diagnosis.',
        heatmapLegendLow: 'Low Influence',
        heatmapLegendHigh: 'High Influence',
        topPredictions: 'Alternate Predictions',
        treatmentTitle: 'Treatment Plan',
        tabs: {
          organic: 'Organic Care',
          chemical: 'Chemical Spray',
          prevention: 'Prevention'
        },
        actions: {
          save: 'Save Scan',
          saved: 'Scan Saved',
          share: 'Share Result',
          newScan: 'New Scan',
          learnMore: 'Learn More'
        },
        lowConfidenceBanner: 'Not fully sure — this may be {{name}}. Retake in better light for a clearer result.',
        oodTitle: 'Not a Crop Leaf',
        oodDesc: "That doesn't look like a crop leaf. Point the camera at a single leaf and try again.",
        tryAgain: 'Try Again',
        feedbackTitle: 'Was this diagnosis correct?',
        feedbackToast: 'Thank you for your feedback!'
      },
      library: {
        searchPlaceholder: 'Search diseases, symptoms, crops...',
        allCrops: 'All Crops',
        healthyDot: 'Healthy',
        sickDot: 'Infected',
        symptoms: 'Symptoms',
        pathogen: 'Pathogen',
        cause: 'Common Cause',
        lifecycle: 'Disease Lifecycle',
        confusedWith: 'Commonly Confused With'
      },
      settings: {
        title: 'Settings',
        language: 'App Language',
        about: 'About CropDoc AI',
        aboutDesc: 'A premium, field-ready crop health-tech tool designed to provide clinical-level diagnosis for smallholder farmers.',
        team: 'Development Team',
        teamMembers: 'Jai Karthick & Rishabh Rana',
        version: 'Version',
        clearHistory: 'Clear Scan History',
        clearWarning: 'This action is permanent. All saved scan data will be deleted.',
        clearConfirm: 'Yes, Delete Everything',
        cancel: 'Cancel',
        pwaInstall: 'Install CropDoc App'
      }
    }
  },
  hi: {
    translation: {
      appName: 'क्रॉपडॉक AI',
      nav: {
        scan: 'स्कैन',
        history: 'इतिहास',
        library: 'पुस्तकालय',
        settings: 'सेटिंग्स'
      },
      onboarding: {
        skip: 'छोड़ें',
        getStarted: 'शुरू करें',
        card1: {
          title: 'पत्ती का फोटो लें',
          desc: 'प्राकृतिक धूप में किसी भी फसल की एक अकेली पत्ती का साफ और पास से फोटो लें।'
        },
        card2: {
          title: 'जांच रिपोर्ट पाएं',
          desc: 'हमारा उन्नत क्लिनिकल एआई पत्तियों का विश्लेषण कर बीमारी की पहचान सटीकता से करता है।'
        },
        card3: {
          title: 'समय पर इलाज',
          desc: 'फसल और परिवार की सुरक्षा के लिए तुरंत जैविक और रासायनिक उपचार प्राप्त करें।'
        }
      },
      home: {
        scanCTA: 'पत्ती स्कैन करें',
        cameraTip: 'पत्ती से फ्रेम भरें, अच्छी रोशनी रखें, हाथ स्थिर रखें।',
        takePhoto: 'फोटो खींचें',
        uploadGallery: 'गैलरी से अपलोड करें',
        recentScans: 'हाल के स्कैन',
        emptyScans: 'आपके स्कैन यहां दिखाई देंगे।',
        blurryTitle: 'फोटो धुंधली लग रही है',
        blurryDesc: 'धुंधली फोटो से रिपोर्ट की सटीकता कम हो सकती है। हम इसे फिर से लेने की सलाह देते हैं।',
        useAnyway: 'वैसे ही उपयोग करें',
        retake: 'फिर से फोटो लें'
      },
      analyzing: {
        cancel: 'जांच रद्द करें',
        uploading: 'फोटो अपलोड हो रही है...',
        analyzing: 'पत्ती का विश्लेषण जारी...',
        identifying: 'बीमारी की पहचान हो रही है...',
        preparing: 'उपचार योजना तैयार हो रही है...',
        slowConnection: 'धीमा इंटरनेट... कनेक्शन जांचें',
        retry: 'पुनः प्रयास करें'
      },
      result: {
        confidence: 'एआई भरोसा',
        confidenceBand: {
          high: 'उच्च भरोसा (≥80%)',
          medium: 'मध्यम भरोसा (60-79%)',
          low: 'कम भरोसा (<60%)'
        },
        severity: {
          title: 'गंभीरता',
          healthy: 'स्वस्थ',
          mild: 'हल्की गंभीरता',
          severe: 'अत्यधिक गंभीर'
        },
        urgency: '{{days}} दिनों के भीतर कार्रवाई करें',
        healthyResult: 'यह पत्ती स्वस्थ है! सामान्य रखरखाव जारी रखें।',
        evidence: 'एआई हीटमैप सबूत',
        togglePhoto: 'मूल फोटो',
        toggleHeatmap: 'एआई हीटमैप',
        heatmapSlider: 'हीटमैप चमक',
        heatmapCaption: 'लाल रंग के क्षेत्रों ने निदान को सबसे अधिक प्रभावित किया।',
        heatmapLegendLow: 'कम प्रभाव',
        heatmapLegendHigh: 'अधिक प्रभाव',
        topPredictions: 'अन्य संभावित बीमारियां',
        treatmentTitle: 'उपचार योजना',
        tabs: {
          organic: 'जैविक देखभाल',
          chemical: 'रासायनिक छिड़काव',
          prevention: 'बचाव तरीके'
        },
        actions: {
          save: 'स्कैन सहेजें',
          saved: 'सहेज लिया गया',
          share: 'रिपोर्ट साझा करें',
          newScan: 'नया स्कैन',
          learnMore: 'विस्तृत जानकारी'
        },
        lowConfidenceBanner: 'पूरी तरह निश्चित नहीं — यह {{name}} हो सकता है। स्पष्ट रिपोर्ट के लिए बेहतर रोशनी में फिर फोटो लें।',
        oodTitle: 'फसल की पत्ती नहीं है',
        oodDesc: 'यह किसी फसल की पत्ती नहीं लग रही है। कैमरे को एक पत्ती पर केंद्रित करें और पुनः प्रयास करें।',
        tryAgain: 'फिर से प्रयास करें',
        feedbackTitle: 'क्या यह रिपोर्ट सही थी?',
        feedbackToast: 'आपकी प्रतिक्रिया के लिए धन्यवाद!'
      },
      library: {
        searchPlaceholder: 'बीमारी, लक्षण या फसल खोजें...',
        allCrops: 'सभी फसलें',
        healthyDot: 'स्वस्थ',
        sickDot: 'संक्रमित',
        symptoms: 'लक्षण',
        pathogen: 'रोगज़नक़',
        cause: 'सामान्य कारण',
        lifecycle: 'बीमारी का चक्र',
        confusedWith: 'भ्रमित करने वाली बीमारियां'
      },
      settings: {
        title: 'सेटिंग्स',
        language: 'ऐप की भाषा',
        about: 'क्रॉपडॉक AI के बारे में',
        aboutDesc: 'छोटे किसानों के लिए तैयार किया गया एक प्रीमियम, क्षेत्र-उपयोगी फसल स्वास्थ्य-तकनीक उपकरण जो क्लिनिकल-स्तरीय निदान प्रदान करता है।',
        team: 'विकासक टीम',
        teamMembers: 'जय कार्तिकेय और ऋषभ राणा',
        version: 'संस्करण',
        clearHistory: 'स्कैन इतिहास मिटाएं',
        clearWarning: 'यह कार्रवाई स्थायी है। सहेजे गए सभी स्कैन हटा दिए जाएंगे।',
        clearConfirm: 'हाँ, सब मिटाएं',
        cancel: 'रद्द करें',
        pwaInstall: 'क्रॉपडॉक ऐप इंस्टॉल करें'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('cropdoc_language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
