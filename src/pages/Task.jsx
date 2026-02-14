import { Component, createRef } from "react";
import ToastContainer from "../components/ToastContainer";
import rosApi from "../scripts/rosApi";
import scheduleApi from "../scripts/scheduleApi";
import executeApi from "../scripts/executeApi";

import WaypointPanel from "../pages_task/WaypointPanel";
import WaypointMap from "../pages_task/WaypointMap";
import SchedulePanel from "../pages_task/SchedulePanel";
import ScheduleWorkspace from "../pages_task/ScheduleWorkspace";
import ExecuteTaskPanel from "../pages_task/ExecuteTaskPanel";
import ExecuteMap from "../pages_task/ExecuteMap";
import ExecuteRtspCamera from "../pages_task/ExecuteRtspCamera";

class Task extends Component {
    constructor(props) {
        super(props);
        this.mapRef = createRef();     // 用來呼叫 Map 子元件的函式

        this.state = {
            currentMode: "idle",       // 目前 ROS 狀態 null | "slam" | "nav" | "waypoint"
            activePanel: null,
            isLocked: false,           // 限制切換建立座標、排程任務、執行排程按鈕
            maps: [],                  // 地圖名稱列表
            isMapActive: false,        // 控制地圖是否要顯示
            toasts: [],                // 土司訊息陣列

            resumeWaypoint: false,     // 切換頁面後要恢復啟動 [建立座標] 時的狀態
            lastActiveMap: null,       // 最後使用的地圖
            lastActionMode: null,      // 最後操作模式 ("新增"/"修改"/"刪除")

            selectedPose: null,        // 點擊地圖座標的mark- 紅色(尚未確認)
            confirmedWaypoints: [],    // 點擊地圖座標的mark- 綠色(已確認)

            waypointFilesForSchedule: [],  // 取得所有座標地點文件列表 (任務排程用)
            resumeSchedule: false,
            scheduleWaypointData: null,    // 儲存指定座標地點文件的檔案內容
            createTaskMode: null,          // 目前選擇建立的任務模式
            allScheduleTasks: [],          // 儲存所有建立的任務排程
            // 可擴充任務類型
            taskTypeOptions: [
                { key: "navigate", label: "導航地點" },
                { key: "wait", label: "暫停等待" },
                { key: "rotate", label: "旋轉角度" },
                { key: "capture_image", label: "影像拍攝" },
                { key: "scan_qr", label: "QR -掃描" },
            ],

            scheduleFilesForExecute: [],   // 取得所有任務排程名稱文件列表 (執行任務用)
            resumeExecute: false,
            isRunningExecuteLocked: false, // 限制執行任務時不能在點擊[執行任務]按鈕
            currentMissionSequence: [],    // 儲存解析後的所有任務排程數據
        };

        this.toastId = 0;
    }

    async componentDidMount() {
        this.initTaskPage();
    }

    // 把初始化拆成單一方法
    initTaskPage = async () => {
        try {
            const [
                status, maps, waypointFilesForSchedule, scheduleFilesForExecute,
            ] = await Promise.all([
                rosApi.getStatus(),
                rosApi.getMaps(),
                scheduleApi.getAllWaypointList(),
                executeApi.getAllScheduleList(),
            ]);

            this.setState(
                {
                    currentMode: status?.mode ?? "idle",
                    maps: Array.isArray(maps) ? maps : [],
                    waypointFilesForSchedule: Array.isArray(waypointFilesForSchedule)
                        ? waypointFilesForSchedule
                        : [],
                    scheduleFilesForExecute: Array.isArray(scheduleFilesForExecute)
                        ? scheduleFilesForExecute
                        : [],
                },
                () => {

                    // 先恢復 ROS 狀態
                    this.resumeFromStatus(status);

                    // 再檢查 sessionStorage
                    const hasScheduleSession = sessionStorage.getItem("schedule_panel_active") === "true";
                    if (hasScheduleSession) {
                        this.setState({
                            activePanel: "schedule",
                            resumeSchedule: true,
                            isLocked: true,
                        });
                    }

                    // 切換頁面後取回任務排程用的地點座標內容
                    const sretrieveFile = sessionStorage.getItem("schedule_retrieve_file");
                    if (sretrieveFile) {
                        this.handleLoadScheduleWaypoint(sretrieveFile);
                    }

                    const hasExecuteSession = sessionStorage.getItem("execute_panel_active") === "true";
                    if (hasExecuteSession) {
                        this.setState({
                            activePanel: "execute",
                            resumeExecute: true,
                            isLocked: true,

                        });
                    }

                    const hasRunningExecute = sessionStorage.getItem("execute_RunningExecute") === "true";
                    if (hasRunningExecute) {
                        this.setState({
                            isRunningExecuteLocked: true,
                        });
                    }
                }
            );
        } catch (err) {
            console.error("❌ 初始化 Task 頁面失敗:", err);
            this.addToast("無法取得系統狀態或地圖列表", "error");
        }
    };

