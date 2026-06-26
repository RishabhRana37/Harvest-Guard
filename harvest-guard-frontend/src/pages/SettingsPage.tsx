import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Trash2, Shield, Users, Info, Smartphone } from 'lucide-react';
import { clearAllScans } from '../utils/db';
import { BottomSheet } from '../components/shared/BottomSheet';
import { Toast } from '../components/shared/Toast';
import type { ToastType } from '../components/shared/Toast';

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [isClearSheetOpen, setIsClearSheetOpen] = useState(false);

  // PWA Install State
  const [installPromptAvailable, setInstallPromptAvailable] = useState<boolean>(
    !!(window as any).deferredInstallPrompt
  );

  useEffect(() => {
    const handleInstallPrompt = () => {
      setInstallPromptAvailable(true);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  const handleInstallApp = () => {
    const promptEvent = (window as any).deferredInstallPrompt;
    if (!promptEvent) return;
    promptEvent.prompt();
    promptEvent.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPromptAvailable(false);
        (window as any).deferredInstallPrompt = null;
      }
    });
  };

  // Toast State
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg: string, type: ToastType = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
    localStorage.setItem('cropdoc_language', lang);
    triggerToast(`Language switched to ${lang === 'hi' ? 'Hindi / हिंदी' : 'English'}!`);
  };

  const handleClearHistory = async () => {
    try {
      await clearAllScans();
      setIsClearSheetOpen(false);
      triggerToast('All scan history has been deleted.', 'success');
      // Dispatch storage event to notify other pages
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Failed to clear database:', error);
      triggerToast('Failed to clear database.', 'error');
    }
  };


  return (
    <div className="flex flex-col gap-5 w-full pb-8 select-none">
      
      {/* Toast notifications */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

      {/* Language Toggle section */}
      <div className="bg-surface rounded-16 p-4 border border-border shadow-sm flex flex-col gap-3">
        <h3 className="text-base font-bold text-text-strong flex items-center gap-2 border-b border-border/60 pb-2.5">
          <Globe className="w-5 h-5 text-green-700" />
          {t('settings.language')}
        </h3>
        
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => handleLanguageChange('en')}
            className={`py-3 px-4 rounded-12 text-sm font-bold shadow-sm transition-all border min-h-[44px] ${
              currentLang === 'en'
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-surface text-text-strong border-border hover:bg-surface-alt'
            }`}
          >
            English
          </button>
          
          <button
            onClick={() => handleLanguageChange('hi')}
            className={`py-3 px-4 rounded-12 text-sm font-bold shadow-sm transition-all border min-h-[44px] ${
              currentLang === 'hi'
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-surface text-text-strong border-border hover:bg-surface-alt'
            }`}
          >
            हिन्दी (Hindi)
          </button>
        </div>
      </div>

      {/* About Application details */}
      <div className="bg-surface rounded-16 p-4 border border-border shadow-sm flex flex-col gap-3.5">
        <h3 className="text-base font-bold text-text-strong flex items-center gap-2 border-b border-border/60 pb-2.5">
          <Shield className="w-5 h-5 text-green-700" />
          {t('settings.about')}
        </h3>

        <div className="flex flex-col gap-3 text-sm text-text-strong leading-relaxed font-medium">
          <p className="text-text-muted text-sm leading-relaxed">
            {t('settings.aboutDesc')}
          </p>
          
          <div className="flex items-center gap-2 border-t border-border/50 pt-3">
            <Users className="w-4 h-4 text-green-500 shrink-0" />
            <div>
              <span className="text-xs text-text-muted block">{t('settings.team')}</span>
              <strong className="text-sm font-bold text-text-strong">{t('settings.teamMembers')}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-border/50 pt-3">
            <Info className="w-4 h-4 text-green-500 shrink-0" />
            <div>
              <span className="text-xs text-text-muted block">{t('settings.version')}</span>
              <strong className="text-sm font-bold text-text-strong">1.0.0 (Hackathon Build)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* PWA Install Trigger */}
      {installPromptAvailable && (
        <div className="bg-surface rounded-16 p-4 border border-border shadow-sm flex flex-col gap-3">
          <button
            onClick={handleInstallApp}
            className="flex items-center justify-center gap-2 w-full bg-green-700 hover:bg-green-500 text-white font-bold py-3.5 px-6 rounded-12 transition-all min-h-[48px] text-base"
          >
            <Smartphone className="w-5 h-5" />
            {t('settings.pwaInstall')}
          </button>
        </div>
      )}

      {/* Destructive reset trigger */}
      <div className="bg-surface rounded-16 p-4 border border-border shadow-sm flex flex-col gap-3">
        <button
          onClick={() => setIsClearSheetOpen(true)}
          className="flex items-center justify-center gap-2 w-full bg-sev-severe/10 border border-sev-severe/30 text-sev-severe hover:bg-sev-severe/20 font-bold py-3.5 px-6 rounded-12 transition-all min-h-[48px] text-base"
        >
          <Trash2 className="w-5 h-5" />
          {t('settings.clearHistory')}
        </button>
      </div>

      {/* Bottom Sheet Confirmation dialogue */}
      <BottomSheet
        isOpen={isClearSheetOpen}
        onClose={() => setIsClearSheetOpen(false)}
        title={t('settings.clearHistory')}
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-text-muted leading-relaxed">
            {t('settings.clearWarning')}
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={() => setIsClearSheetOpen(false)}
              className="flex-1 bg-surface-alt hover:bg-border/50 text-text-strong border border-border font-semibold py-3 rounded-12 text-sm min-h-[44px]"
            >
              {t('settings.cancel')}
            </button>
            
            <button
              onClick={handleClearHistory}
              className="flex-1 bg-sev-severe text-white hover:bg-opacity-90 font-bold py-3 rounded-12 text-sm min-h-[44px]"
            >
              {t('settings.clearConfirm')}
            </button>
          </div>
        </div>
      </BottomSheet>

    </div>
  );
};
