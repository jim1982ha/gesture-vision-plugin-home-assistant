/* FILE: extensions/plugins/gesture-vision-plugin-home-assistant/frontend/index.js */
const homeAssistantPluginFrontendModule = {
  manifest: { /* populated by loader */ },

  async init(context) {
    const { createHaActionSettingsComponent } = await import("./components/action-settings.component.js");
    const { createHaGlobalSettingsComponent } = await import("./components/global-settings.component.js");
    const { getHaActionDisplayDetails } = await import("./action-display-details.js");
    const { pubsub } = context.services;
    const { PLUGIN_CONFIG_UPDATED_EVENT_PREFIX } = context.shared.constants;
    
    const HA_PLUGIN_ID = this.manifest.id;
    let isFetchingHaData = false;
    
    const appStore = context.coreStateManager;

    const fetchHaData = async () => {
      if (isFetchingHaData) return;
      const currentHaConfig = appStore.getState().pluginGlobalConfigs.get(HA_PLUGIN_ID);
      
      console.log(`[HA Plugin] Starting fetchHaData. Config present: ${!!currentHaConfig?.url}`);
    
      if (!currentHaConfig?.url || !currentHaConfig.token) {
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
        if (!entitiesResponse.ok || !servicesResponse.ok) {
            throw new Error(`HA data fetch failed. Status: Entities=${entitiesResponse.status}, Services=${servicesResponse.status}`);
        }
        console.log(`[HA Plugin] Successfully fetched ${entities.length} entities and service domains.`);
      } catch (error) {
        haDataCache = { entities: null, services: null };
        console.error(`[HA Plugin] Fetching HA data failed.`, error);
        pubsub.publish('ui:showError', { messageKey: "haDataFetchFailed", substitutions: { message: (error instanceof Error ? error.message : String(error)) } });
      } finally {
        isFetchingHaData = false;
        appStore.getState().actions.setPluginExtData(HA_PLUGIN_ID, haDataCache);
      }
    };
    
    appStore.subscribe((newState, prevState) => {
      const newConfig = newState.pluginGlobalConfigs.get(HA_PLUGIN_ID);
      const oldConfig = prevState.pluginGlobalConfigs.get(HA_PLUGIN_ID);
      const newManifest = newState.pluginManifests.find(m => m.id === HA_PLUGIN_ID);
      const oldManifest = prevState.pluginManifests.find(m => m.id === HA_PLUGIN_ID);
      
      const configChanged = JSON.stringify(newConfig) !== JSON.stringify(oldConfig);
      const justEnabled = (!oldManifest || oldManifest.status === 'disabled') && newManifest?.status === 'enabled';

      if (configChanged) {
        console.log('[HA Plugin] Global config changed, triggering data fetch.');
        fetchHaData();
      }
      
      if (justEnabled) {
        console.log('[HA Plugin] Plugin transitioned to ENABLED state, triggering data fetch.');
        fetchHaData();
      }
    });
    
    const initialConfig = appStore.getState().pluginGlobalConfigs.get(HA_PLUGIN_ID);
    const initialManifest = appStore.getState().pluginManifests.find(m => m.id === HA_PLUGIN_ID);
    if (initialConfig && initialManifest?.status === 'enabled') {
      console.log('[HA Plugin] Initializing on page load, config present and plugin enabled.');
      await fetchHaData();
    }
    
    // Assign factories and renderers to the module instance itself
    this.createGlobalSettingsComponent = (pluginId, manifest, context) => createHaGlobalSettingsComponent(pluginId, manifest, context);
    this.createActionSettingsComponent = (pluginId, manifest, context) => createHaActionSettingsComponent(pluginId, manifest, context);
    this.getActionDisplayDetails = getHaActionDisplayDetails;
  },
};

export default homeAssistantPluginFrontendModule;