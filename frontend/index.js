/* FILE: extensions/plugins/home-assistant/frontend/index.js */
const { createHaActionSettingsComponent } = await import("./components/action-settings.component.js");
const { createHaGlobalSettingsComponent } = await import("./components/global-settings.component.js");
const { getHaActionDisplayDetails } = await import("./action-display-details.js");
const { pubsub } = window.GestureVision.services;
const { PLUGIN_CONFIG_UPDATED_EVENT_PREFIX } = window.GestureVision.shared.constants;

const HA_PLUGIN_ID = 'home-assistant';
let isFetchingHaData = false;
let haConfig = null;

const fetchHaData = async (appStore) => {
  if (isFetchingHaData) return;
  if (!haConfig?.url || !haConfig.token) {
    appStore.getState().actions.setPluginExtData(HA_PLUGIN_ID, { entities: null, services: null });
    return;
  }

  isFetchingHaData = true;
  let haDataCache = null;
  
  try {
    const [entitiesResponse, servicesResponse] = await Promise.all([
      fetch(`/api/plugins/${HA_PLUGIN_ID}/entities`),
      fetch(`/api/plugins/${HA_PLUGIN_ID}/services`),
    ]);
    const entities = entitiesResponse.ok ? await entitiesResponse.json() : [];
    const services = servicesResponse.ok ? await servicesResponse.json() : {};
    haDataCache = { entities, services };
    if (!entitiesResponse.ok || !servicesResponse.ok) throw new Error(`HA data fetch failed. Status: Entities=${entitiesResponse.status}, Services=${servicesResponse.status}`);
  } catch (error) {
    haDataCache = { entities: null, services: null };
    pubsub.publish('ui:showError', { messageKey: "haDataFetchFailed", substitutions: { message: (error instanceof Error ? error.message : String(error)) } });
  } finally {
    isFetchingHaData = false;
    appStore.getState().actions.setPluginExtData(HA_PLUGIN_ID, haDataCache);
  }
};

const homeAssistantPluginFrontendModule = {
  manifest: { /* populated by loader */ },

  async init(context) {
    const appStore = context.coreStateManager;
    
    const HA_CONFIG_UPDATE_EVENT = `${PLUGIN_CONFIG_UPDATED_EVENT_PREFIX}${HA_PLUGIN_ID}`;
    const configUpdateHandler = (newConfig) => { 
      haConfig = newConfig; 
      fetchHaData(appStore); 
    };
    
    pubsub.subscribe(HA_CONFIG_UPDATE_EVENT, configUpdateHandler);
    
    haConfig = appStore.getState().pluginGlobalConfigs.get(HA_PLUGIN_ID);
    if (haConfig) await fetchHaData(appStore);
  },

  createGlobalSettingsComponent: (pluginId, manifest, context) => createHaGlobalSettingsComponent(pluginId, manifest, context, window.GestureVision),
  createActionSettingsComponent: (pluginId, manifest, context) => createHaActionSettingsComponent(pluginId, manifest, context, window.GestureVision),
  getActionDisplayDetails: getHaActionDisplayDetails,
};

export default homeAssistantPluginFrontendModule;