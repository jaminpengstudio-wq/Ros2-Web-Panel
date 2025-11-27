import { Component } from "react";
import ROSLIB from "roslib";
import rosService from "../scripts/RosService";


class Emergency extends Component {
    constructor(props) {
        super(props);
        this.state = {
            pressed: false,  // 按鈕按下動畫
        };
        this.size = props.size || 140;
    }

    handlePress = () => {
        if (!rosService.isConnected()) return;
        this.setState({ pressed: true });
        const ros = rosService.getRos();

        // 發送取消導航
        const cancelNav = new ROSLIB.Topic({
            ros,
            name: '/emergency_cancel_nav',
            messageType: 'std_msgs/msg/Bool',
        });
        cancelNav.publish(new ROSLIB.Message({ data: true }));

        // 同時發送零速度到 /cmd_vel
        const cmdVel = new ROSLIB.Topic({
            ros,
            name: '/cmd_vel',
            messageType: "geometry_msgs/msg/Twist",
        });

        const stopMsg = new ROSLIB.Message({
            linear: { x: 0.0, y: 0.0, z: 0.0 },
            angular: { x: 0.0, y: 0.0, z: 0.0 },
        });
        cmdVel.publish(stopMsg);

        // console.log("🛑 Emergency navigation cancel published");

        // 150ms 回彈
        setTimeout(() => this.setState({ pressed: false }), 150);
    };

    render() {
        const { pressed } = this.state;

        return (
            <div
                className={`emergency-btn ${pressed ? "pressed" : ""}`}
                style={{ width: this.size, height: this.size }}
                onClick={this.handlePress}
            >
                <span className="emergency-text">EMERGENCY</span>
            </div>
        );
    }
}

export default Emergency;
