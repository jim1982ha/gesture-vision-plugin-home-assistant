/* FILE: extensions/plugins/gesture-vision-plugin-home-assistant/frontend/components/global-settings.component.js */
const haGlobalSettingsFields = [
    { id: 'url', type: 'url', labelKey: 'haUrl', placeholderKey: 'haUrlPlaceholder', autocomplete: 'url' },
    { id: 'token', type: 'password', labelKey: 'accessToken', autocomplete: 'new-password' }
];

export class HaGlobalSettingsComponent {
    #baseComponent;

    constructor(pluginId, manifest, context) {
        // FIX: Access BasePluginGlobalSettingsComponent from the context, not a global.
        const { BasePluginGlobalSettingsComponent } = context.uiComponents;
        
        this.#baseComponent = new BasePluginGlobalSettingsComponent(pluginId, manifest, context, haGlobalSettingsFields);

        this.#baseComponent.renderViewContent = this.renderViewContent.bind(this);
        this.#baseComponent.validateForm = this.validateForm.bind(this);
    }
    
    get #context() { return this.#baseComponent.context; }
    get #initialConfig() { return this.#baseComponent.initialConfig; }
    get #manifest() { return this.#baseComponent.manifest; }

    renderViewContent() {
        const { translate } = this.#context.services;
        const viewContent = document.createElement('div');
        viewContent.className = 'card-details';
        const config = this.#initialConfig;
        const urlToShow = config?.url || translate('Not Set');
        const tokenIsSet = !!config?.token;
        const urlClass = !config?.url ? 'value-not-set' : '';
        const tokenClass = !tokenIsSet ? 'value-not-set' : 'masked';

        const description = translate(this.#manifest.descriptionKey || '', { defaultValue: '' });
        
        viewContent.innerHTML = `
            <div class="card-detail-line"><span class="material-icons card-detail-icon" title="${translate('descriptionOptionalLabel')}">notes</span><span class="card-detail-value allow-wrap">${description}</span></div>
            <div class="card-detail-line"><span class="card-detail-icon material-icons">public</span><span class="card-detail-value ha-url-display ${urlClass}">${urlToShow}</span></div>
            <div class="card-detail-line"><span class="card-detail-icon mdi mdi-key-variant"></span><span class="card-detail-value ha-token-display ${tokenClass}">${tokenIsSet ? '********' : translate('Not Set')}</span></div>`;
        return viewContent;
    }

    validateForm() {
        const { translate } = this.#context.services;
        const values = this.#baseComponent.getFormValues();
        const errors = [];
        if (values.url && !values.token) errors.push(translate("haTokenRequiredWithUrl"));
        if (!values.url && values.token) errors.push(translate("haUrlRequiredWithToken"));
        try {
            if (values.url) new URL(values.url);
        } catch {
            errors.push(translate("haUrlInvalid"));
        }
        return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
    }

    // Delegate all public methods to the base component instance
    getElement() { return this.#baseComponent.getElement(); }
    update(c, x, e) { this.#baseComponent.update(c, x, e); }
    onConfigUpdate(n) { this.#baseComponent.onConfigUpdate(n); }
    destroy() { this.#baseComponent.destroy(); }
    applyTranslations() { this.#baseComponent.applyTranslations(); }
    getConfigToSave() { return this.#baseComponent.getConfigToSave(); }
}

export const createHaGlobalSettingsComponent = (pluginId, manifest, context) => new HaGlobalSettingsComponent(pluginId, manifest, context);