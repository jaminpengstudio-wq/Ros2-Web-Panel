const Config = {
    // development 
    ROSBRIDGE_LOCAL_SERVER_IP: process.env.REACT_APP_ROSBRIDGE_LOCAL_SERVER_IP,
    ROSBRIDGE_LOCAL_SERVER_PORT: process.env.REACT_APP_ROSBRIDGE_LOCAL_SERVER_PORT,

    // production
    ROSBRIDGE_URL: process.env.REACT_APP_ROSBRIDGE_URL,

    RECONNECTION_TIMER: 3000,
    CMD_VEL_TOPIC: "/cmd_vel",
    ODOM_TOPIC: "/wheel_diff_drive_controller/odom",
    POSE_TOPIC: "/amcl_pose",
    IMU_TOPIC: "/imu/out",
};

export default Config;
