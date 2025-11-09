/* FILE: extensions/plugins/gesture-vision-plugin-home-assistant/frontend/action-display-details.ts */
import type { PluginUIContext } from '#frontend/types/index.js';
import type { HaActionInstanceSettings } from '../schemas.js';
import type { ActionDisplayDetail } from '#shared/index.js';

/**
 * Generates the display details for a Home Assistant action card.
 * @param settings - The action-specific settings.
 * @param context - The plugin UI context.
 * @returns An array of details to display.
 */
export function getHaActionDisplayDetails(
  settings: unknown, // Must accept unknown to match the ActionDisplayDetailsRendererFn type
  context: PluginUIContext
): ActionDisplayDetail[] {
  const typedSettings = settings as HaActionInstanceSettings;
  const { translate } = context.services.translationService;
  
  if (!typedSettings?.entityId || !typedSettings?.service) {
    return [{ icon: 'error_outline', value: translate("invalidHaActionSettings") }];
  }

  const commonServices: Record<string, string> = {
    "toggle": translate("toggle"),
    "turn_on": translate("turn_on"),
    "turn_off": translate("turn_off"),
  };
  
  const serviceDisplayName = commonServices[typedSettings.service] || typedSettings.service;
  
  return [
    { icon: 'mdi-power-plug', iconType: 'mdi', value: typedSettings.entityId },
    { icon: 'mdi-cogs', iconType: 'mdi', value: `${translate("Service")}: ${serviceDisplayName}` },
  ];
}