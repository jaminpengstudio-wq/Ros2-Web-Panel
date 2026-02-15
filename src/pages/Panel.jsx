import { Component, createRef } from "react";
import { Button } from "react-bootstrap";
import rosApi from "../scripts/rosApi";
import mqttService from "../scripts/MqttService";

import LoadingScreen from "../components/LoadingScreen";
import ToastContainer from "../components/ToastContainer";

import RosControlPanel from "../pages_panel/RosControlPanel";
import Map from "../pages_panel/Map";
import RobotState from "../pages_panel/RobotState";
import Teleoperation from "../pages_panel/Teleoperation";
import PowerStatus from "../pages_panel/PowerStatus";
import SafetyStop from "../pages_panel/SafetyStop";
import Emergency from "../pages_panel/Emergency";

import AwsWebrtcCamera from "../pages_panel/AwsWebrtcCamera";
// import RtspStreamerCamera from "../pages_panel/RtspStreamerCamera";

class Panel extends Component {
    constructor(props) {
        super(props);
        this.mapRef = createRef();     // 用來呼叫 Map 子元件的函式
        const savedState = localStorage.getItem("rightSidebarOpen") === "true";

        this.state = {
            goalMode: false,           // 是否處於導航模式
            isSidebarOpen: savedState,
            isSlamming: false,         // 是否正在建圖
            currentMode: "idle",       // 目前模式：slam / nav / idle

            loading: false,            // 連線進度條狀態
            loadingMessage: "",        // 連線進度條訊息
            toasts: [],                // 土司訊息陣列
        };

        this.toastId = 0;
    }

    // 顯示 API 回傳的訊息
    addToast = (message, type = "success", duration = 5000) => {
        const id = this.toastId++;
        this.setState((prev) => ({
            toasts: [...prev.toasts, { id, message, type, duration }]
        }));
    };

    async componentDidMount() {
        const status = await rosApi.getStatus();

        this.setState({
            currentMode: status.mode,
        });

        if (!status.running) return;
    }


    // 顯示 LoadingScreen
    showLoading = (message, duration = 5000, callback) => {
        this.setState({ loading: true, loadingMessage: message }, () => {
            setTimeout(() => {
                this.setState({ loading: false });
                if (callback) callback();
            }, duration);
        });
    };

    // 切換模式狀態 slam / nav / idle
    handleModeChange = (mode) => {
        // console.log("🛰️ 模式切換:", mode);
        this.setState({ currentMode: mode });

        // 在模式啟動時連線 MQTT
        if (!mqttService.connected) {
            // console.log("🔌 MQTT 尚未連線 → 嘗試連線...");
            mqttService.connect();
        }
    };

    toggleSidebar = () => {
        this.setState((prev) => {
            const newState = !prev.isSidebarOpen;
            localStorage.setItem("rightSidebarOpen", newState);
            return { isSidebarOpen: newState };
        });
    };

    // 切換啟用與取消導航模式-選擇單點目標地
    handleSetGoalMode = () => {
        if (this.mapRef.current) {
            const newMode = !this.state.goalMode;
            this.mapRef.current.setGoalMode(newMode);
            this.setState({ goalMode: newMode });
        }
    };

    handleGoalSelected = (goal) => {
        // console.log("導航目標已選擇:", goal);

        // 點完導航目標，自動取消導航模式
        this.setState({ goalMode: false });
    };

    // 手機版本-拖曳手勢控制toggle狀態
    startDrag = (e) => {
        e.preventDefault();
        this.dragStartY = e.touches ? e.touches[0].clientY : e.clientY;
        this.setState({ dragging: true });
        document.addEventListener("mousemove", this.onDrag);
        document.addEventListener("touchmove", this.onDrag);
        document.addEventListener("mouseup", this.endDrag);
        document.addEventListener("touchend", this.endDrag);
    };

    onDrag = (e) => {
        if (!this.state.dragging) return;
        const currentY = e.touches ? e.touches[0].clientY : e.clientY;
        const delta = this.dragStartY - currentY;
        // 0 = bottom hidden, positive = sheet up
        this.setState({ dragDelta: Math.max(delta, 0) });
    };

