import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { hasUnsavedProjectChanges } from '../lib/projectDrafts';
import Hypher from "hypher";
import plPatterns from "hyphenation.pl";

const PL_HYPHENATOR = new Hypher(plPatterns as any);
const SOFT_HYPHEN = "\u00AD";
const POLISH_WORD_PATTERN = /[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]{6,}/g;

const hyphenatePolish = (value: string) => {
    if (!value) return value;
    return value.replace(POLISH_WORD_PATTERN, (word) => {
        const chunks = PL_HYPHENATOR.hyphenate(word);
        return chunks.length > 1 ? chunks.join(SOFT_HYPHEN) : word;
    });
};

interface EditWizardExitControlProps {
    visible: boolean;
    onSaveAndExit: () => Promise<void> | void;
    onExitWithoutSaving: () => void;
    /** Applied to the wrapper around the trigger button (e.g. grid placement). */
    className?: string;
}

const EditWizardExitControl: React.FC<EditWizardExitControlProps> = ({ visible, onSaveAndExit, onExitWithoutSaving, className }) => {
    const { t, language } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    const handleOpenExit = async () => {
        setIsChecking(true);
        try {
            const hasChanges = await hasUnsavedProjectChanges();
            if (!hasChanges) {
                onExitWithoutSaving();
                return;
            }

            setIsOpen(true);
        } catch {
            setIsOpen(true);
        } finally {
            setIsChecking(false);
        }
    };

    if (!visible) return null;

    const triggerButton = (
        <button
            type="button"
            onClick={handleOpenExit}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg pl-0 pr-2 py-1.5 sm:pl-3 sm:pr-3 sm:py-2 -mt-0.5 sm:mt-0 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
        >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>{isChecking ? t('Sprawdzanie...', 'Checking...') : t('Wróć', 'Back')}</span>
        </button>
    );

    return (
        <>
            {className ? <div className={className}>{triggerButton}</div> : triggerButton}

            {isOpen &&
                createPortal(
                    <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-[28rem] rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                            <div className="relative px-5 pt-4 pb-3">
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('Wyjść z edycji projektu?', 'Leave project editing?')}</h3>
                                <p
                                    lang={language === "pl" ? "pl-PL" : "en-US"}
                                    className="mt-3 text-sm text-gray-500 dark:text-slate-400 leading-relaxed"
                                    style={{
                                        textAlign: "justify",
                                        textJustify: "inter-word",
                                        hyphens: language === "pl" ? "manual" : "auto",
                                        WebkitHyphens: language === "pl" ? "manual" : "auto",
                                        msHyphens: language === "pl" ? "manual" : "auto",
                                        overflowWrap: "normal",
                                        wordBreak: "normal",
                                    }}
                                >
                                    {(() => {
                                        const message = t(
                                        'Możesz zapisać obecne zmiany i wrócić do listy projektów albo wyjść bez zapisywania.',
                                        'You can save the current changes and return to the project list, or leave without saving.'
                                        );
                                        return language === "pl" ? hyphenatePolish(message) : message;
                                    })()}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="absolute top-[20px] right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <span className="material-symbols-outlined text-[20px] leading-none">close</span>
                                </button>
                            </div>

                            <div className="px-5 pt-3 pb-4 flex flex-row flex-nowrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="h-10 px-3 sm:px-4 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-gray-100 dark:hover:bg-slate-800 whitespace-nowrap"
                                >
                                    {t('Zostań', 'Stay')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        onExitWithoutSaving();
                                    }}
                                    className="h-10 px-3 sm:px-4 rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-xs sm:text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 whitespace-nowrap"
                                >
                                    <span className="sm:hidden">{t('Wyjdź', 'Leave')}</span>
                                    <span className="hidden sm:inline">{t('Wyjdź bez zapisywania', 'Leave without saving')}</span>
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
                                    className="h-10 px-3 sm:px-4 rounded-lg bg-primary text-white text-xs sm:text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    {isSaving ? (
                                        t('Zapisywanie...', 'Saving...')
                                    ) : (
                                        <>
                                            <span className="sm:hidden">{t('Zapisz i wyjdź', 'Save & Exit')}</span>
                                            <span className="hidden sm:inline">{t('Zapisz i wyjdź', 'Save and exit')}</span>
                                        </>
                                    )}
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