import { Component } from "react";
import * as THREE from "three";
import mqttService from "../scripts/MqttService";
import Config from "../scripts/config";

class IMUAttitudeIndicator extends Component {
    constructor(props) {
        super(props);
        this.state = {
            roll: 0.0,    // 左右傾
            pitch: 0.0,   // 前後傾
            heading: 0.0, // 偏航（Yaw）
            connected: false,
        };

        this.imuTopic = Config.IMU_TOPIC;
    }

    componentDidMount() {
        // 每 2 秒檢查 MQTT 是否連線
        const checkConnection = () => {
            const isConn = mqttService.client && mqttService.client.connected;
            if (isConn && !this.state.connected) {
                this.setState({ connected: true }, () => this.initSubscriber());
            } else if (!isConn && this.state.connected) {
                this.setState({ connected: false, roll: 0.0, pitch: 0.0, heading: 0.0 });
                if (this.imuSubscription) mqttService.unsubscribe(this.imuTopic);
            }
        };

        this.interval = setInterval(checkConnection, 2000);
        checkConnection(); // 一開始就檢查一次
    }

    componentWillUnmount() {
        clearInterval(this.interval);
        if (this.imuSubscription) mqttService.unsubscribe(this.imuTopic);
    }

    initSubscriber() {
        // 訂閱 IMU topic
        this.imuSubscription = (msg) => {
            const q = msg.imu.orientation;

            const quat = new THREE.Quaternion(q.x, q.y, q.z, q.w);
            const euler = new THREE.Euler().setFromQuaternion(quat, "ZYX");

            const rollDeg = euler.x * (180 / Math.PI);
            const pitchDeg = euler.y * (180 / Math.PI);
            const headingDeg = euler.z * (180 / Math.PI);

            this.setState({
                roll: rollDeg,
                pitch: pitchDeg,
                heading: headingDeg,
            });
        };

        mqttService.subscribe(this.imuTopic, this.imuSubscription);
    }

    render() {
        const { connected, roll, pitch, heading } = this.state;

        // 判斷是否傾斜超過 ±30° => 警示紅色
        const alert = Math.abs(roll) > 30 || Math.abs(pitch) > 30;
        const pitchFactor = 1;   // 每 1° = 2 svg 單位
        const rollFactor = 0.5;  // 每 1° = 1° 旋轉（保持原樣）

        return (
            <div className="imu-indicator-wrapper">
                {!connected ? (
                    <div className=" imu-status-block">
                        <span className="imu-status">
                            等待連線中 …
                        </span>

                    </div>
                ) : (
                    <div className={`imu-indicator ${alert ? "imu-alert" : ""}`}>

                        {/* 姿態儀表（水平線 + 背景分色） */}
                        <div className="attitude">
                            <svg viewBox="-60 -60 120 120" className="attitude-svg">

                                {/* 上半天空 (藍) */}
                                <rect x="-60" y="-56" width="120" height="56" fill="#6115efff" />
                                {/* 下半地面 (棕) */}
                                <rect x="-60" y="0" width="120" height="57" fill="#1dc081ff" />
                                {/* 水平軸線 */}
                                <line x1="-50" y1="0" x2="50" y2="0" stroke="#fff" strokeWidth="0.5" />
                                {/* 滾動／俯仰變換群組 */}
                                <g className="attitude-group"
                                    transform={`translate(0,${pitch * 0.5}) rotate(${roll})`}>
                                    {/* 地平線延伸 */}
                                    <line x1="-70" y1="0" x2="70" y2="0" stroke="#fff" strokeWidth="0.5" />
                                    {/* 傾斜刻度標記 */}
                                    <line x1="-70" y1="0" x2="-65" y2="5" stroke="#fff" />
                                    <line x1="70" y1="0" x2="65" y2="-5" stroke="#fff" />
                                </g>
                                {/* 滾動／俯仰變換群組 */}
                                <g transform={`translate(0,${pitch * pitchFactor}) rotate(${roll * rollFactor})`}>
                                    {/* 水平線與角度刻度 */}
                                    {[-30, -20, -10, 0, 10, 20, 30].map((deg) => (
                                        <g key={deg} transform={`translate(0,${-deg * pitchFactor})`}>
                                            <line x1="-15" y1="0" x2="15" y2="0" stroke="#fff" strokeWidth="0.8" />
                                            {deg !== 0 && (
                                                <text x="20" y="2" fill="#fff" fontSize="5.5">{deg > 0 ? `+${deg}` : deg}</text>
                                            )}
                                        </g>
                                    ))}
                                </g>
                                {/* 外框角度刻度 */}
                                {[-30, -20, -10, 10, 20, 30].map((deg) => (
                                    <g key={deg}>
                                        {/* 左邊刻度 */}
                                        <g transform={`rotate(${deg}) translate(-48 ,10)`}>
                                            <line x1="0" y1="0" x2="0" y2="-6" stroke="#fff" strokeWidth="0.1" />
                                            <text x="-3" y="-8" fill="#fff" fontSize="5.0" textAnchor="end">{Math.abs(deg)}</text>
                                        </g>
                                        {/* 右邊刻度 */}
                                        <g transform={`rotate(${-deg}) translate(48,10)`}>
                                            <line x1="0" y1="0" x2="0" y2="-6" stroke="#fff" strokeWidth="0.1" />
                                            <text x="3" y="-8" fill="#fff" fontSize="5.0" textAnchor="start">{Math.abs(deg)}</text>
                                        </g>
                                    </g>
                                ))}

                                {/* 偏航儀表針 */}
                                <polygon
                                    points="0,-5 -5,5 5,5"
                                    fill="#ff0000"
                                    transform={`rotate(${-heading})`}
                                />

                                {/* 外框刻度 */}
                                <circle cx="0" cy="0" r="48" fill="none" stroke="#fff" strokeWidth="0.5" />
                            </svg>
                        </div>

                        {/* 底部讀值 */}
                        <div className="values">
                            <span>Roll: {roll.toFixed(1)}°</span>
                            <span>Pitch: {pitch.toFixed(1)}°</span>
                            <span>Yaw: {Math.round(heading)}°</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}

export default IMUAttitudeIndicator;
