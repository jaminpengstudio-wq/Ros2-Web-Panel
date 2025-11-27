import ROSLIB from "roslib";
import Config from "./config";


class RosService {
    constructor() {
        this.ros = new ROSLIB.Ros();
        this.connected = false;

        this.ros.on("connection", () => {
            // console.log("✅ ROS connection established!");
            this.connected = true;
        });

        this.ros.on("close", () => {
            console.log("⚠️ ROS connection closed, retrying...");
            this.connected = false;
            setTimeout(() => {
                this.connect();
            }, Config.RECONNECTION_TIMER);
        });

        this.ros.on("error", (error) => {
            console.error("❌ ROS connection error:", error);
        });

        this.connect();
    }

    connect() {
        const url = process.env.NODE_ENV === 'production'
            ? Config.ROSBRIDGE_URL
            : `ws://${Config.ROSBRIDGE_LOCAL_SERVER_IP
            }:${Config.ROSBRIDGE_LOCAL_SERVER_PORT}`;

        this.ros.connect(url);

        // console.log("Trying ROS connect to:", url);
    }

    getRos() {
        return this.ros;
    }

    isConnected() {
        return this.connected;
    }
}

const rosService = new RosService();
export default rosService;
