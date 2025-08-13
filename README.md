# gesture-vision-plugin-home-assistant

Integrates with Home Assistant to control entities and services.

---

<p align="center">
  <img src="https://raw.githubusercontent.com/your-repo/gesture-vision-app/main/path/to/icon.png" width="80" alt="Home Assistant Plugin Icon">
</p>
<h1 align="center">GestureVision - Home Assistant Plugin</h1>
<p align="center">
  <strong>The ultimate smart home integration. Control any device and trigger any service in your Home Assistant instance with gestures.</strong>
</p>

---

The Home Assistant plugin is one of the most powerful action plugins for GestureVision. It allows you to connect directly to your Home Assistant server and control any entity by calling services.

## ✨ Key Features

-   **Deep Integration:** Connects securely to the Home Assistant WebSocket and REST APIs.
-   **Entity Control:** Toggle lights, switches, fans, and covers. Adjust climate controls, lock doors, and more.
-   **Service Calls:** Trigger any service available in Home Assistant, such as running scripts, activating scenes, or sending notifications.
-   **Dynamic UI:** The action configuration UI dynamically populates dropdowns with your actual domains, entities, and available services, making setup quick and error-free.
-   **Real-time State Awareness:** Used by other plugins like the Dashboard to display the current state of your entities.

## 🔧 Configuration

### Global Configuration

Before you can use this plugin, you must configure the global settings in the GestureVision UI.

1.  Navigate to **Settings -> Plugins**.
2.  Find the **Home Assistant** plugin card and click it to enter edit mode.
3.  Fill in the following fields:
    -   **HA URL:** The full URL to your Home Assistant instance (e.g., `http://homeassistant.local:8123` or `https://myha.duckdns.org`).
    -   **Access Token:** A Long-Lived Access Token generated from your Home Assistant profile page.
4.  Click the **Test Connection** button to verify the details.
5.  Click **Save**.

Alternatively, you can edit the `extensions/plugins/gesture-vision-plugin-home-assistant/config.home-assistant.json` file directly:

```json
{
  "url": "http://homeassistant.local:8123",
  "token": "YOUR_LONG_LIVED_ACCESS_TOKEN"
}
```

### Action Configuration

When you select "Home Assistant" as the Action Type for a gesture, you will see the following fields:

-   **HA Domain:** A dropdown to select the entity's domain (e.g., `light`, `switch`, `script`).
-   **HA Entity:** A searchable dropdown listing all entities within the selected domain.
-   **HA Service:** A dropdown listing all services available for the selected entity (e.g., `toggle`, `turn_on`, `turn_off`).

## 🚀 Usage Example

**Goal:** Use a "Closed Fist" gesture to toggle the main living room lights.

1.  Ensure the Global Configuration is set up and tested.
2.  Go to the **Gesture Settings** panel.
3.  Select **"Closed Fist"** from the Gesture dropdown.
4.  Set your desired **Confidence** and **Hold Duration**.
5.  For **Action Type**, select **"Home Assistant"**.
6.  Configure the action settings:
    -   **HA Domain:** `light`
    -   **HA Entity:** `light.living_room_main_lights`
    -   **HA Service:** `toggle`
7.  Click **Add Configuration**.

Now, whenever you make a fist and hold it, GestureVision will call the `light.toggle` service on your `light.living_room_main_lights` entity in Home Assistant.

---

Part of the **GestureVision** application.