/* FILE: extensions/plugins/home-assistant/frontend/components/action-settings.component.js */
const COMMON_CONTROLLABLE_DOMAINS = ["light", "switch", "fan", "cover", "climate", "input_boolean", "script", "scene", "button", "input_select"];

export class HaActionSettingsComponent {
  #pluginId; #context; #uiContainer; #currentSettings = {};
  #domainDropdown; #entityDropdown; #serviceDropdown; #unsubscribeStore = null;
  
  #appStore; #translate; #createSearchableDropdown;

  constructor(pluginId, _manifest, context) {
    this.#pluginId = pluginId; this.#context = context;
    
    this.#appStore = context.coreStateManager;
    this.#translate = context.services.translate;
    this.#createSearchableDropdown = context.uiComponents.createSearchableDropdown;

    this.#uiContainer = document.createElement("div");
    this.#uiContainer.className = "plugin-action-settings-form ha-plugin-action-settings";
  }

  render(currentSettings, context) {
    this.#currentSettings = { ...currentSettings };
    const cachedHaData = this.#appStore.getState().pluginExtDataCache.get('home-assistant');
    this.#context = { ...context, data: { ...context.data, haEntities: cachedHaData?.entities, haServices: cachedHaData?.services } };

    this.#uiContainer.innerHTML = `
      <div class="form-group"><label for="${this.#pluginId}-domainSearch">${this.#translate("haDomain")}</label><div class="searchable-dropdown-group"><input type="text" id="${this.#pluginId}-domainSearch" class="searchable-dropdown-input" placeholder="${this.#translate("filterDomainPlaceholder")}" autocomplete="off"><input type="hidden" id="${this.#pluginId}-domainValue"><div class="dropdown-list" id="${this.#pluginId}-domainDropdownList"></div></div></div>
      <div class="form-group"><label for="${this.#pluginId}-entitySearch">${this.#translate("haEntity")}</label><div class="searchable-dropdown-group"><input type="text" id="${this.#pluginId}-entitySearch" class="searchable-dropdown-input" placeholder="${this.#translate("filterEntityPlaceholder")}" autocomplete="off" disabled><input type="hidden" id="${this.#pluginId}-entityValue"><div class="dropdown-list" id="${this.#pluginId}-entityDropdownList"></div></div></div>
      <div class="form-group"><label for="${this.#pluginId}-serviceSearch">${this.#translate("haService")}</label><div class="searchable-dropdown-group"><input type="text" id="${this.#pluginId}-serviceSearch" class="searchable-dropdown-input" placeholder="${this.#translate("filterServicePlaceholder")}" autocomplete="off" disabled><input type="hidden" id="${this.#pluginId}-serviceValue"><div class="dropdown-list" id="${this.#pluginId}-serviceDropdownList"></div></div></div>
    `;
    this.#initializeDropdowns();
    this.#ensureSubscriptions();
    return this.#uiContainer;
  }

  #initializeDropdowns() {
    this.#domainDropdown = this.#createSearchableDropdown({
      inputElement: this.#uiContainer.querySelector(`#${this.#pluginId}-domainSearch`),
      listElement: this.#uiContainer.querySelector(`#${this.#pluginId}-domainDropdownList`),
      valueElement: this.#uiContainer.querySelector(`#${this.#pluginId}-domainValue`),
      fetchItemsFn: (filter) => this.#fetchDomains(filter),
      onItemSelectFn: () => this.#onDomainSelect(),
      inputPlaceholder: "filterDomainPlaceholder",
      disabledPlaceholder: "haNotConnectedErrorShort"
    });

    this.#entityDropdown = this.#createSearchableDropdown({
      inputElement: this.#uiContainer.querySelector(`#${this.#pluginId}-entitySearch`),
      listElement: this.#uiContainer.querySelector(`#${this.#pluginId}-entityDropdownList`),
      valueElement: this.#uiContainer.querySelector(`#${this.#pluginId}-entityValue`),
      fetchItemsFn: (filter) => this.#fetchEntities(filter),
      onItemSelectFn: () => this.#onEntitySelect(),
      inputPlaceholder: "filterEntityPlaceholder",
      disabledPlaceholder: "Select_Domain"
    });

