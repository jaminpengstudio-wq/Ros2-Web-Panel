import { Component } from "react";
import * as THREE from "three";
import ROSLIB from "roslib";
import rosService from "../scripts/RosService";
import Config from "../scripts/config";
import Gauge from "./Gauge";
import IMUAttitudeIndicator from "./IMUAttitudeIndicator";


class RobotState extends Component {
    state = {
        connected: false,

        // AMCL Pose：修正後的定位資料
        amcl_x: 0.0,
        amcl_y: 0.0,
        amcl_orientation: 0.0,

        // Odometry：即時里程計資料 (線速度和角速度)
        odom_x: 0.0,
        odom_y: 0.0,
        odom_orientation: 0.0,
        linear_velocity: 0.0,
        angular_velocity: 0.0,
    };

    componentDidMount() {
        // 監聽連線狀態
        this.interval = setInterval(() => {
            const isConn = rosService.isConnected();
            if (isConn && !this.state.connected) {
                this.setState({ connected: true }, () => {
                    this.initSubscribers();
                });
            } else if (!isConn && this.state.connected) {
                this.setState({
                    connected: false,
                    amcl_x: 0.0,
                    amcl_y: 0.0,
                    amcl_orientation: 0.0,

                    odom_x: 0.0,
                    odom_y: 0.0,
                    odom_orientation: 0.0,
                    linear_velocity: 0.0,
                    angular_velocity: 0.0,
                });
            }
        }, 500);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
        // 安全取消訂閱
        if (this.pose_subscriber) this.pose_subscriber.unsubscribe();
        if (this.velocity_subscriber) this.velocity_subscriber.unsubscribe();
    }

    initSubscribers() {
        const ros = rosService.getRos();
        if (!ros) {
            console.warn("⚠️ ROS not ready yet");
            return;
        }

        // AMCL Pose：修正後的定位資料
        this.pose_subscriber = new ROSLIB.Topic({
            ros: ros,
            name: Config.POSE_TOPIC,
            messageType: "geometry_msgs/PoseWithCovarianceStamped",
        });

        this.pose_subscriber.subscribe((message) => {
            const px = message.pose.pose.position.x;
            const py = message.pose.pose.position.y;
            const ori = this.getOrientationFromQuaternion(
                message.pose.pose.orientation
            );

            this.setState({ amcl_x: px, amcl_y: py, amcl_orientation: ori });
        });

        // Odometry：即時里程計資料 (線速度和角速度)
        this.velocity_subscriber = new ROSLIB.Topic({
            ros: ros,
            name: Config.ODOM_TOPIC,
            messageType: "nav_msgs/Odometry",
        });

        this.velocity_subscriber.subscribe((message) => {
            const pos = message.pose.pose.position;
            const ori = this.getOrientationFromQuaternion(message.pose.pose.orientation);
            const lv = message.twist.twist.linear.x;
            const av = message.twist.twist.angular.z;

            // 即時座標與速度
            this.setState({
                odom_x: pos.x,
                odom_y: pos.y,
                odom_orientation: ori,
                linear_velocity: lv,
                angular_velocity: av,
            });
        });

        // console.log("✅ RobotState subscribers initialized using shared rosService");
    }

    getOrientationFromQuaternion(q) {
        const quat = new THREE.Quaternion(q.x, q.y, q.z, q.w);
        const euler = new THREE.Euler().setFromQuaternion(quat);
        return euler.z * (180 / Math.PI);  // Yaw (degrees)
    }

    render() {
        // 1.可以不要顯示 odom 的orientation, 因為累積誤差大(長時間會飄移), 無法感知實際滑動(例: 打滑、原地旋轉時會算錯)
        // 2.或是完全不要顯示 / acml_pose 的數據資料，因為 /acml_pose 不是即時更新數據，只顯示 odom 的即時 x、y、Orientation

        // const { amcl_x, amcl_y, amcl_orientation, odom_x, odom_y, odom_orientation, linear_velocity, angular_velocity } = this.state;

        // 只顯示 odom 的即時座標數據
        const { odom_x, odom_y, odom_orientation, linear_velocity, angular_velocity } = this.state;

        return (
            <div className="robot-state-wrapper">
                <div className="main-border pos-state-block">
                    {/* <span>Global Position</span>
                    <div className="global-pos-state-msg">
                        <span>x: {amcl_x.toFixed(2)}</span>
                        <span>y: {amcl_y.toFixed(2)}</span>
                        <span>Orientation: {amcl_orientation.toFixed(2)}°</span>
                    </div>

                    <span>Realtime Position</span>
                    <div className="realtime-pos-state-msg">
                        <span>x: {odom_x.toFixed(2)}</span>
                        <span>y: {odom_y.toFixed(2)}</span>
                        <span>Orientation(Estimate): {odom_orientation.toFixed(2)}°</span>
                    </div>
                    <span>Global Position</span> */}

                    {/* // 只顯示 odom 的即時座標數據 */}
                    <span>Realtime Position</span>
                    <div className="realtime-pos-state-msg">
                        <span>x: {odom_x.toFixed(2)}</span>
                        <span>y: {odom_y.toFixed(2)}</span>
                        <span>Orientation: {odom_orientation.toFixed(2)}°</span>
                    </div>

                </div>

                <div className="main-border vel-state-block">
                    <span>Velocities</span>
                    <div>
                        <Gauge
                            value={linear_velocity}
                            min={-1.0}
                            max={1.0}
                            label="Linear Vel"
                            unit="m/s"

                        />
                        <Gauge
                            value={angular_velocity}
                            min={-1.0}
                            max={1.0}
                            label="Angular Vel"
                            unit="rad/s"
                            linearValue={linear_velocity}
                        />
                    </div>
                </div>

                <div className="imu-state-block">
                    <IMUAttitudeIndicator />
                </div>
            </div>
        );
    }
}

export default RobotState;
