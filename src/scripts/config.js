const Config = {
    MQTT_PROTOCOL: "wss",
    MQTT_SERVER_IP: "mqtt_bot1_bridge.jampenglab.tw",

    MQTT_USERNAME: "web_client",
    MQTT_PASSWORD: "test@1234",
    MQTT_CLIENT_ID: "web_to_mqtt",

    RECONNECTION_TIMER: 3000,
    CONNECT_TIMEOUT_MS: 4000,
    KEEPALIVE_SECONDS: 60,

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