    // 檢查是否有使用到 ROS 狀態
    resumeFromStatus = (status) => {
        if (!status?.running) return;

        // waypoint 狀態恢復
        if (status.mode === "waypoint") {
            this.setState(prev => ({
                currentMode: "waypoint",
                activePanel: "create",
                isLocked: true,
                isMapActive: true,
                resumeWaypoint: true,

                // 保留 lastActiveMap & lastActionMode
                lastActiveMap: prev.lastActiveMap,
                lastActionMode: prev.lastActionMode,
            }));
        }

        // schedule 狀態恢復
        if (status.mode === "schedule") {
            this.setState({
                currentMode: "schedule",
                activePanel: "schedule",
                isLocked: true,
                isMapActive: false,
                resumeSchedule: true,
            });
        }

        // execute 狀態恢復
        if (status.mode === "execute") {
            this.setState({
                currentMode: "execute",
                activePanel: "execute",
                isLocked: true,
                isMapActive: true,
                resumeExecute: true,
            });
        }
    };

    // 顯示 API 回傳的訊息
    addToast = (message, type = "success", duration = 1500) => {
        const id = this.toastId++;
        this.setState((prev) => ({
            toasts: [...prev.toasts, { id, message, type, duration }]
        }));
    };

    lockPanel = () => this.setState({ isLocked: true });
    unlockPanel = () => this.setState({ isLocked: false });

    lockRunningExecute = () => this.setState({ isRunningExecuteLocked: true });
    unlockRunningExecute = () => this.setState({ isRunningExecuteLocked: false });

    handleSwitchPanel = (panel) => {
        if (this.state.isLocked) {
            this.addToast(
                `目前無法切換 ${panel}，請先 [完成] 或 [取消] 後再切換功能`,
                "warning"
            );
            return;
        }

        this.setState({ activePanel: panel });
    };

    renderLeftBottom() {
        const {
            activePanel, maps, resumeWaypoint,
            waypointFilesForSchedule, resumeSchedule,
            scheduleFilesForExecute, resumeExecute,
            isRunningExecuteLocked, currentMissionSequence
        } = this.state;

        switch (activePanel) {
            case "create":
                return (
                    <WaypointPanel
                        maps={maps}
                        addToast={this.addToast}
                        lockPanel={this.lockPanel}
                        unlockPanel={this.unlockPanel}
                        mapRef={this.mapRef}
                        onMapStart={() => this.setState({ isMapActive: true })}
                        onMapStop={() => this.setState({ isMapActive: false })}
                        resume={resumeWaypoint}
                        onResumeConsumed={() => this.setState({ resumeWaypoint: false })}

                        selectedPose={this.state.selectedPose}
                        confirmedWaypoints={this.state.confirmedWaypoints}
                        clearWaypointState={this.clearWaypointState}
                        onConfirmWaypoint={this.handleConfirmWaypoint}
                        setConfirmedWaypoints={this.setConfirmedWaypoints}
                        refreshWaypointList={this.refreshWaypointList}
                    />
                );
            case "schedule":
                return (
                    <SchedulePanel
                        waypointFilesForSchedule={waypointFilesForSchedule}
                        addToast={this.addToast}
                        lockPanel={this.lockPanel}
                        unlockPanel={this.unlockPanel}
                        resume={resumeSchedule}
                        onResumeConsumed={() => this.setState({ resumeSchedule: false })}

                        onLoadWaypointFile={this.handleLoadScheduleWaypoint}
                        onClearWaypointData={this.clearScheduleWaypointData}
                        taskTypeOptions={this.state.taskTypeOptions}
                        setCreateTaskMode={this.setCreateTaskMode}
                        onSubmitAllSchedules={this.handleSubmitAllSchedules}
                    />
                );
            case "execute":
                return (
                    <ExecuteTaskPanel
                        scheduleFilesForExecute={scheduleFilesForExecute}
                        addToast={this.addToast}
                        lockPanel={this.lockPanel}
                        unlockPanel={this.unlockPanel}
                        resume={resumeExecute}
                        onResumeConsumed={() => this.setState({ resumeExecute: false })}

                        isRunningExecuteLocked={isRunningExecuteLocked}
                        lockRunningExecute={this.lockRunningExecute}
                        unlockRunningExecute={this.unlockRunningExecute}
                        handleROSLaunchFile={this.handleROSLaunchFile}
                        cancelROSLaunch={this.cancelROSLaunch}

                        startMission={this.startMission}
                        stopMission={this.stopMission}
                        canclMission={this.canclMission}

                        deleteMissionFile={this.deleteMissionFile}
                        currentMissionSequence={currentMissionSequence}
                    />
                );
            default:
                return <span>請選擇一個功能</span>;
        }
    }

