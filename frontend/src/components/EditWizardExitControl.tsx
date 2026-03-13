import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';

interface EditWizardExitControlProps {
    visible: boolean;
    onSaveAndExit: () => Promise<void> | void;
    onExitWithoutSaving: () => void;
}

const EditWizardExitControl: React.FC<EditWizardExitControlProps> = ({ visible, onSaveAndExit, onExitWithoutSaving }) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    if (!visible) return null;

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>{t('Wyjdź', 'Exit')}</span>
            </button>

            {isOpen &&
                createPortal(
                    <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-[28rem] rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800">
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('Wyjść z edycji projektu?', 'Leave project editing?')}</h3>
                                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                                    {t(
                                        'Możesz zapisać obecne zmiany i wrócić do listy projektów albo wyjść bez zapisywania.',
                                        'You can save the current changes and return to the project list, or leave without saving.'
                                    )}
                                </p>
                            </div>

                            <div className="px-6 py-5 flex flex-col sm:flex-row justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="h-10 px-4 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-slate-800"
                                >
                                    {t('Zostań', 'Stay')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        onExitWithoutSaving();
                                    }}
                                    className="h-10 px-4 rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    {t('Wyjdź bez zapisywania', 'Leave without saving')}
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setIsSaving(true);
                                        try {
                                            await onSaveAndExit();
                                        } finally {
                                            setIsSaving(false);
                                        }
                                    }}
                                    disabled={isSaving}
                                    className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? t('Zapisywanie...', 'Saving...') : t('Zapisz i wyjdź', 'Save and exit')}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
};

export default EditWizardExitControl;