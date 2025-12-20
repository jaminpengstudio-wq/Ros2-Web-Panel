import { Component } from "react";
import mqttService from "../scripts/MqttService";
import Config from "../scripts/config";

class SafetyStop extends Component {
    constructor(props) {
        super(props);
        this.state = {
            pressed: false,
            stopped: false,  // 是否已經觸發安全停止
        };
        this.size = props.size || 140;

        this.safetyStopTopic = Config.SAFETY_STOP_TOPIC;
        this.cmdVelTopic = Config.CMD_VEL_TOPIC;
    }

    triggerStop = () => {
        // 發送安全停止訊號
        mqttService.publish(this.safetyStopTopic, { data: true });

        // 發送零速度訊號
        const stopMsg = {
            linear: { x: 0.0, y: 0.0, z: 0.0 },
            angular: { x: 0.0, y: 0.0, z: 0.0 },
        };
        mqttService.publish(this.cmdVelTopic, stopMsg);

        this.setState({ stopped: true });
    }

    triggerResume = () => {
        mqttService.publish(this.safetyStopTopic, { data: false });
        this.setState({ stopped: false });
    }

    handlePress = () => {
        // 檢查 MQTT 是否連線
        if (!mqttService.client || !mqttService.client.connected) return;

        this.setState({ pressed: true });

        if (!this.state.stopped) {
            this.triggerStop();
        } else {
            this.triggerResume();
        }

        // 150ms 回彈動畫
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
