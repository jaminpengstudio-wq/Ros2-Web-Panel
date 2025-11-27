import { Component } from "react";
import ROSLIB from "roslib";
import rosService from "../scripts/RosService";
import Config from "../scripts/config";


class SafetyStop extends Component {
    constructor(props) {
        super(props);
        this.state = {
            pressed: false,
            stopped: false,  // 是否已經觸發安全停止
        };
        this.size = props.size || 140;
    }

    triggerStop = () => {
        const ros = rosService.getRos();
        const safetyStop = new ROSLIB.Topic({
            ros,
            name: '/safety_stop',
            messageType: 'std_msgs/msg/Bool',
        });
        safetyStop.publish(new ROSLIB.Message({ data: true }));
        // 發零速度...
        this.setState({ stopped: true });
    }

    triggerResume = () => {
        const ros = rosService.getRos();
        const safetyStop = new ROSLIB.Topic({
            ros,
            name: '/safety_stop',
            messageType: 'std_msgs/msg/Bool',
        });
        safetyStop.publish(new ROSLIB.Message({ data: false }));
        this.setState({ stopped: false });
    }

    handlePress = () => {
        if (!rosService.isConnected()) return;
        this.setState({ pressed: true });

        if (!this.state.stopped) {
            this.triggerStop();
        } else {
            this.triggerResume();
        }

        // 發送零速度
        const ros = rosService.getRos();
        const cmdVel = new ROSLIB.Topic({
            ros,
            name: Config.CMD_VEL_TOPIC,
            messageType: "geometry_msgs/msg/Twist",
        });

        const stopMsg = new ROSLIB.Message({
            linear: { x: 0.0, y: 0.0, z: 0.0 },
            angular: { x: 0.0, y: 0.0, z: 0.0 },
        });
        cmdVel.publish(stopMsg);

        // console.log("🛑 Safety stop published");

        // 150ms 回彈
        setTimeout(() => this.setState({ pressed: false }), 150);
    };

    render() {
        const { pressed, stopped } = this.state;
        const buttonColor = stopped
            ? "radial-gradient(circle, #4CAF50 0%, #1B5E20 90%)"  // 綠 (恢復)
            : "radial-gradient(circle, #FFD54F 0%, #F57F17 90%)"; // 橙 (暫停)

        const label = stopped ? "RESUME" : "PAUSE";

        return (
            <div
                className={`safetyStop-btn ${pressed ? "pressed" : ""}`}
                style={{
                    width: this.size,
                    height: this.size,
                    background: buttonColor,
                }}
                onClick={this.handlePress}
            >
                <span className="safetyStop-text">
                    <span
                        className={`safetyStop-icon ${stopped ? "icon-play" : "icon-pause"
                            }`}
                    ></span>
                    {label}
                </span>
            </div>
        );
    }
}

export default SafetyStop;