    // 建立地點座標時點擊地圖的顯示狀態 (尚未確認 Mark 狀態)
    handleMapClick = (pose) => {
        this.setState({ selectedPose: pose });
    };

    // 確認地點座標後加入綠點 (給 WaypointAdd 用)
    handleConfirmWaypoint = (wp) => {
        this.setState(prev => ({
            confirmedWaypoints: [...prev.confirmedWaypoints, wp],
            selectedPose: null, // 清掉紅色
        }));
    };

    // 從 server 取回所有地點座標後存回 confirmedWaypoints (給 WaypointEdit 用)
    setConfirmedWaypoints = (waypoints) => {
        this.setState({
            confirmedWaypoints: waypoints,
            selectedPose: null,
        });
    };

    // 清空 waypoint 所有暫存資料
    clearWaypointState = () => {
        this.setState({
            confirmedWaypoints: [],
            selectedPose: null,
        });
    };

    // 任務排程 call API 取得指定地點座標文件內的資料
    handleLoadScheduleWaypoint = async (fileName) => {
        try {
            const { data, message } = await scheduleApi.getWaypointFileDetail(fileName);

            this.setState({
                scheduleWaypointData: data,
            });

            // 存 fileName-切換頁面時重新取回
            sessionStorage.setItem("schedule_retrieve_file", fileName);

            this.addToast(message, "success");

        } catch (err) {
            console.error(err);
            this.addToast(err.message, "error");
        }
    };

    // 清空任務排程的 waypoint 資料
    clearScheduleWaypointData = () => {
        sessionStorage.removeItem("schedule_active_file");

        this.setState({
            scheduleWaypointData: null,
            createTaskMode: null,
            allScheduleTasks: [],
        });
    };

    // 設定 createTaskMode
    setCreateTaskMode = (mode) => {
        this.setState({
            createTaskMode: mode,
        });
    };

    // 建立任務到 allScheduleTasks 中存放
    addScheduleTask = (task) => {
        this.setState(prev => ({
            allScheduleTasks: [...prev.allScheduleTasks, task]
        }));
    };

    // 使用拖曳的方式重新排序所有的任務排程
    reorderScheduleTasks = (oldIndex, newIndex) => {
        this.setState(prev => {
            const newTasks = [...prev.allScheduleTasks];
            const [movedItem] = newTasks.splice(oldIndex, 1);
            newTasks.splice(newIndex, 0, movedItem);
            return { allScheduleTasks: newTasks };
        });
    };

    // 刪除一個任務
    deleteScheduleTask = (index) => {
        this.setState(prev => ({
            allScheduleTasks: prev.allScheduleTasks.filter((_, i) => i !== index)
        }));
    };

    // 呼叫 API 儲存所有任務排程
    handleSubmitAllSchedules = async (fileName) => {
        try {
            const { allScheduleTasks, scheduleWaypointData } = this.state;

            if (allScheduleTasks.length === 0) {
                this.addToast("尚未新增任何任務", "warning");
                return;
            }

            // 取得目前使用的 waypoint 檔案名稱
            const retrieveFile = sessionStorage.getItem("schedule_retrieve_file");

            if (!retrieveFile) {
                this.addToast("尚未選擇座標地點文件", "warning");
                return;
            }

            // waypoint_source 需要補 .yaml
            const waypointSource = retrieveFile.endsWith(".yaml")
                ? retrieveFile
                : `${retrieveFile}.yaml`;

            // 產生 step
            const sequence = allScheduleTasks.map((task, index) => ({
                step: index + 1,
                ...task
            }));

            const payload = {
                mission_name: fileName,
                map_name: scheduleWaypointData?.map_name,
                frame_id: scheduleWaypointData?.frame_id,
                waypoint_source: waypointSource,
                sequence
            };

            const res = await scheduleApi.saveAllSchedules(payload);

            this.clearScheduleWaypointData()
            this.addToast(res.message, "success");

            // 重新呼叫取得新的任務列表
            await this.refreshExecuteList();

        } catch (err) {
            this.addToast(err.message, "error");
        }
    };

    // 開啟執行任務的面板時，先啟動 ROS Launch File 和 Action Server
    handleROSLaunchFile = async (fileName) => {
        try {

            const res = await executeApi.handleROSLaunchFile(fileName);

            this.setState({
                currentMode: "execute",
                isMapActive: true,
                currentMissionSequence: res.mission.sequence,
            });

            this.addToast(res.message, "success");

        } catch (err) {
            this.addToast(err.message, "error");
        }
    };

