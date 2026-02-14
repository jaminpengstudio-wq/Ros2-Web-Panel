import { Component, createRef } from "react";
import MapRenderer from "../scripts/MapRenderer";
import mqttService from "../scripts/MqttService";
import Config from "../scripts/config";

// 全域新增儲存導航時的靜態地圖
let cachedStaticMapInfo = null;

class Map extends Component {
    constructor(props) {
        super(props);
        this.state = {
            connected: false,
            mapReady: false,
        };

        this.canvasRef = createRef();
        this.renderer = null;
        this.initialized = false;

        this.mapInfoCallback = null;
        this.mapUpdateCallback = null;
        this.odomCallback = null;
    }

    componentDidMount() {
        this.interval = setInterval(() => {
            const isConn = mqttService.client?.connected || false;
            if (isConn !== this.state.connected) {
                this.setState({ connected: isConn, mapReady: false });
            }
        }, 500);
    }

    // 等到畫布渲染完才建立 MapRenderer
    componentDidUpdate() {
        if (!this.initialized && this.state.connected && this.canvasRef.current) {
            this.renderer = new MapRenderer(this.canvasRef.current);
            this.initMapSubscriptions();
            this.initOdomSubscription();
            this.initialized = true;       // 只執行一次初始化
        }
    }

    componentWillUnmount() {
        clearInterval(this.interval);

        // 取消自己訂閱的 callback
        if (this.mapInfoCallback)
            mqttService.unsubscribe(Config.MAP_INFO_TOPIC, this.mapInfoCallback);

        if (this.mapUpdateCallback)
            mqttService.unsubscribe(Config.MAP_UPDATE_TOPIC, this.mapUpdateCallback);

        if (this.odomCallback)
            mqttService.unsubscribe(Config.ODOM_TOPIC, this.odomCallback);

        // 重設 callback 記錄
        this.mapInfoCallback = null;
        this.mapUpdateCallback = null;
        this.odomCallback = null;

        this.renderer?.destroy();
        this.renderer = null;
        this.initialized = false;
    }

    initMapSubscriptions() {
        // 同步上層模式（nav 或 slam）
        const mode = this.props.currentMode;

        // 初次建立 - 根據導航或建圖模式切換訂閱不同的地圖和定位 topic
        this.switchMapTopic(mode);

        // ========== 設定地圖點選事件(目標回調) ==========
        if (this.renderer) {
            this.renderer.onGoalSelected = (goal) => {
                this.publishGoal(goal);

                // 如果父元件有 callback，通知 Home.jsx - 確認導航目標後要重新設定按鈕初始化
                if (this.props.onGoalSelected) this.props.onGoalSelected(goal);
            };
        }

    }

    publishGoal(goal) {
        // 將 yaw 角轉成四元數
        const yawToQuaternion = (yaw) => {
            return {
                x: 0.0,
                y: 0.0,
                z: Math.sin(yaw / 2),
                w: Math.cos(yaw / 2),
            };
        };

        const rosYaw = -goal.yaw;;
        const q = yawToQuaternion(rosYaw);

        const nowMs = Date.now();

        const msg = {
            header: {
                frame_id: "map",
                stamp: {
                    secs: Math.floor(nowMs / 1000),
                    nsecs: (nowMs % 1000) * 1e6,
                },
            },
            pose: {
                position: { x: goal.x, y: goal.y, z: 0.0 },
                orientation: q,
            },
        };

        mqttService.publish(Config.WEB_GOAL_POSE_TOPIC, msg);
    }

    // 建圖與導航切換訂閱不同地圖
    switchMapTopic(mode) {
        // 取消舊訂閱
        if (this.mapInfoCallback)
            mqttService.unsubscribe(Config.MAP_INFO_TOPIC, this.mapInfoCallback);
        if (this.mapUpdateCallback)
            mqttService.unsubscribe(Config.MAP_UPDATE_TOPIC, this.mapUpdateCallback);

        this.mapInfoCallback = null;
        this.mapUpdateCallback = null;

        this.renderer?.resetMap();   // 每次切換模式時先重置地圖
        this.setState({ mapReady: false });

        if (mode === "slam") {
            // 先訂 map/info 建立基底
            this.mapInfoCallback = (msg) => {
                if (!msg?.info || !msg?.data) return;
                this.renderer.updateStaticMap(msg);
                if (!this.state.mapReady) this.setState({ mapReady: true });
            };
            mqttService.subscribe(Config.MAP_INFO_TOPIC, this.mapInfoCallback);

            // 再訂閱地圖增量更新-片段更新地圖
            this.mapUpdateCallback = (msg) => {
                if (!msg?.map_version) return;
                this.renderer.applyMapUpdate(msg);
            };

            mqttService.subscribe(Config.MAP_UPDATE_TOPIC, this.mapUpdateCallback);

        } else if (mode === "nav") {
            // 新增如果有轉換頁面再回來這個頁面時，就使用之前儲存的靜態地圖資訊渲染
            if (cachedStaticMapInfo && !this.state.mapReady) {
                this.renderer.updateStaticMap(cachedStaticMapInfo);
                this.setState({ mapReady: true });
            }

            // 導航只有靜態地圖
            this.mapInfoCallback = (msg) => {
                if (!msg?.info || !msg?.data) return;

                // 新增如果有轉換頁面就去更新快取地圖
                cachedStaticMapInfo = msg;

                this.renderer.updateStaticMap(msg);
                if (!this.state.mapReady) this.setState({ mapReady: true });
            };

            mqttService.subscribe(Config.MAP_INFO_TOPIC, this.mapInfoCallback);
        }
    }

    // 建圖與導航統一訂閱 odom，不再依模式切換
    initOdomSubscription() {
        this.odomCallback = (msg) => {
            if (!msg?.pose) return;
            this.renderer?.updateRobotPose(msg);
        };

        mqttService.subscribe(Config.ODOM_TOPIC, this.odomCallback);
    }

    // 提供給 Panel.jsx 呼叫：切換導航模式
    setGoalMode(enable) {
        if (this.renderer && this.canvasRef.current) {
            this.renderer.setInteractionMode(enable ? "set_goal" : "pan");
            this.canvasRef.current.style.cursor = enable ? "crosshair" : "grab";
        }
    }

    render() {
        const { connected, mapReady } = this.state;
        let statusClass = "";
        let statusText = "";

        if (!connected) { statusClass = "waiting-ros"; statusText = "等待連線中 ..."; }
        else if (!mapReady) { statusClass = "waiting-map"; statusText = "MAP 無數據 ..."; }

        return (
            <div className="map-container">
                <canvas
                    className="map-canvas"
                    ref={this.canvasRef}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                        opacity: mapReady ? 1 : 0.3,
                        filter: mapReady ? "none" : "blur(2px)",
                        transition: "opacity 0.5s ease",
                    }}
                />

                {(!connected || !mapReady) && (
                    <div>
                        <span className={`map-status ${statusClass}`}>{statusText}</span>
                    </div>
                )}
            </div>
        );
    }
}

export default Map;
