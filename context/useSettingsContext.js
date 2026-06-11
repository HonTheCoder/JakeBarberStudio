import { useContext } from "react";
import { SettingsContext } from "./SettingsContext";

/** Drop-in replacement for the old `useSettings()` call. */
export const useSettingsContext = () => useContext(SettingsContext);