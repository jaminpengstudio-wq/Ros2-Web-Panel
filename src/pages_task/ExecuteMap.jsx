import { Component, createRef } from "react";
import mqttService from "../scripts/MqttService";
import Config from "../scripts/config";
import { ExecuteMapRenderer } from "../scripts/ExecuteMapRenderer"

class ExecuteMap extends Component {
    constructor(props) {
        super(props);
        this.canvasRef = createRef();
        this.state = {
            mapInfo: null,
            robotPose: null,
            plan: null,
            showPlan: true,
        };

        this.renderer = null; // 保存 ExecuteMapRenderer 實例
        this.handleMapInfo = this.handleMapInfo.bind(this);
        this.handleRobotPose = this.handleRobotPose.bind(this);
        this.handlePlan = this.handlePlan.bind(this);
    }

    togglePlan = () => {
        this.setState(prev => ({
            showPlan: !prev.showPlan
        }));
    };

    handleMapInfo(payload) {
        this.setState({ mapInfo: payload });
    }

    handleRobotPose(payload) {
        this.setState({ robotPose: payload });
    }

    handlePlan(payload) {
        this.setState({ plan: payload });
    }

    componentDidMount() {
        if (this.canvasRef.current) {
            this.renderer = new ExecuteMapRenderer(this.canvasRef.current);
        }

        if (this.props.active) {
            this.initMap();
        }
    }

    componentDidUpdate(prevProps, prevState) {
        const { active } = this.props;
        const { mapInfo, robotPose } = this.state;

        if (!this.renderer && this.canvasRef.current) {
            this.renderer = new ExecuteMapRenderer(this.canvasRef.current);
        }

        // active 從 false → true
        if (!prevProps.active && active) {
            this.initMap();
        }

        // active 從 true → false
        if (prevProps.active && !active) {
            this.cleanupMap();
            // this.setState({ mapInfo: null });

            // if (this.renderer) {
            //     this.renderer.destroy();
            //     this.renderer = null;
            // }
        }

        // 當 showPlan (是否顯示路徑規劃) 改變時通知 renderer
        if (this.renderer && this.state.showPlan !== prevState.showPlan) {
            this.renderer.setPlanVisibility(this.state.showPlan);
        }

        // mapInfo 更新後畫地圖
        if (mapInfo && mapInfo !== prevState.mapInfo && this.renderer) {
            // if (!this.renderer) {
            //     this.renderer = new ExecuteMapRenderer(this.canvasRef.current);
            // }

            this.renderer.setMap(mapInfo);
        }

        // 畫機器位置
        if (robotPose && robotPose !== prevState.robotPose && this.renderer) {
            this.renderer.setRobotPose(robotPose);
        }

        // 畫路徑規劃
        if (this.state.plan && this.state.plan !== prevState.plan && this.renderer) {
            this.renderer.setPlan(this.state.plan);
        }
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
        mqttService.subscribe(Config.POSE_TOPIC, this.handleRobotPose);
        mqttService.subscribe(Config.PLAN_TOPIC, this.handlePlan);
    }

    cleanupMap() {
        mqttService.unsubscribe(Config.MAP_INFO_TOPIC, this.handleMapInfo);
        mqttService.unsubscribe(Config.POSE_TOPIC, this.handleRobotPose);
        mqttService.unsubscribe(Config.PLAN_TOPIC, this.handlePlan);
    }


    render() {
        const { active } = this.props;
        const { mapInfo } = this.state;

        return (
            <div className="execute-map-container">
                {!active && (
                    <span className="execute-map-hint">尚未啟動任務</span>
                )}

                {!mapInfo && active && (
                    <span className="execute-map-hint">等待地圖資料中...</span>
                )}

                {/* 控制是否顯示路徑規劃的線 */}
                <div className="map-toggle"
                    style={{
                        visibility: active ? "visible" : "hidden"
                    }}
                >
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={this.state.showPlan}
                            onChange={this.togglePlan}
                        />
                        <span className="slider"></span>
                    </label>
                    <span className="toggle-label">顯示路徑</span>
                </div>

                <canvas
                    ref={this.canvasRef}
                    style={{
                        visibility: active ? "visible" : "hidden"
                    }}
                />

            </div>
        );
    }
};

export default ExecuteMap;

