import { Component, createRef } from "react";
import { Button } from "react-bootstrap";
import rosApi from "../scripts/rosApi";

import RosControlPanel from "./RosControlPanel";
import Map from "./Map";
import Camera from "./Camera";
import RobotState from "./RobotState";
import Teleoperation from "./Teleoperation";
import PowerStatus from "./PowerStatus";
import SafetyStop from "./SafetyStop";
import Emergency from "./Emergency";
import LoadingScreen from "./LoadingScreen";
import ToastContainer from "./ToastContainer";


class Panel extends Component {
    constructor(props) {
        super(props);
        this.mapRef = createRef();   // 用來呼叫 Map 子元件的函式
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
        // console.log("🔍 正在檢查 server 端 ROS 狀態...");

        const status = await rosApi.getStatus();
        // console.log("📡 從 server 拿到狀態:", status);

        this.setState({
            currentMode: status.mode,
        });

        if (!status.running) return; // ROS沒有在啟動不做任何事

        // 如果ROS有在啟動-修正 UI
        if (status.mode === "slam") {
            this.setState({ isSlamming: true });
            if (this.mapRef.current) this.mapRef.current.switchPoseTopic("slam");
        }

        if (status.mode === "nav") {
            this.setState({ isSlamming: false });
            if (this.mapRef.current) this.mapRef.current.switchPoseTopic("nav");
        }
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

    // 接收建圖 / 導航切換
    handleModeChange = (mode) => {
        // console.log("🛰️ 模式切換:", mode);

        this.setState({ currentMode: mode });

        if (this.mapRef.current) {
            this.mapRef.current.switchPoseTopic(mode);
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

    render() {
        const { goalMode, isSidebarOpen } = this.state;

        return (
            <div>
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
                                <Map ref={this.mapRef} onGoalSelected={this.handleGoalSelected} />
                            </div>

                            <div className="second-border robotState-box">
                                <RobotState />
                            </div>
                        </div>
                    </div>

                    <div className="camera-panel">
                        {/* <span className="mb-0">CAMERAS</span> */}

                        <div className="main-border camera-card">
                            <Camera />

                            <div className="second-border control-box">
                                <div className="safetyStop-area">
                                    <SafetyStop />
                                </div>

                                <div className="emergency-area">
                                    <Emergency />
                                </div>

                                <div className="teleop-area">
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
