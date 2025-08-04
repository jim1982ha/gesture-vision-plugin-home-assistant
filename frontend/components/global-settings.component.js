/* FILE: extensions/plugins/home-assistant/frontend/components/global-settings.component.js */
export class HaGlobalSettingsComponent {
    #formFieldsManager; #viewManager; #baseComponent;

    constructor(pluginId, manifest, context) {
        // Use the generic BasePluginGlobalSettingsComponent from the context
        const BaseComponent = context.uiComponents.BasePluginGlobalSettingsComponent;
        this.#baseComponent = new BaseComponent(pluginId, manifest, context);
        
        // Use our specific field and view renderers
        this.#formFieldsManager = new HaGlobalSettingsFormFields(pluginId, context.services.translate);
        this.#viewManager = new HaGlobalSettingsView(context.services.translate);

        // Override the base component's methods with our specific implementations
        this.#baseComponent.renderFormFields = this.renderFormFields.bind(this);
        this.#baseComponent.renderViewContent = this.renderViewContent.bind(this);
        this.#baseComponent.getFormValues = this.getFormValues.bind(this);
        this.#baseComponent.populateForm = this.populateForm.bind(this);
        this.#baseComponent.validateForm = this.validateForm.bind(this);
        this.#baseComponent.applyTranslationToFields = this.applyTranslationToFields.bind(this);
    }
    
    // --- Public API that delegates to the base component ---
    render(config, context) { return this.#baseComponent.render(config, context); }
    onConfigUpdate(newConfig) { this.#baseComponent.onConfigUpdate(newConfig); }
    destroy() { this.#baseComponent.destroy(); }
    
    // --- Method Overrides for the Base Component ---
    renderFormFields() { this.#baseComponent.formFieldsContainer.innerHTML = ''; this.#baseComponent.formFieldsContainer.appendChild(this.#formFieldsManager.getElement()); }
    renderViewContent() { return this.#viewManager.render(this.#baseComponent.initialConfig); }
    getFormValues() { return { url: this.#formFieldsManager.urlInput.value.trim(), token: this.#formFieldsManager.tokenInput.value.trim() }; }
    populateForm(config) {
        this.#formFieldsManager.urlInput.value = config?.url || '';
        this.#formFieldsManager.tokenInput.value = config?.token || '';
    }
    validateForm() {
        const { url, token } = this.getFormValues(); const errors = [];
        if (url && !token) errors.push("Access token is required if URL is provided.");
        if (!url && token) errors.push("URL is required if token is provided.");
        try { if (url) new URL(url); } catch { errors.push("Invalid Home Assistant URL format."); }
        return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
    }
    applyTranslationToFields() { this.#formFieldsManager.applyTranslations(); }
}

class HaGlobalSettingsFormFields {
    #formFieldsContainer; urlInput; tokenInput; #translate;
    constructor(pluginId, translateFn) {
        this.#translate = translateFn;
        this.#formFieldsContainer = document.createElement('div');
        this.#formFieldsContainer.innerHTML = `
            <div class="form-group"><label for="${pluginId}-haUrl-form">${this.#translate('haUrl')}</label><input type="url" id="${pluginId}-haUrl-form" class="form-control" placeholder="${this.#translate('haUrlPlaceholder')}" autocomplete="url"></div>
            <div class="form-group"><label for="${pluginId}-haToken-form">${this.#translate('accessToken')}</label><input type="text" autocomplete="username" class="visually-hidden" tabindex="-1"><input type="password" id="${pluginId}-haToken-form" class="form-control" autocomplete="new-password"></div>`;
        this.urlInput = this.#formFieldsContainer.querySelector(`#${pluginId}-haUrl-form`);
        this.tokenInput = this.#formFieldsContainer.querySelector(`#${pluginId}-haToken-form`);
    }
    getElement() { return this.#formFieldsContainer; }
    applyTranslations() {
        this.#formFieldsContainer.querySelector('label[for$="-haUrl-form"]').textContent = this.#translate('haUrl');
        this.urlInput.placeholder = this.#translate('haUrlPlaceholder');
        this.#formFieldsContainer.querySelector('label[for$="-haToken-form"]').textContent = this.#translate('accessToken');
    }
}

class HaGlobalSettingsView {
    #translate;
    constructor(translateFn) { this.#translate = translateFn; }
    render(config) {
        const viewContent = document.createElement('div'); viewContent.className = 'card-details';
        const urlToShow = config?.url || this.#translate('Not Set'); const tokenIsSet = !!config?.token;
        const urlClass = !config?.url ? 'value-not-set' : ''; const tokenClass = !tokenIsSet ? 'value-not-set' : 'masked';
        viewContent.innerHTML = `
            <div class="card-detail-line"><span class="card-detail-icon material-icons">public</span><span class="card-detail-value ha-url-display ${urlClass}">${urlToShow}</span></div>
            <div class="card-detail-line"><span class="card-detail-icon mdi mdi-key-variant"></span><span class="card-detail-value ha-token-display ${tokenClass}">${tokenIsSet ? '********' : this.#translate('Not Set')}</span></div>`;
        return viewContent;
    }
}

export const createHaGlobalSettingsComponent = (pluginId, manifest, context) => new HaGlobalSettingsComponent(pluginId, manifest, context);