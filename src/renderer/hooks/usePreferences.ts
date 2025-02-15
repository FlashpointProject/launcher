import { PreferencesContext } from "@renderer/context/PreferencesContext";
import { AppPreferencesData } from "flashpoint-launcher";
import { useContext } from "react";

export function usePreferences(): AppPreferencesData {
  const preferences = useContext(PreferencesContext);
  return preferences;
}