/* FILE: extensions/plugins/home-assistant/backend.plugin.ts */
import { Router, type Request, type Response as ExpressResponse, type NextFunction, type RequestHandler } from 'express';
import { z, ZodSchema } from 'zod';
import fetch, { type Response } from 'node-fetch';

import { BaseBackendPlugin } from '#backend/plugins/base-backend.plugin.js';
import { createErrorResult, executeWithRetry } from '#backend/utils/action-helpers.js';
import manifestFromFile from './plugin.json' with { type: "json" };
import { type HomeAssistantConfig, type HaActionInstanceSettings, type HAEntity, type HAServices } from './types.js';

import type { ActionResult, PluginManifest, ActionDetails } from "#shared/index.js";
import type { ActionHandler } from '#backend/types/index.js';

const HaGlobalConfigSchema = z.object({
  url: z.string().url({ message: "Invalid Home Assistant URL" }).or(z.literal("")).optional(),
  token: z.string().or(z.literal("")).optional(),
}).refine(data => !(data.url && !data.token), {
    message: "Access token is required if URL is provided.", path: ["token"]
}).refine(data => !(!data.url && data.token), {
    message: "URL is required if token is provided.", path: ["url"]
});

const HaActionSettingsSchema = z.object({
    entityId: z.string().min(1, { message: "Entity ID is required" }),
    service: z.string().min(1, { message: "Service is required" }),
});

const asyncHandler = (fn: (req: Request, res: ExpressResponse, next: NextFunction) => Promise<void>): RequestHandler => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

class HomeAssistantActionHandler implements ActionHandler {
  async execute(instanceSettings: HaActionInstanceSettings, _actionDetails: ActionDetails, pluginGlobalConfig?: HomeAssistantConfig): Promise<ActionResult> {
    if (!pluginGlobalConfig || !pluginGlobalConfig.url || !pluginGlobalConfig.token) {
        return createErrorResult("Home Assistant global configuration (URL/Token) is missing.");
    }
    if (!instanceSettings || !instanceSettings.entityId || !instanceSettings.service) {
        return createErrorResult("Home Assistant action settings (entityId/service) are missing.");
    }

    const { entityId, service: serviceName } = instanceSettings;
    const domain = entityId.split('.')[0];
    if (!domain) return createErrorResult(`Invalid entityId format: ${entityId}.`);

    const haApiUrl = `${pluginGlobalConfig.url.replace(/\/$/, "")}/api/services/${domain}/${serviceName}`;
    
    const actionFn = async () => {
      const response = await fetch(haApiUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${pluginGlobalConfig.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity_id: entityId }),
          signal: AbortSignal.timeout(8000),
      });
      const responseBody = response.ok ? instanceSettings : await response.text().catch(() => `Status ${response.status}`);
      return { response, responseBody };
    };

    const isRetryable = (_error: unknown, response?: Response): boolean => {
      if (_error instanceof Error) {
        const msg = _error.message.toLowerCase();
        if (msg.includes('timeout') || msg.includes('econnrefused')) return true;
      }
      if (response && response.status >= 500 && response.status < 600) return true;
      return false;
    };
    
    return executeWithRetry<HaActionInstanceSettings>({
      actionFn,
      isRetryableError: isRetryable,
      maxRetries: 2,
      initialDelayMs: 1500,
      actionName: `Home Assistant service call to ${entityId}`,
    });
  }
}

class HomeAssistantBackendPlugin extends BaseBackendPlugin {
  constructor() {
    super(manifestFromFile as PluginManifest, new HomeAssistantActionHandler());
  }

  getGlobalConfigValidationSchema(): ZodSchema | null {
    return HaGlobalConfigSchema;
  }

  getActionConfigValidationSchema(): ZodSchema | null {
    return HaActionSettingsSchema;
  }

  public getApiRouter(): Router | null {
    const router = Router();
    
    router.get('/entities', asyncHandler(async (_req, res, _next) => {
        const config = await this.context?.getPluginGlobalConfig<HomeAssistantConfig>();
        if (!config?.url || !config.token) {
            res.status(400).json({ error: "Home Assistant plugin not configured." });
            return;
        }
        try {
            const entities = await this.getEntities(config);
            res.json(entities);
        } catch (error) {
            console.error(`[HA Plugin Backend] Error fetching entities: ${(error as Error).message}`);
            res.json([]);
        }
    }));

    router.get('/services', asyncHandler(async (_req, res, _next) => {
        const config = await this.context?.getPluginGlobalConfig<HomeAssistantConfig>();
        if (!config?.url || !config.token) {
            res.status(400).json({ error: "Home Assistant plugin not configured." });
            return;
        }
        try {
            const services = await this.getServices(config);
            res.json(services);
        } catch (error) {
            console.error(`[HA Plugin Backend] Error fetching services: ${(error as Error).message}`);
            res.json({});
        }
    }));

    return router;
  }

  private getSpecificNetworkErrorMessage(error: Error & { code?: string; type?: string }): { messageKey: string, message: string } {
    const errorMessage = error.message;

    if (error.name === 'AbortError') return { messageKey: "haTimeout", message: "Request timed out." };
    
    switch (error.code) {
        case 'ENOTFOUND': return { messageKey: "haDnsError", message: `DNS lookup failed for host.` };
        case 'ECONNREFUSED': return { messageKey: "haConnectionRefused", message: `Connection refused.` };
        default: return { messageKey: "haConnectionFailed", message: errorMessage };
    }
  }

  async testConnection(configToTest: HomeAssistantConfig): Promise<{ success: boolean; messageKey?: string; error?: { code?: string; message?: string } }> {
    const { url, token } = configToTest;
    if (!url || !token) {
        return { success: false, messageKey: "haUrlTokenMissing", error: { code: "MISSING_CREDENTIALS" } };
    }
    try {
        const response = await fetch(`${url.replace(/\/$/, "")}/api/`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
            signal: AbortSignal.timeout(5000),
        });
        if (response.ok && (await response.json() as { message: string }).message === "API running.") {
            return { success: true, messageKey: "haConnectionSuccess" };
        }
        return { success: false, messageKey: "haHttpError", error: { code: `HTTP_${response.status}`, message: `Failed with status: ${response.status} ${response.statusText}` } };
    } catch (error: unknown) {
      const typedError = error as Error & { code?: string; type?: string };
      const { messageKey, message } = this.getSpecificNetworkErrorMessage(typedError);
      return { success: false, messageKey, error: { code: typedError.code || 'NETWORK_ERROR', message } };
    }
  }

  public async getEntities(config: HomeAssistantConfig): Promise<HAEntity[]> {
    const response = await fetch(`${config.url.replace(/\/$/, "")}/api/states`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${config.token}` },
        signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch HA entities: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<HAEntity[]>;
  }

  public async getServices(config: HomeAssistantConfig): Promise<HAServices> {
    const response = await fetch(`${config.url.replace(/\/$/, "")}/api/services`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${config.token}` },
        signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch HA services: ${response.status} ${response.statusText}`);
    }
    const servicesArray = await response.json() as Array<{ domain: string; services: unknown }>;
    const servicesMap: HAServices = {};
    if (Array.isArray(servicesArray)) {
        servicesArray.forEach(domainService => {
            if (domainService && typeof domainService.domain === 'string' && typeof domainService.services === 'object' && domainService.services !== null) {
                servicesMap[domainService.domain] = domainService.services as HAServices[string];
            }
        });
    }
    return servicesMap;
  }
}

export default HomeAssistantBackendPlugin;