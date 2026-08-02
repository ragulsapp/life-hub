import { createContext, useContext } from "react";

/**
 * Lets any view open a full-screen panel App.tsx owns (Settings, Search)
 * without prop-drilling through the `VIEWS` record. Lives in its own file
 * so DashboardView can import it without a cycle back to App.
 */
export const SettingsUiContext = createContext<{
  open: () => void;
  openSearch: () => void;
}>({
  open: () => {},
  openSearch: () => {},
});

export const useSettingsUi = () => useContext(SettingsUiContext);
