export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "skyglobe-theme";
export const THEME_ATTRIBUTE = "data-theme";

/**
 * Runs before first paint (inlined in <head>) so the page never flashes the
 * wrong theme: stored choice first, system preference otherwise.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.setAttribute("${THEME_ATTRIBUTE}",t)}catch(e){document.documentElement.setAttribute("${THEME_ATTRIBUTE}","dark")}})();`;