    this.#serviceDropdown = this.#createSearchableDropdown({
      inputElement: this.#uiContainer.querySelector(`#${this.#pluginId}-serviceSearch`),
      listElement: this.#uiContainer.querySelector(`#${this.#pluginId}-serviceDropdownList`),
      valueElement: this.#uiContainer.querySelector(`#${this.#pluginId}-serviceValue`),
      fetchItemsFn: (filter) => this.#fetchServices(filter),
      onItemSelectFn: () => {},
      inputPlaceholder: "filterServicePlaceholder",
      disabledPlaceholder: "Select_Entity"
    });

    this.#populateInitialValues();
    this.#updateAllDropdownStates();
  }

  #isHaReady = () => {
    const haConfig = this.#appStore.getState().pluginGlobalConfigs.get("home-assistant");
    const haData = this.#context.data;
    return !!(haConfig?.url && haConfig.token && haData?.haEntities?.length > 0 && haData.haServices);
  };
  
  #fetchDomains = async (filterText) => {
    if (!this.#isHaReady()) return [{ value: "", label: this.#translate("haNotConnectedErrorShort"), disabled: true }];
    const haData = this.#context.data;
    const allEntityDomains = new Set((haData?.haEntities || []).map(e => (e.domain || e.entity_id?.split('.')[0])).filter(Boolean));
    return [...allEntityDomains].filter(d => COMMON_CONTROLLABLE_DOMAINS.includes(d) && (!filterText || d.toLowerCase().includes(filterText.toLowerCase()))).sort().map(d => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }));
  };

  #fetchEntities = async (filterText) => {
    const selectedDomain = this.#uiContainer.querySelector(`#${this.#pluginId}-domainValue`).value;
    if (!selectedDomain) return [{ value: "", label: this.#translate("Select_Domain"), disabled: true }];
    if (!this.#isHaReady()) return [{ value: "", label: this.#translate("haNotConnectedErrorShort"), disabled: true }];
    const haData = this.#context.data;
    return (haData?.haEntities || []).filter(e => (e.domain || e.entity_id?.split('.')[0]) === selectedDomain && (!filterText || `${e.attributes?.friendly_name || e.entity_id} (${e.entity_id})`.toLowerCase().includes(filterText.toLowerCase()))).sort((a, b) => String(a.attributes?.friendly_name || a.entity_id).localeCompare(String(b.attributes?.friendly_name || b.entity_id))).map(e => ({ value: e.entity_id, label: `${e.attributes?.friendly_name || e.entity_id} (${e.entity_id})` }));
  };

  #fetchServices = async (filterText) => {
    const selectedEntityId = this.#uiContainer.querySelector(`#${this.#pluginId}-entityValue`).value;
    if (!selectedEntityId) return [{ value: "", label: this.#translate("Select_Entity"), disabled: true }];
    if (!this.#isHaReady()) return [{ value: "", label: this.#translate("haNotConnectedErrorShort"), disabled: true }];
    const haData = this.#context.data;
    const domain = selectedEntityId.split('.')[0];
    const domainServices = haData.haServices?.[domain] || {};
    const serviceNames = Object.keys(domainServices).sort();
    const commonServices = ["toggle", "turn_on", "turn_off"];
    return serviceNames.map(s => ({ value: s, label: commonServices.includes(s) ? this.#translate(s, { defaultValue: s }) : s })).filter(item => !filterText || item.label.toLowerCase().includes(filterText.toLowerCase()) || item.value.toLowerCase().includes(filterText.toLowerCase()));
  };

  #onDomainSelect = () => { this.#clearValue(this.#entityDropdown, 'entity'); this.#onEntitySelect(); };
  #onEntitySelect = () => { this.#clearValue(this.#serviceDropdown, 'service'); this.#updateAllDropdownStates(); };
  #clearValue = (dropdown, type) => {
    const searchInput = this.#uiContainer.querySelector(`#${this.#pluginId}-${type}Search`);
    const valueInput = this.#uiContainer.querySelector(`#${this.#pluginId}-${type}Value`);
    if (searchInput) searchInput.value = ''; if (valueInput) valueInput.value = '';
    dropdown.refresh();
  };

  #updateAllDropdownStates() {
    this.#domainDropdown?.setDisabled(!this.#isHaReady(), this.#translate("haNotConnectedErrorShort"));
    this.#entityDropdown?.setDisabled(!this.#uiContainer.querySelector(`#${this.#pluginId}-domainValue`)?.value, this.#translate("Select_Domain"));
    this.#serviceDropdown?.setDisabled(!this.#uiContainer.querySelector(`#${this.#pluginId}-entityValue`)?.value, this.#translate("Select_Entity"));
  }
  
  #populateInitialValues() {
    const { entityId, service } = this.#currentSettings;
    const domain = entityId?.split('.')[0] || "";
    if (domain) {
      this.#uiContainer.querySelector(`#${this.#pluginId}-domainValue`).value = domain;
      this.#uiContainer.querySelector(`#${this.#pluginId}-domainSearch`).value = domain.charAt(0).toUpperCase() + domain.slice(1);
    }
    if (entityId) {
      const entity = (this.#context.data?.haEntities || []).find(e => e.entity_id === entityId);
      this.#uiContainer.querySelector(`#${this.#pluginId}-entityValue`).value = entityId;
      this.#uiContainer.querySelector(`#${this.#pluginId}-entitySearch`).value = entity ? `${entity.attributes?.friendly_name || entity.entity_id} (${entity.entity_id})` : entityId;
    }
    if (service) {
      const commonServices = ["toggle", "turn_on", "turn_off"];
      this.#uiContainer.querySelector(`#${this.#pluginId}-serviceValue`).value = service;
      this.#uiContainer.querySelector(`#${this.#pluginId}-serviceSearch`).value = commonServices.includes(service) ? this.#translate(service, { defaultValue: service }) : service;
    }
    this.#domainDropdown?.refresh(); this.#entityDropdown?.refresh(); this.#serviceDropdown?.refresh();
  }
  
  #ensureSubscriptions() {
    if (this.#unsubscribeStore) this.#unsubscribeStore();
    this.#unsubscribeStore = this.#appStore.subscribe(state => {
      const haData = state.pluginExtDataCache.get('home-assistant');
      if (haData) {
        this.#context = { ...this.#context, data: { haEntities: haData.entities, haServices: haData.services } };
        this.#updateAllDropdownStates();
      }
    });
  }

  getActionSettingsToSave() {
    const entityId = this.#uiContainer.querySelector(`#${this.#pluginId}-entityValue`)?.value;
    const service = this.#uiContainer.querySelector(`#${this.#pluginId}-serviceValue`)?.value;
    return (entityId && service) ? { entityId, service } : null;
  }
  validate() {
    const s = this.getActionSettingsToSave(); const e = [];
    if (!s?.entityId) e.push(`${this.#translate("haEntity")} ${this.#translate("isRequired")}`);
    if (!s?.service) e.push(`${this.#translate("haService")} ${this.#translate("isRequired")}`);
    return { isValid: e.length === 0, errors: e.length > 0 ? e : undefined };
  }
  applyTranslations() {
    if (!this.#uiContainer.isConnected) return;
    ['domain', 'entity', 'service'].forEach(k => { const el = this.#uiContainer.querySelector(`label[for="${this.#pluginId}-${k}Search"]`); if (el) el.textContent = this.#translate(`ha${k.charAt(0).toUpperCase() + k.slice(1)}`); });
    this.#domainDropdown.applyTranslations?.(); this.#entityDropdown.applyTranslations?.(); this.#serviceDropdown.applyTranslations?.();
    this.#populateInitialValues();
  }
  destroy() { if (this.#unsubscribeStore) this.#unsubscribeStore(); this.#uiContainer.innerHTML = ""; }
}
export const createHaActionSettingsComponent = (pluginId, manifest, context) => new HaActionSettingsComponent(pluginId, manifest, context);