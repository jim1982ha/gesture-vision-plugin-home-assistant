/* FILE: extensions/plugins/gesture-vision-plugin-home-assistant/frontend/index.js */
'use strict';

// Ensure the global registry exists
if (!window.GestureVisionPlugins) {
  window.GestureVisionPlugins = {};
}

// Import dependencies at the top level, as is standard for ES modules.
import { getHaActionDisplayDetails } from "./action-display-details.js";

// Define the module object directly.
const homeAssistantPluginFrontendModule = {
  manifest: { /* populated by loader */ },

  async init(context) {
    const { pubsub } = context.services;
    const HA_PLUGIN_ID = this.manifest.id;
    let isFetchingHaData = false;
    const appStore = context.coreStateManager;

    const fetchHaData = async () => {
      if (isFetchingHaData) return;
      const currentHaConfig = appStore.getState().pluginGlobalConfigs.get(HA_PLUGIN_ID);
      
      if (!currentHaConfig?.url || !currentHaConfig.token) {
        appStore.getState().actions.setPluginExtData(HA_PLUGIN_ID, { entities: null, services: null });
        pubsub.publish('PLUGIN_EXT_DATA_UPDATED', HA_PLUGIN_ID);
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
        console.error(`[HA Plugin] Fetching HA data failed.`, error);
        pubsub.publish('ui:showError', { messageKey: "haDataFetchFailed", substitutions: { message: (error instanceof Error ? error.message : String(error)) } });
      } finally {
        isFetchingHaData = false;
        appStore.getState().actions.setPluginExtData(HA_PLUGIN_ID, haDataCache);
        // Broadcast that this plugin's data has been updated.
        pubsub.publish('PLUGIN_EXT_DATA_UPDATED', HA_PLUGIN_ID);
      }
    };
    
    appStore.subscribe((newState, prevState) => {
      const newConfig = newState.pluginGlobalConfigs.get(HA_PLUGIN_ID);
      const oldConfig = prevState.pluginGlobalConfigs.get(HA_PLUGIN_ID);
      const newManifest = newState.pluginManifests.find(m => m.id === HA_PLUGIN_ID);
      const oldManifest = prevState.pluginManifests.find(m => m.id === HA_PLUGIN_ID);
      const configChanged = JSON.stringify(newConfig) !== JSON.stringify(oldConfig);
      const justEnabled = (!oldManifest || oldManifest.status === 'disabled') && newManifest?.status === 'enabled';
      if (configChanged || justEnabled) fetchHaData();
    });
    
    const initialConfig = appStore.getState().pluginGlobalConfigs.get(HA_PLUGIN_ID);
    const initialManifest = appStore.getState().pluginManifests.find(m => m.id === HA_PLUGIN_ID);
    if (initialConfig && initialManifest?.status === 'enabled') await fetchHaData();
  },

  getActionDisplayDetails: getHaActionDisplayDetails,

  createGlobalSettingsComponent: (pluginId, manifest, context) => {
    const { BasePluginGlobalSettingsComponent } = context.uiComponents;
    const haGlobalSettingsFields = [
      { id: 'url', type: 'url', labelKey: 'haUrl', placeholderKey: 'haUrlPlaceholder', autocomplete: 'url' },
      { id: 'token', type: 'password', labelKey: 'accessToken', autocomplete: 'new-password' }
    ];

    const component = new BasePluginGlobalSettingsComponent(pluginId, manifest, context, haGlobalSettingsFields);
    component.validateForm = function() {
      const { translate } = this.context.services;
      const values = this.getFormValues();
      const errors = [];
      if (values.url && !values.token) errors.push(translate("haTokenRequiredWithUrl"));
      if (!values.url && values.token) errors.push(translate("haUrlRequiredWithToken"));
      try { if (values.url) new URL(values.url); } 
      catch { errors.push(translate("haUrlInvalid")); }
      return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
    };
    return component;
  },

  actionSettingsFields: (context) => {
    const { coreStateManager, services } = context;
    const { translate } = services;
    
    const getHaData = () => coreStateManager.getState().pluginExtDataCache.get('gesture-vision-plugin-home-assistant');
    const isHaReady = () => {
        const data = getHaData();
        return data && data.entities && data.services;
    };

    const fetchDomains = async (_ctx, _currentSettings, filterText) => {
      if (!isHaReady()) return [{ value: "", label: translate("haNotConnectedErrorShort"), disabled: true }];
      const haData = getHaData();
      const allDomains = new Set((haData.entities || []).map(e => e.entity_id.split('.')[0]).filter(Boolean));
      return [...allDomains]
        .filter(d => !filterText || d.toLowerCase().includes(filterText.toLowerCase()))
        .sort().map(d => ({ value: d, label: d }));
    };

    const fetchEntities = async (_ctx, currentSettings, filterText) => {
      const domain = currentSettings?.domain;
      if (typeof domain !== 'string' || !domain.trim()) {
        return [{ value: "", label: translate("Select_Domain"), disabled: true }];
      }
      if (!isHaReady()) return [{ value: "", label: translate("haNotConnectedErrorShort"), disabled: true }];
      const haData = getHaData();
      return (haData.entities || [])
        .filter(e => e.entity_id.startsWith(`${domain}.`) && (!filterText || `${e.attributes?.friendly_name || e.entity_id}`.toLowerCase().includes(filterText.toLowerCase())))
        .sort((a, b) => String(a.attributes?.friendly_name || a.entity_id).localeCompare(String(b.attributes?.friendly_name || b.entity_id)))
        .map(e => ({ value: e.entity_id, label: `${e.attributes?.friendly_name || e.entity_id}` }));
    };

    const fetchServices = async (_ctx, currentSettings, filterText) => {
      const entityId = currentSettings?.entityId;
      if (typeof entityId !== 'string' || !entityId.trim()) {
        return [{ value: "", label: translate("Select_Entity"), disabled: true }];
      }
      if (!isHaReady()) return [{ value: "", label: translate("haNotConnectedErrorShort"), disabled: true }];
      const haData = getHaData();
      const domain = entityId.split('.')[0];
      const domainServices = haData.services?.[domain] || {};
      const serviceNames = Object.keys(domainServices).sort();
      const commonServices = ["toggle", "turn_on", "turn_off"];
      return serviceNames
        .map(s => ({ value: s, label: commonServices.includes(s) ? translate(s, { defaultValue: s }) : s }))
        .filter(item => !filterText || item.label.toLowerCase().includes(filterText.toLowerCase()) || item.value.toLowerCase().includes(filterText.toLowerCase()));
    };

    return [
      { id: 'domain', type: 'select', labelKey: 'haDomain', optionsSource: fetchDomains, placeholderKey: 'filterDomainPlaceholder', required: true },
      { id: 'entityId', type: 'select', labelKey: 'haEntity', optionsSource: fetchEntities, dependsOn: ['domain'], placeholderKey: 'filterEntityPlaceholder', required: true },
      { id: 'service', type: 'select', labelKey: 'haService', optionsSource: fetchServices, dependsOn: ['entityId'], placeholderKey: 'filterServicePlaceholder', required: true }
    ];
  },
};

// Register the module with the global registry synchronously.
window.GestureVisionPlugins['gesture-vision-plugin-home-assistant'] = homeAssistantPluginFrontendModule;