export const PROJECT_CREATION_DIRTY_KEY = "projectCreationDirty";

export const setProjectCreationDirty = (isDirty: boolean) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(PROJECT_CREATION_DIRTY_KEY, isDirty ? "true" : "false");
};

export const getProjectCreationDirty = () => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(PROJECT_CREATION_DIRTY_KEY) === "true";
};

export const clearProjectCreationDirty = () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(PROJECT_CREATION_DIRTY_KEY);
};