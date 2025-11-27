import { Component } from "react";
import ROSLIB from "roslib";
import rosService from "../scripts/RosService";


// ========================
// 使用真實電力數據請在外層 Panel.jsx 元件裡調整 < PowerStatus simulate = { false} />
// ========================
class PowerStatus extends Component {
    constructor(props) {
        super(props);
        this.state = {
            connected: false,
            percentage: 100,   // 模擬電量（0~100）
            blink: false,
            receivedReal: false,
        };

        // 使用模擬模式參數（從 props 傳入）
        this.simulate = props.simulate === true;
        // console.log("PowerStatus simulate mode:", this.simulate, typeof (this.simulate));

        // 調整設定（
        this.simulateIntervalMs = 5000;  // (單位：毫秒）每 5 秒掉 1%
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

        this.interval = setInterval(() => {
            const isConn = rosService.isConnected();
            if (isConn && !this.state.connected) {
                this.setState({ connected: true }, () => {
                    this.initSubscriber();
                });
            } else if (!isConn && this.state.connected) {
                this.setState({ connected: false });
                if (this.topic) {
                    this.topic.unsubscribe();
                    this.topic = null;
                }
            }

            // 模擬耗電：使用模擬模式時
            if (this.simulate && isConn) {
                if (!this._firstTickSkipped) {
                    this._firstTickSkipped = true;
                    return;  // 第一次不扣電，讓畫面先顯示初始值 10%
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

    initSubscriber() {
        const ros = rosService.getRos();
        if (!ros) {
            console.warn("⚠️ ROS not ready yet for PowerStatus");
            return;
        }

        this.topic = new ROSLIB.Topic({
            ros: ros,
            name: "/battery_state",
            messageType: "sensor_msgs/BatteryState"
        });

        this.topic.subscribe((msg) => {
            // 若不是模擬模式，才用真實資料更新電量
            if (!this.simulate) {
                this.setState({
                    percentage: msg.percentage * 100,
                    receivedReal: true,
                });
            }
        });

        console.log("✅ PowerStatus subscribed to battery state topic");
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
        if (!this.simulate) {
            // 真實模式
            if (!connected || !receivedReal) {
                displayPercentage = 0;
            } else {
                displayPercentage = percentage;
            }
        } else {
            // 模擬模式
            if (!connected) {
                displayPercentage = 0;
            } else {
                displayPercentage = percentage;
            }
        }


        return (
            // 電池橫向排列
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
