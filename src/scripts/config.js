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
    PLAN_TOPIC: "robot1/plan",
    MISSION_STATUS_TOPIC: "robot1/mission/status",

    // Frontend to MQTT
    CMD_VEL_TOPIC: "robot1/cmd_vel",
    SAFETY_STOP_TOPIC: "robot1/safety_stop",
    EMERGENCY_CANCEL_NAV_TOPIC: "robot1/emergency_cancel_nav",
    WEB_GOAL_POSE_TOPIC: "robot1/web_goal_pose",

    // Frontend (任務排程-建立地點座標同步檢視用-在 rviz 上地圖是否相同)
    DEBUG_WAYPOINT_RED_MARK_TOPIC: "robot1/debug/waypoint_red_mark",
    DEBUG_WAYPOINT_GREEN_MARK_TOPIC: "robot1/debug/waypoint_green_mark",
};

export default Config;
