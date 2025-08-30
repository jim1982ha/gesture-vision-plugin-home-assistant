/* FILE: plugins/home-assistant/frontend/action-display-details.js */
export const getHaActionDisplayDetails = (settings, context) => {
  const { services, shared, manifest } = context;
  const { translate } = services;
  const { getActionIconDetails } = shared.services.actionDisplayUtils;
  const { GESTURE_CATEGORY_ICONS } = shared.constants;

  if (
    !settings ||
    typeof settings.entityId !== "string" ||
    !settings.entityId ||
    typeof settings.service !== "string" ||
    !settings.service
  ) {
    const errorMsg = translate("invalidHaActionSettings", {
      defaultValue: "Invalid Home Assistant action settings.",
    });
    console.warn(
      `[HA Plugin getHaActionDisplayDetails] Settings invalid. EntityID: '${settings?.entityId}', Service: '${settings?.service}'. Returning error.`
    );
    return [{ icon: GESTURE_CATEGORY_ICONS.UI_ERROR.iconName, value: errorMsg }];
  }

  const iconDetails = getActionIconDetails(manifest);

  const serviceKeyFromSettings = settings.service;
  const serviceNameOnly = serviceKeyFromSettings.includes(".")
    ? serviceKeyFromSettings.substring(serviceKeyFromSettings.indexOf(".") + 1)
    : serviceKeyFromSettings;

  const commonServicesToTranslate = ["toggle", "turn_on", "turn_off"];
  let serviceDisplayName = serviceNameOnly;

  if (commonServicesToTranslate.includes(serviceNameOnly.toLowerCase())) {
    serviceDisplayName = translate(serviceNameOnly.toLowerCase(), {
      defaultValue: serviceNameOnly,
    });
  }

  const entityIdDisplay =
    settings.entityId || translate("Not Set", { defaultValue: "(Not Set)" });

  return [
    {
      icon: iconDetails.iconName,
      iconType: iconDetails.iconType,
      value: entityIdDisplay,
    },
    {
      icon: GESTURE_CATEGORY_ICONS.UI_ACTION.iconName,
      iconType: "material-icons",
      value: `${translate("Service", {
        defaultValue: "Service",
      })}: ${serviceDisplayName}`,
    },
  ];
};