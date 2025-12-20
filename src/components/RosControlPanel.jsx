import { Component } from "react";
import { Form } from "react-bootstrap";
import rosApi from "../scripts/rosApi";

class RosControlPanel extends Component {
    constructor(props) {
        super(props);
        this.state = {
            folderName: "",
            saving: false,
            maps: [],               // 保存從 server 抓到的地圖名稱
            mapLoaded: false,       // 控制是否已嘗試抓取過地圖名稱
            navOpen: false,         // 控制「啟動導航」下拉選單開關
            showSavePopup: false,   // 控制儲存視窗
        };
    }

    // 元件初始化：自動抓取地圖列表
    async componentDidMount() {
        try {
            const maps = await rosApi.getMaps();
            this.setState({ maps, mapLoaded: true });

        } catch (err) {
            // console.error("❌ 取得地圖列表失敗:", err);
            this.setState({ maps: [], mapLoaded: true }); // 即使失敗也標記已載入

            // this.props.addToast(err.message || err.toString(), "error");
            // this.props.addToast("尚未連線至機器", "warning");
        }
    }

    // 啟動建圖或導航的 Ros2 launch 指令
    handleStartMode = async (mode, mapName = null) => {
        // 關閉右邊 Sidebar
        if (this.props.onCloseSidebar) this.props.onCloseSidebar();

        // 沒有成功連線到後端
        if (this.state.maps.length === 0) {
            this.props.addToast("尚未連線至機器，無法啟動模式", "warning");
            return;
        }

        // 已有模式在運行 → 禁止
        if (this.props.currentMode !== "idle") {
            this.props.addToast(`已在 ${this.props.currentMode} 模式中`, "warning");
            return;
        }

        this.props.showLoading(
            mode === "slam" ? "啟動建圖中 ..." : "啟動導航中 ...",
            10000  //可以自由調整秒數
        );

        try {
            const msg = await rosApi.startMode(mode, mapName);
            this.props.addToast(msg, "success");

            // 判斷啟動模式-是否可使用儲存地圖功能
            if (mode === "slam") this.props.setSlamming(true);
            else this.props.setSlamming(false);

            // 通知父元件(Panel.jsx)- 啟動不同的模式，切換訂閱不同的機器定位 Topic
            if (this.props.onModeChange) this.props.onModeChange(mode);

        } catch (err) {
            this.props.addToast(err.message || err.toString(), "error");
        }
    };

    // 停止ROS運作
    handleStopMode = async () => {
        // 關閉右邊 Sidebar
        if (this.props.onCloseSidebar) this.props.onCloseSidebar();

        // 沒有成功連線到後端
        if (this.state.maps.length === 0) {
            this.props.addToast("尚未連線至機器，不需要停止 ROS", "warning");
            return;
        }

        try {
            const msg = await rosApi.stopMode();
            this.props.addToast(msg, "success");

            // 通知 Panel 回到 idle 狀態
            if (this.props.onModeChange) this.props.onModeChange("idle");

            this.props.setSlamming(false);
        } catch (err) {
            this.props.addToast(err.message || err.toString(), "error");
        }
    };

    /* 點擊確認儲存地圖 */
    confirmSaveMap = async () => {
        const { folderName } = this.state;

        if (!folderName.trim()) {
            this.props.addToast("請輸入地圖名稱！", "error");
            return;
        }

        this.setState({ saving: true });

        try {
            const msg = await rosApi.saveMap(folderName);
            this.props.addToast(msg, "success");

            // 關閉右邊 Sidebar
            if (this.props.onCloseSidebar) this.props.onCloseSidebar();
        } catch (err) {
            this.props.addToast(err.message || err.toString(), "error");
        } finally {
            this.setState({
                saving: false,
                showSavePopup: false,
                folderName: "",
            });
        }
    };

    /* 取消儲存地圖 */
    cancelSave = () => {
        this.setState({ showSavePopup: false, folderName: "" });
    };

    render() {
        const { folderName, saving, maps, mapLoaded, navOpen, showSavePopup } = this.state;

        return (
            <div className="ros-controls-bar">
                <div className="ros-controls-group">
                    <span className="ros-btn ros-btn-slam" onClick={() => this.handleStartMode("slam")}>
                        啟動建圖
                    </span>

                    <div className="ros-save-group">
                        <span
                            className={`ros-btn ros-btn-save ${!this.props.isSlamming ? "disabled" : ""}`}
                            onClick={() => {
                                if (!this.props.isSlamming) return; // 防止誤點
                                this.setState({ showSavePopup: true });
                            }}
                        >
                            儲存地圖
                        </span>
                    </div>

                    {/* 可展開的啟動導航選單 */}
                    <div className="nav-dropdown-wrapper">
                        <span
                            className="ros-btn ros-btn-nav"
                            onClick={() => this.setState({ navOpen: !navOpen })}
                        >
                            啟動導航 ▾
                        </span>

                        {/* 下拉選單 */}
                        {navOpen && (
                            <div className="nav-dropdown">
                                {!mapLoaded && (
                                    <div className="nav-item disabled">載入中...</div>
                                )}

                                {mapLoaded && maps.length === 0 && (
                                    <div className="nav-item disabled">沒有地圖</div>
                                )}

                                {maps.map((map) => (
                                    <div
                                        key={map}
                                        className="nav-item"
                                        onClick={() => {
                                            this.setState({ navOpen: false });
                                            this.handleStartMode("nav", map);

                                            if (this.props.onCloseSidebar) this.props.onCloseSidebar();
                                        }}
                                    >
                                        {map}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <span className="ros-btn ros-btn-stop" onClick={this.handleStopMode}>
                        停止 ROS
                    </span>
                </div>


                {/* ------- 儲存地圖彈窗 ------- */}
                {showSavePopup && (
                    <div className="save-popup-overlay">
                        <div className="save-popup">
                            <div className="save-popup-title">
                                <span>儲存地圖</span>
                            </div>

                            <Form.Control
                                type="text"
                                placeholder="輸入地圖名稱"
                                value={folderName}
                                onChange={(e) => this.setState({ folderName: e.target.value })}
                                disabled={saving}
                            />

                            <div className="popup-buttons">
                                <button className="popup-btn cancel" onClick={this.cancelSave}>
                                    取消
                                </button>
                                <button
                                    className="popup-btn confirm"
                                    onClick={this.confirmSaveMap}
                                    disabled={saving}
                                >
                                    {saving ? "儲存中..." : "確認"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        );
    }
}

export default RosControlPanel;
