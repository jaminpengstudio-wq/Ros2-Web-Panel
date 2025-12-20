import { Component } from "react";
import * as THREE from "three";
import mqttService from "../scripts/MqttService";
import Config from "../scripts/config";
import Gauge from "./Gauge";
import IMUAttitudeIndicator from "./IMUAttitudeIndicator";

class RobotState extends Component {
    constructor(props) {
        super(props);
        this.state = {
            connected: false,

            // 機器 pose
            x: 0.0,
            y: 0.0,
            orientation: 0.0,
            linear_velocity: 0.0,
            angular_velocity: 0.0,
        };

        // MQTT topic
        this.odomTopic = Config.ODOM_TOPIC;
        this.odomSubscription = null;
    }

    componentDidMount() {
        this.checkInterval = setInterval(() => {
            const isConn = mqttService.client?.connected || false;
            if (isConn && !this.state.connected) {
                this.setState({ connected: true }, () => this.initSubscriber());
            } else if (!isConn && this.state.connected) {
                this.setState({
                    connected: false,
                    x: 0.0,
                    y: 0.0,
                    orientation: 0.0,
                    linear_velocity: 0.0,
                    angular_velocity: 0.0,
                });
            }
        }, 2000);
    }


    componentWillUnmount() {
        clearInterval(this.checkInterval);
        if (this.odomSubscription) {
            mqttService.unsubscribe(this.odomTopic, this.odomSubscription);
            this.odomSubscription = null;
        }
    }

    initSubscriber() {
        // 訂閱 Odometry
        this.odomSubscription = (msg) => {
            if (!msg?.pose) return;

            const pos = msg.pose.position;
            const ori = this.getOrientationFromQuaternion(msg.pose.orientation);
            const lv = msg.twist.linear.x;
            const av = msg.twist.angular.z;

            this.setState({
                x: pos.x,
                y: pos.y,
                orientation: ori,
                linear_velocity: lv,
                angular_velocity: av,
            });
        };
        mqttService.subscribe(this.odomTopic, this.odomSubscription);
    }

    getOrientationFromQuaternion(q) {
        const quat = new THREE.Quaternion(q.x, q.y, q.z, q.w);
        const euler = new THREE.Euler().setFromQuaternion(quat);
        return euler.z * (180 / Math.PI);  // Yaw (degrees)
    }

    render() {
        const { x, y, orientation, linear_velocity, angular_velocity } = this.state;

        return (
            <div className="robot-state-wrapper">
                <div className="main-border pos-state-block">
                    <span>Realtime Position</span>
                    <div className="realtime-pos-state-msg">
                        <span>x: {x.toFixed(2)}</span>
                        <span>y: {y.toFixed(2)}</span>
                        <span>Orientation: {orientation.toFixed(2)}°</span>
                    </div>

                </div>

                <div className="main-border vel-state-block">
                    <span>Velocities</span>
                    <div>
                        <Gauge
                            value={linear_velocity}
                            min={-1.0}
                            max={1.0}
                            label="Linear"
                            unit="m/s"

                        />
                        <Gauge
                            value={angular_velocity}
                            min={-1.0}
                            max={1.0}
                            label="Angular"
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
