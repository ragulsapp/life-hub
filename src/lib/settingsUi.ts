import { createContext, useContext } from "react";

/**
 * Lets any view open the Settings panel without prop-drilling through the
 * `VIEWS` record in App.tsx. Lives in its own file so DashboardView can
 * import it without a cycle back to App.
 */
export const SettingsUiContext = createContext<{ open: () => void }>({
  open: () => {},
});

export const useSettingsUi = () => useContext(SettingsUiContext);
