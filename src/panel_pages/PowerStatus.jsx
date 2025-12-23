import { Component } from "react";
import mqttService from "../scripts/MqttService";

// ========================
// 使用真實電力數據請在外層 Panel.jsx 元件裡調整 < PowerStatus simulate = { false} />
// ========================
class PowerStatus extends Component {
    constructor(props) {
        super(props);
        this.state = {
            connected: false,
            percentage: 50,   // 模擬電量（0~100）
            blink: false,
            receivedReal: false,
        };

        // 使用模擬模式參數（從 props 傳入）
        this.simulate = props.simulate === true;
        // console.log("PowerStatus simulate mode:", this.simulate, typeof (this.simulate));

        // 調整設定（
        this.simulateIntervalMs = 3000;  // (單位：毫秒）每 3 秒掉 1%
        this.blinkIntervalMs = 800;      // 閃爍速度 (越小越快) 最快閃爍設定:300 差不多
        this.blinkThreshold = 10;        // 低於多少%開始閃爍
        this.barBorderColor = "#999";  // 電力格 border 顏色

        // 自訂電量顏色
        this.batteryColors = {
            high: "#00ff66", // 綠
            mid: "#ffaa00",  // 橘
            low: "#ff3333",  // 紅
        };
    }

    componentDidMount() {
        this._firstTickSkipped = false;

        // 每隔 simulateIntervalMs 判斷 MQTT 是否已連線，並更新模擬電量
        this.interval = setInterval(() => {
            const isConn = mqttService.connected;
            if (isConn !== this.state.connected) {
                this.setState({ connected: isConn }, () => {
                    if (isConn && !this.simulate) {
                        this.initSubscriber();
                    }
                });
            }

            // 模擬耗電：使用模擬模式時
            if (this.simulate && isConn) {
                if (!this._firstTickSkipped) {
                    this._firstTickSkipped = true;
                    return; // 第一次不扣電
                }
                this.setState((prev) => ({
                    percentage: Math.max(prev.percentage - 1, 0),
                }));
            }
        }, this.simulateIntervalMs);

        // 閃爍控制（改成獨立速度控制）
        this.blinkTimer = setInterval(() => {
            if (this.state.percentage <= this.blinkThreshold) {
                this.setState((prev) => ({ blink: !prev.blink }));
            } else {
                this.setState({ blink: false });
            }
        }, this.blinkIntervalMs);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
        clearInterval(this.blinkTimer);

        if (this.topic) {
            this.topic.unsubscribe();
            this.topic = null;
        }
    }

    // 初始化 MQTT 訂閱真實電量
    initSubscriber() {
        // 避免重複訂閱
        if (this.topic) return;

        // 訂閱 MQTT topic
        this.topic = mqttService.subscribe("robot1/battery_state", (msg) => {
            if (!this.simulate) {
                this.setState({
                    percentage: msg.percentage * 100,
                    receivedReal: true,
                });
            }
        });
    }

    getBatteryColor(percentage) {
        if (percentage <= 20) return this.batteryColors.low;
        if (percentage <= 40) return this.batteryColors.mid;
        return this.batteryColors.high;
    }

    renderBatteryBars(percentage) {
        const { blink } = this.state;
        const color = this.getBatteryColor(percentage);
        const shouldBlink = percentage <= this.blinkThreshold && blink;

        return (
            <div className="battery-container-horizontal">
                <div
                    className="battery-fill"
                    style={{
                        width: `${Math.max(percentage, 0)}%`,
                        backgroundColor: shouldBlink ? "transparent" : color,
                        borderColor: this.barBorderColor,
                    }}
                ></div>
                <div className="battery-cap-horizontal" />
            </div>
        );
    }

    render() {
        const { connected, percentage, receivedReal } = this.state;

        let displayPercentage;
        if (this.simulate) {
            displayPercentage = connected ? percentage : 0;
        } else {
            displayPercentage = connected && receivedReal ? percentage : 0;
        }

        return (
            <div className="power-status-wrapper horizontal">
                <div className="power-status-text">{displayPercentage.toFixed(0)}%</div>
                <div className="power-status-block horizontal">
                    {this.renderBatteryBars(displayPercentage)}
                </div>
            </div>
        );
    }
}

export default PowerStatus;
