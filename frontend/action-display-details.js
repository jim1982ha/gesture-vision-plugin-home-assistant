/* FILE: extensions/plugins/gesture-vision-plugin-home-assistant/frontend/action-display-details.js */
'use strict';

/**
 * Generates the display details for a Home Assistant action card.
 * @param {object} settings - The action-specific settings.
 * @param {import('#frontend/types/index.js').PluginUIContext} context - The plugin UI context.
 * @returns {import('#shared/index.js').ActionDisplayDetail[]} An array of details to display.
 */
export function getHaActionDisplayDetails(settings, context) {
  const { translate } = context.services.translationService;
  
  if (!settings?.entityId || !settings?.service) {
    return [{ icon: 'error_outline', value: translate("invalidHaActionSettings") }];
  }

  const commonServices = {
    "toggle": translate("toggle", { defaultValue: "Toggle" }),
    "turn_on": translate("turn_on", { defaultValue: "Turn On" }),
    "turn_off": translate("turn_off", { defaultValue: "Turn Off" }),
  };
  
  const serviceDisplayName = commonServices[settings.service] || settings.service;
  
  return [
    { icon: 'mdi-power-plug', iconType: 'mdi', value: settings.entityId },
    { icon: 'mdi-cogs', iconType: 'mdi', value: `${translate("Service")}: ${serviceDisplayName}` },
  ];
}