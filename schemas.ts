/* FILE: extensions/plugins/gesture-vision-plugin-home-assistant/schemas.ts */
import { z } from 'zod';

// Zod schema for the plugin's global configuration file.
export const HaGlobalConfigSchema = z.object({
  url: z.string().url({ message: "Invalid Home Assistant URL" }).or(z.literal("")).optional(),
  token: z.string().or(z.literal("")).optional(),
}).refine(data => !(data.url && !data.token), {
    message: "Access token is required if URL is provided.", path: ["token"]
}).refine(data => !(!data.url && data.token), {
    message: "URL is required if token is provided.", path: ["url"]
});

// Zod schema for the settings of a single action instance.
export const HaActionSettingsSchema = z.object({
    domain: z.string().min(1, { message: "Domain is required" }), // Added domain for better UI
    entityId: z.string().min(1, { message: "Entity ID is required" }),
    service: z.string().min(1, { message: "Service is required" }),
});

// Inferred TypeScript types from the Zod schemas.
export type HomeAssistantConfig = z.infer<typeof HaGlobalConfigSchema>;
export type HaActionInstanceSettings = z.infer<typeof HaActionSettingsSchema>;

// Types for data structures from the Home Assistant API.
// These are kept as interfaces as they describe external data.
export interface HAEntity {
    entity_id: string;
    state: string;
    attributes?: Record<string, unknown> & { friendly_name?: string };
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