    // 關閉執行任務的面板時，也關閉 ROS Launch File 和 Action Server
    cancelROSLaunch = async () => {
        try {
            const res = await executeApi.cancelROSLaunch();

            this.setState({
                currentMode: "idle",
                isMapActive: false,
            });

            this.addToast(res.message, "success");

            return res;
        } catch (err) {
            this.addToast(err.message, "error");
        }
    };

    // 開始執行任務排程
    startMission = async (isCycleMode) => {
        try {
            const missionFileName = sessionStorage.getItem("execute_file");

            if (!missionFileName) {
                this.addToast("尚未選擇執行的任務文件", "warning");
                return;
            }

            const res = await executeApi.startMission(missionFileName, isCycleMode);

            this.addToast(res.message, "success");
        } catch (err) {
            this.addToast(err.message, "error");
        }
    };

    // 暫停目前任務的步驟
    stopMission = async () => {
        try {
            const res = await executeApi.stopMission();

            this.addToast(res.message, "success");
        } catch (err) {
            this.addToast(err.message, "error");
        }
    };

    // 取消所有任務排程
    canclMission = async () => {
        try {
            const res = await executeApi.canclMission();

            this.addToast(res.message, "success");
        } catch (err) {
            this.addToast(err.message, "error");
        }
    };

    // 刪除指定任務排程的文件
    deleteMissionFile = async (missionFile) => {
        try {
            const res = await executeApi.deleteMissionFile(missionFile);

            this.addToast(res.message, "success");

            // // 重新呼叫取得新的任務列表
            await this.refreshExecuteList();
        } catch (err) {
            this.addToast(err.message, "error");
        }
    };

    // 新增-[地點座標] 時重新呼叫API取得新的數據
    refreshWaypointList = async () => {
        try {
            const list = await scheduleApi.getAllWaypointList();

            this.setState({
                waypointFilesForSchedule: Array.isArray(list) ? list : []
            });

        } catch (err) {
            console.error("重新整理 waypoint 列表失敗", err);
        }
    };

    // 新增/刪除-[任務排程] 時重新呼叫API取得新的數據
    refreshExecuteList = async () => {
        try {
            const list = await executeApi.getAllScheduleList();

            this.setState({
                scheduleFilesForExecute: Array.isArray(list) ? list : []
            });
        } catch (err) {
            console.error("重新整理任務列表失敗", err);
        }
    };


    render() {
        return (
            <div className="pt-3">
                <ToastContainer toasts={this.state.toasts} />

                <div className="task-section-header main-font">
                    {/* 左邊 */}
                    <div className="main-border task-left-container">

                        <div className="task-left-box">
                            {/* 左上：選項區 */}
                            <div className="task-left-top">
                                {["create", "schedule", "execute"].map(p => (
                                    <span
                                        key={p}
                                        className={`task-option ${this.state.isLocked ? "disabled" : ""}`}
                                        onClick={() => this.handleSwitchPanel(p)}
                                    >
                                        {p === "create" ? "座標地點" : p === "schedule" ? "任務排程" : "執行任務"}
                                    </span>
                                ))}
                            </div>

                            {/* 左下：回傳顯示資訊 */}
                            <div className="second-border task-left-bottom">
                                {this.renderLeftBottom()}
                            </div>

                        </div>
                    </div>

                    {/* 右邊 */}
                    <div className="main-border task-right-container">
                        {this.state.activePanel === "schedule" ? (

                            // 任務排程專用選項/顯示元件
                            <ScheduleWorkspace
                                addToast={this.addToast}
                                waypointData={this.state.scheduleWaypointData}
                                createTaskMode={this.state.createTaskMode}
                                taskTypeOptions={this.state.taskTypeOptions}
                                allScheduleTasks={this.state.allScheduleTasks}
                                addScheduleTask={this.addScheduleTask}
                                reorderScheduleTasks={this.reorderScheduleTasks}
                                deleteScheduleTask={this.deleteScheduleTask}
                            />

                        ) : (
                            <div className="task-right-box">
                                {/* 右上：影像 */}
                                <div className="task-camera">
                                    <ExecuteRtspCamera />
                                </div>

                                {/* 右下：地圖 */}
                                <div className="task-map">
                                    <div style={{ display: this.state.activePanel === "execute" ? "block" : "none" }}>
                                        <ExecuteMap
                                            ref={this.mapRef}
                                            active={this.state.isMapActive}
                                        />
                                    </div>

                                    <div style={{ display: this.state.activePanel !== "execute" ? "block" : "none" }}>
                                        <WaypointMap
                                            ref={this.mapRef}
                                            active={this.state.isMapActive}
                                            selectedPose={this.state.selectedPose}
                                            confirmedWaypoints={this.state.confirmedWaypoints}
                                            onMapClick={this.handleMapClick}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        );
    }
}

export default Task;
