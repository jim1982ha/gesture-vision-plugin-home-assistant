/* FILE: extensions/plugins/gesture-vision-plugin-home-assistant/frontend/GlobalSettingsComponent.tsx */
import React, { useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { usePluginConfigForm } from '#frontend/hooks/usePluginConfigForm.js';
import { PluginSettingsActions } from '#frontend/components/shared/PluginSettingsActions.js';
import type { PluginManifest } from '#shared/index.js';

export const HaGlobalSettingsComponent = (props: { manifest: PluginManifest; onSaveSuccess?: () => void; onCancel?: () => void; }) => {
    // All hooks must be called unconditionally at the top level of the component.
    const context = useContext(AppContext);
    
    const {
        formState, isDirty, isSaving, isTesting,
        handleInputChange, handleSave, handleCancel: internalCancel, handleTest
    } = usePluginConfigForm(
        props.manifest.id,
        { url: '', token: '' },
        { onSaveSuccess: props.onSaveSuccess, onCancel: props.onCancel }
    );
    
    // Guard clauses and other logic must come *after* all hook calls.
    if (!context) return null;

    const { translate } = context.services.translationService;
    const isActionDisabled = isSaving || isTesting || !formState.url || !formState.token;

    return (
        <div id={`plugin-settings-form-${props.manifest.id}`} className="plugin-global-settings-form">
            <div className="form-group">
                <label className="form-label" htmlFor={`${props.manifest.id}-url`}>{translate('haUrl')}</label>
                <input id={`${props.manifest.id}-url`} type="text" className="form-control" value={formState.url} onChange={e => handleInputChange('url', e.target.value)} placeholder={translate('haUrlPlaceholder')} />
            </div>
            <div className="form-group">
                <label className="form-label" htmlFor={`${props.manifest.id}-token`}>{translate('accessToken')}</label>
                <input id={`${props.manifest.id}-token`} type="password" className="form-control" value={formState.token || ''} onChange={e => handleInputChange('token', e.target.value)} />
            </div>
            <PluginSettingsActions
                manifest={props.manifest}
                isDirty={isDirty}
                isSaving={isSaving}
                isTesting={isTesting}
                isActionDisabled={isActionDisabled}
                onCancel={internalCancel}
                onSave={handleSave}
                onTest={handleTest}
            />
        </div>
    );
};