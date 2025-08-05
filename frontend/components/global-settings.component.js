/* FILE: extensions/plugins/gesture-vision-plugin-home-assistant/frontend/components/global-settings.component.js */
const { translate } = window.GestureVision.services;
const { BasePluginGlobalSettingsComponent } = window.GestureVision.ui.components;

// Field descriptors for the generic form renderer in the base component.
const haGlobalSettingsFields = [
    { id: 'url', type: 'url', labelKey: 'haUrl', placeholderKey: 'haUrlPlaceholder', autocomplete: 'url' },
    { id: 'token', type: 'password', labelKey: 'accessToken', autocomplete: 'new-password' }
];

export class HaGlobalSettingsComponent extends BasePluginGlobalSettingsComponent {
    constructor(pluginId, manifest, context) {
        // Pass field descriptors to the base class. It will handle form creation.
        super(pluginId, manifest, context, haGlobalSettingsFields);
    }

    // Override only the methods that need custom behavior for Home Assistant.

    /**
     * Provides the custom HTML for the "view" mode of the card.
     * @returns {HTMLElement} The populated card details element.
     */
    renderViewContent() {
        const viewContent = document.createElement('div');
        viewContent.className = 'card-details';
        const config = this.initialConfig; // initialConfig is a protected property from the base class
        const urlToShow = config?.url || translate('Not Set');
        const tokenIsSet = !!config?.token;
        const urlClass = !config?.url ? 'value-not-set' : '';
        const tokenClass = !tokenIsSet ? 'value-not-set' : 'masked';

        // FIX: Add the description line to match the layout of other plugins.
        const description = translate(this.manifest.descriptionKey || '', { defaultValue: '' });
        
        viewContent.innerHTML = `
            <div class="card-detail-line"><span class="material-icons card-detail-icon" title="${translate('descriptionOptionalLabel')}">notes</span><span class="card-detail-value allow-wrap">${description}</span></div>
            <div class="card-detail-line"><span class="card-detail-icon material-icons">public</span><span class="card-detail-value ha-url-display ${urlClass}">${urlToShow}</span></div>
            <div class="card-detail-line"><span class="card-detail-icon mdi mdi-key-variant"></span><span class="card-detail-value ha-token-display ${tokenClass}">${tokenIsSet ? '********' : translate('Not Set')}</span></div>`;
        return viewContent;
    }

    /**
     * Provides custom validation logic for the Home Assistant settings form.
     * @returns {{isValid: boolean, errors?: string[]}} Validation result.
     */
    validateForm() {
        const values = this.getFormValues();
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
}

export const createHaGlobalSettingsComponent = (pluginId, manifest, context) => new HaGlobalSettingsComponent(pluginId, manifest, context);