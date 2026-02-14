import { Component, createRef } from "react";
import mqttService from "../scripts/MqttService";
import Config from "../scripts/config";
import { WaypointMapRenderer } from "../scripts/WaypointMapRenderer"

class WaypointMap extends Component {
    constructor(props) {
        super(props);
        this.canvasRef = createRef();
        this.state = {
            mapInfo: null,
        };

        this.handleMapInfo = this.handleMapInfo.bind(this);
        this.renderer = null; // 保存 WaypointMapRenderer 實例
    }

    componentDidMount() {
        if (this.props.active) {
            this.initMap();
        }
    }

    componentDidUpdate(prevProps, prevState) {
        const { active, selectedPose, confirmedWaypoints } = this.props;
        const { mapInfo } = this.state;

        // active 從 false → true
        if (!prevProps.active && active) {
            this.initMap();
        }

        // active 從 true → false
        if (prevProps.active && !active) {
            this.cleanupMap();
            this.setState({ mapInfo: null });
            if (this.renderer) {
                this.renderer.destroy();
                this.renderer = null;
            }
        }

        // mapInfo 更新後畫地圖
        if (mapInfo && mapInfo !== prevState.mapInfo && this.canvasRef.current) {
            if (!this.renderer) {
                this.renderer = new WaypointMapRenderer(this.canvasRef.current);

                // 點擊座標地點
                this.renderer.setOnLeftClick((pose) => {
                    // 1. 通知父層狀態（顯示紅色座標點）
                    this.props.onMapClick?.(pose);

                    // 2. 同步送到 MQTT（debug 用）
                    this.publishDebugRedMark(pose);
                });
            }
            this.renderer.setMap(mapInfo);
        }

        // 畫紅色 mark
        if (this.renderer && selectedPose !== prevProps.selectedPose) {
            this.renderer.setSelectedPose(selectedPose);

        }

        // 畫綠色 mark
        if (this.renderer && confirmedWaypoints !== prevProps.confirmedWaypoints) {
            this.renderer.setConfirmedWaypoints(confirmedWaypoints);
        }
    }

    // 發布選取座標時的紅色 mark 到 ROS 檢查是否相同座標位置
    publishDebugRedMark(pose) {
        if (!mqttService.client?.connected) return;

        const payload = {
            frame_id: "map",
            stamp: Date.now() / 1000, // seconds
            pose: {
                x: pose.x,
                y: pose.y,
                yaw: pose.yaw ?? 0.0,
            },
            source: "web",
        };

        mqttService.publish(
            Config.DEBUG_WAYPOINT_RED_MARK_TOPIC,
            payload
        );
    }

    componentWillUnmount() {
        this.cleanupMap();
        if (this.renderer) {
            this.renderer.destroy();
            this.renderer = null;
        }
    }

    initMap() {
        mqttService.connect();
        mqttService.subscribe(Config.MAP_INFO_TOPIC, this.handleMapInfo);

        const requestMapSafely = () => {
            mqttService.publish(Config.MAP_REQUEST_TOPIC, { request: "map" });
        };

        if (mqttService.isConnected?.()) requestMapSafely();
        else if (mqttService.onConnect) mqttService.onConnect(requestMapSafely);
        else setTimeout(requestMapSafely, 500);
    }

    cleanupMap() {
        mqttService.unsubscribe(Config.MAP_INFO_TOPIC, this.handleMapInfo);
    }

    handleMapInfo(payload) {
        this.setState({ mapInfo: payload });
    }

    // === 原本 useImperativeHandle 暴露的方法 ===
    requestMap() {
        if (!this.props.active) return;
        if (!mqttService.isConnected?.()) return;

        mqttService.publish(Config.MAP_REQUEST_TOPIC, { request: "map" });
    }

    render() {
        const { active } = this.props;
        const { mapInfo } = this.state;

        if (!active) {
            return (
                <div className="waypoint-map-container">
                    <span className="waypoint-map-hint">請先選擇地圖名稱</span>
                </div>
            );
        }

        return (
            <div className="waypoint-map-container">
                {!mapInfo && (
                    <span className="waypoint-map-hint">等待地圖資料中...</span>
                )}

                <canvas ref={this.canvasRef} />

            </div>
        );
    }
}

export default WaypointMap;
