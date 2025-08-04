/* FILE: packages/plugins/home-assistant/types.ts */

// Global config stored in config.home-assistant.json
export interface HomeAssistantConfig {
    url: string;
    token: string;
}

// Settings for a specific action instance
export interface HaActionInstanceSettings {
    entityId: string;
    service: string;
}

// Data structures from HA API
export interface HAEntity {
    entity_id: string;
    state: string;
    domain: string;
    attributes?: Record<string, unknown>;
    friendly_name?: string;
}
  
export interface HAServices {
    [domain: string]: {
        [service_name: string]: {
            name?: string;
            description?: string;
            fields?: Record<string, unknown>;
            target?: unknown;
        };
    };
}