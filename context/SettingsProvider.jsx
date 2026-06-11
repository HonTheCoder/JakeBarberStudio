import { useSettings } from "../hooks/useFirestore";
import { SettingsContext } from "./SettingsContext";

export const SettingsProvider = ({ children }) => {
  const value = useSettings();
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};