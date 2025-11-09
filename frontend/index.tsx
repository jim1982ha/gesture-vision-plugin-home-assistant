/* FILE: extensions/plugins/gesture-vision-plugin-home-assistant/frontend/index.tsx */
import { getHaActionDisplayDetails } from "./action-display-details.js";
import { HaGlobalSettingsComponent } from "./GlobalSettingsComponent.js";
import type { FrontendPluginModule, PluginUIContext } from '#frontend/types/index.js';
import type { ActionSettingFieldDescriptor, ActionSettingFieldOption, PluginManifest } from '#shared/index.js';
import type { HAEntity, HAServices } from '../schemas.js';
import type { AppState } from '#frontend/core/state/app-store.js';

let unsubscribeStore: (() => void) | null = null;

const homeAssistantPluginFrontendModule: FrontendPluginModule = {
  async init(context: PluginUIContext) {
    const { pubsub, translationService } = context.services;
    const { coreStateManager } = context;
    const { translate } = translationService;
    const HA_PLUGIN_ID = context.manifest!.id;
    let isFetchingHaData = false;
    const appStore = coreStateManager;

    const fetchHaData = async () => {
      if (isFetchingHaData) return;
      const currentHaConfig = appStore.getState().pluginGlobalConfigs.get(HA_PLUGIN_ID) as { url?: string, token?: string };
      
      if (!currentHaConfig?.url || !currentHaConfig.token) {
        appStore.getState().actions.setPluginExtData(HA_PLUGIN_ID, { entities: null, services: null });
        pubsub.publish('PLUGIN_EXT_DATA_UPDATED', HA_PLUGIN_ID);
        return;
      }
    
      isFetchingHaData = true;
      let haDataCache: { entities: HAEntity[] | null, services: HAServices | null } | null = null;
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
        pubsub.publish('ui:showNotification', { message: translate('haDataRefreshed'), type: 'success' });
      } catch (error) {
        haDataCache = { entities: null, services: null };
        console.error(`[HA Plugin] Fetching HA data failed.`, error);
        pubsub.publish('ui:showError', { messageKey: "haDataFetchFailed", substitutions: { message: (error instanceof Error ? error.message : String(error)) } });
      } finally {
        isFetchingHaData = false;
        appStore.getState().actions.setPluginExtData(HA_PLUGIN_ID, haDataCache);
        pubsub.publish('PLUGIN_EXT_DATA_UPDATED', HA_PLUGIN_ID);
      }
    };
    
    pubsub.subscribe(`ha:requestDataRefresh`, fetchHaData);

    if (unsubscribeStore) unsubscribeStore();
    unsubscribeStore = appStore.subscribe((newState: AppState, prevState: AppState) => {
      const newConfig = newState.pluginGlobalConfigs.get(HA_PLUGIN_ID);
      const oldConfig = prevState.pluginGlobalConfigs.get(HA_PLUGIN_ID);
      const newManifest = newState.pluginManifests.find((m: PluginManifest) => m.id === HA_PLUGIN_ID);
      const oldManifest = prevState.pluginManifests.find((m: PluginManifest) => m.id === HA_PLUGIN_ID);
      const configChanged = JSON.stringify(newConfig) !== JSON.stringify(oldConfig);
      const justEnabled = (!oldManifest || oldManifest.status === 'disabled') && newManifest?.status === 'enabled';
      if (configChanged || justEnabled) fetchHaData();
    });
    
    const initialConfig = appStore.getState().pluginGlobalConfigs.get(HA_PLUGIN_ID);
    const initialManifest = appStore.getState().pluginManifests.find((m: PluginManifest) => m.id === HA_PLUGIN_ID);
    if (initialConfig && initialManifest?.status === 'enabled') await fetchHaData();
  },

  destroy() {
    if (unsubscribeStore) {
      unsubscribeStore();
      unsubscribeStore = null;
    }
  },

  getActionDisplayDetails: getHaActionDisplayDetails,

  GlobalSettingsComponent: HaGlobalSettingsComponent,

  actionSettingsFields: (context: PluginUIContext): ActionSettingFieldDescriptor[] => {
    const { coreStateManager, services } = context;
    const { translate } = services.translationService;
    
    const getHaData = () => coreStateManager.getState().pluginExtDataCache.get('gesture-vision-plugin-home-assistant') as { entities: HAEntity[] | null, services: HAServices | null } | undefined;
    const isHaReady = () => {
        const data = getHaData();
        return !!(data && data.entities && data.services);
    };

    const fetchDomains = async (_ctx: PluginUIContext, _currentSettings?: Record<string, unknown>, filterText?: string): Promise<ActionSettingFieldOption[]> => {
      if (!isHaReady()) return [{ value: "", label: translate("haNotConnectedErrorShort"), disabled: true }];
      const haData = getHaData();
      const allDomains = new Set((haData!.entities || []).map(e => e.entity_id.split('.')[0]).filter(Boolean));
      return [...allDomains]
        .filter(d => !filterText || d.toLowerCase().includes(filterText.toLowerCase()))
        .sort().map(d => ({ value: d, label: d }));
    };

    const fetchEntities = async (_ctx: PluginUIContext, currentSettings?: Record<string, unknown>, filterText?: string): Promise<ActionSettingFieldOption[]> => {
      const domain = currentSettings?.domain as string | undefined;
      if (!domain || !domain.trim()) {
        return [{ value: "", label: translate("Select_Domain"), disabled: true }];
      }
      if (!isHaReady()) return [{ value: "", label: translate("haNotConnectedErrorShort"), disabled: true }];
      const haData = getHaData();
      return (haData!.entities || [])
        .filter(e => e.entity_id.startsWith(`${domain}.`) && (!filterText || `${e.attributes?.friendly_name || e.entity_id}`.toLowerCase().includes(filterText.toLowerCase())))
        .sort((a, b) => String(a.attributes?.friendly_name || a.entity_id).localeCompare(String(b.attributes?.friendly_name || b.entity_id)))
        .map(e => ({ value: e.entity_id, label: `${e.attributes?.friendly_name || e.entity_id}` }));
    };

    const fetchServices = async (_ctx: PluginUIContext, currentSettings?: Record<string, unknown>, filterText?: string): Promise<ActionSettingFieldOption[]> => {
      const entityId = currentSettings?.entityId as string | undefined;
      if (!entityId || !entityId.trim()) {
        return [{ value: "", label: translate("Select_Entity"), disabled: true }];
      }
      if (!isHaReady()) return [{ value: "", label: translate("haNotConnectedErrorShort"), disabled: true }];
      const haData = getHaData();
      const domain = entityId.split('.')[0];
      const domainServices = haData!.services?.[domain] || {};
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

export default homeAssistantPluginFrontendModule;