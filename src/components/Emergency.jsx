import { Component } from "react";
import mqttService from "../scripts/MqttService";
import Config from "../scripts/config";

class Emergency extends Component {
    constructor(props) {
        super(props);
        this.state = {
            pressed: false,  // 按鈕按下動畫
        };
        this.size = props.size || 140;

        this.cancelNavTopic = Config.EMERGENCY_CANCEL_NAV_TOPIC;
        this.cmdVelTopic = Config.CMD_VEL_TOPIC;
    }

    handlePress = () => {
        // 檢查 MQTT 是否連線
        if (!mqttService.client || !mqttService.client.connected) return;

        this.setState({ pressed: true });

        // 發送取消導航訊號
        mqttService.publish(this.cancelNavTopic, { data: true });

        // 同時發送零速度
        const stopMsg = {
            linear: { x: 0.0, y: 0.0, z: 0.0 },
            angular: { x: 0.0, y: 0.0, z: 0.0 },
        };
        mqttService.publish(this.cmdVelTopic, stopMsg);

        // 150ms 回彈動畫
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
