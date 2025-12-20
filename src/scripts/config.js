const Config = {
    MQTT_SERVER_IP: process.env.REACT_APP_MQTT_SERVER_IP,
    MQTT_WEBSOCKET_PORT: process.env.REACT_APP_MQTT_WEBSOCKET_PORT,
    MQTT_PROTOCOL: process.env.REACT_APP_MQTT_PROTOCOL
        || (window.location.protocol === "https:" ? "wss" : "ws"),

    MQTT_USERNAME: process.env.REACT_APP_MQTT_USERNAME,
    MQTT_PASSWORD: process.env.REACT_APP_MQTT_PASSWORD,
    MQTT_CLIENT_ID: "web_to_mqtt",
    RECONNECTION_TIMER: 3000,     // 重連間隔 (ms) 
    CONNECT_TIMEOUT_MS: 4000,     // 連線超時 - 避免失敗時太快 retry
    KEEPALIVE_SECONDS: 60,        // 心跳間隔 (秒)

    // MQTT to Frontend
    ODOM_TOPIC: "robot1/odom",
    POSE_TOPIC: "robot1/amcl_pose",
    IMU_TOPIC: "robot1/imu",
    MAP_INFO_TOPIC: "robot1/map/info",
    MAP_UPDATE_TOPIC: "robot1/map/update",

    // Frontend to MQTT
    CMD_VEL_TOPIC: "robot1/cmd_vel",
    SAFETY_STOP_TOPIC: "robot1/safety_stop",
    EMERGENCY_CANCEL_NAV_TOPIC: "robot1/emergency_cancel_nav",
    WEB_GOAL_POSE_TOPIC: "robot1/web_goal_pose",
};

export default Config;
