import mqtt from "mqtt";
import Config from "./config";

class MqttService {
    constructor() {
        this.client = null;
        this.topics = {};
        this.connected = false;
        this.connecting = false;
    }

    connect() {
        if (this.connected || this.connecting) return;
        this.connecting = true;

        const url = `${Config.MQTT_PROTOCOL}://${Config.MQTT_SERVER_IP}`;
        this.client = mqtt.connect(url, {
            username: Config.MQTT_USERNAME,
            password: Config.MQTT_PASSWORD,
            clientId: Config.MQTT_CLIENT_ID,
            clean: false,
            reconnectPeriod: Config.RECONNECTION_TIMER ?? 5000,
            connectTimeout: Config.CONNECT_TIMEOUT_MS ?? 30_000,
        });

        this.client.on("connect", () => {
            console.log("[MQTT] Connected!");
            this.connected = true;
            this.connecting = false;

            // 重新訂閱所有 topic
            Object.keys(this.topics).forEach(topic => {
                if (this.topics[topic].size > 0) {
                    this.client.subscribe(topic, { qos: 0 });
                }
            });
        });

        this.client.on("close", () => { this.connected = false; });
        this.client.on("reconnect", () => { this.connecting = true; });
        this.client.on("error", (err) => { this.connected = false; this.connecting = false; });

        this.client.on("message", (topic, message) => {
            try {
                const data = JSON.parse(message.toString());
                const callbacks = this.topics[topic];
                if (callbacks) callbacks.forEach(cb => cb(data));
            } catch (err) {
                console.error(`[MQTT] JSON Parse Error on topic ${topic}`);
            }
        });
    }

    publish(topic, payload, qos = 0) {
        if (!this.client?.connected) return;
        this.client.publish(topic, JSON.stringify(payload), { qos });
    }

    subscribe(topic, callback) {
        if (!this.topics[topic]) this.topics[topic] = new Set();
        this.topics[topic].add(callback);

        if (this.client?.connected && this.topics[topic].size === 1) {
            this.client.subscribe(topic, { qos: 0 });
        }
    }

    unsubscribe(topic, callback) {
        const callbacks = this.topics[topic];
        if (!callbacks) return;

        callbacks.delete(callback);
    }
}

const mqttService = new MqttService();
export default mqttService;