    endDrag = () => {
        document.removeEventListener("mousemove", this.onDrag);
        document.removeEventListener("touchmove", this.onDrag);
        document.removeEventListener("mouseup", this.endDrag);
        document.removeEventListener("touchend", this.endDrag);

        // 閾值決定是否展開或收合
        if (this.state.dragDelta > 50) {
            this.setState({ mobileControlOpen: true });
        } else {
            this.setState({ mobileControlOpen: false });
        }
        this.setState({ dragging: false, dragDelta: 0 });
    };


    render() {
        const { goalMode, isSidebarOpen } = this.state;

        return (
            <div className="pt-3">

                {/* 土司容器 */}
                <ToastContainer toasts={this.state.toasts} />

                <div className="power-area">
                    {/*  true 使用實體電力數據, false 使用模擬電力數據 */}
                    <PowerStatus simulate={true} />
                </div>

                {/* 啟動 ROS 模式時的連線進度狀態 */}
                {this.state.loading && (
                    <LoadingScreen message={this.state.loadingMessage} duration={5000} />
                )}

                {/* API連線 ROS的本地端 Server執行系統指令- 右側toggle bar */}
                <div className={`right-sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>
                    <div className="right-sidebar-header">
                        <span className="execution-mode-label" onClick={this.toggleSidebar}>
                            啟動模式
                        </span>
                    </div>

                    {isSidebarOpen && (
                        <div className="right-sidebar-content">
                            <RosControlPanel
                                onModeChange={this.handleModeChange}
                                onCloseSidebar={() => this.setState({ isSidebarOpen: false })}
                                isSlamming={this.state.isSlamming}
                                setSlamming={(v) => this.setState({ isSlamming: v })}
                                currentMode={this.state.currentMode}
                                addToast={this.addToast}
                                showLoading={this.showLoading}
                            />
                        </div>
                    )}
                </div>

                {/* 地圖 + 鏡頭 */}
                <div className="section-header main-font">

                    <div className="map-panel">
                        <div className="main-border map-card">
                            <div className="map-option">
                                <Button
                                    className={`single-nav-btn py-0 ${goalMode ? "single-nav-btn-active" : ""}`}
                                    onClick={this.handleSetGoalMode}
                                >
                                    {goalMode ? "取消選取" : "選取導航點"}
                                </Button>
                            </div>

                            <div className="map-box">
                                <Map
                                    ref={this.mapRef}
                                    currentMode={this.state.currentMode}
                                    onGoalSelected={this.handleGoalSelected}
                                />
                            </div>

                            <div className="second-border robotState-box desktop-only">
                                <RobotState />
                            </div>
                        </div>
                    </div>

                    <div className="camera-panel">
                        <div className="main-border camera-card">

                            {/* 使用 AWS KVS WebRTC */}
                            <AwsWebrtcCamera />

                            {/* 使用 RTSP 格式轉換  */}
                            {/* <RtspStreamerCamera currentMode={this.state.currentMode} /> */}

                            <div className="second-border control-box desktop-only">
                                <div>
                                    <SafetyStop />
                                </div>

                                <div>
                                    <Emergency />
                                </div>

                                <div>
                                    <Teleoperation />
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* 手機格式 */}
                    <div className="mobile-panel">
                        <div className="mobile-main-area">

                            <div
                                className="mobile-control-toggle"
                                onMouseDown={this.startDrag}
                                onTouchStart={this.startDrag}
                                onClick={() =>
                                    this.setState((prev) => ({
                                        mobileControlOpen: !prev.mobileControlOpen
                                    }))
                                }
                            >
                                <div className="handle-line" />
                                <div className="handle-line" />
                                <div className="handle-line" />
                            </div>

                            <div className={
                                `mobile-control-area ${this.state.mobileControlOpen ? 'expanded' : 'collapsed'}`
                            }>
                                <div>
                                    <SafetyStop />
                                </div>
                                <div>
                                    <Emergency />
                                </div>
                                <div>
                                    <Teleoperation />
                                </div>
                            </div>

                        </div>
                    </div>

                </div>

            </div>
        );
    }
}

export default Panel;
