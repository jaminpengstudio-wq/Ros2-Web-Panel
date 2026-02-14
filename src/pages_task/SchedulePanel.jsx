import { useEffect, useState } from "react";
// import scheduleApi from "../scripts/scheduleApi";
import ScheduleOverlay from "./ScheduleOverlay";

const SchedulePanel = ({
    addToast, lockPanel, unlockPanel, resume, onResumeConsumed,
    waypointFilesForSchedule, onLoadWaypointFile, onClearWaypointData,
    taskTypeOptions, setCreateTaskMode, onSubmitAllSchedules
}) => {

    const [actionMode, setActionMode] = useState(null);  // 新增 | 修改
    const [activeFile, setActiveFile] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!resume) return;

        const savedMode = sessionStorage.getItem("schedule_mode");
        const savedFile = sessionStorage.getItem("schedule_file");
        const isActive = sessionStorage.getItem("schedule_panel_active");

        if (savedMode && savedFile && isActive) {
            setActionMode(savedMode);
            setActiveFile(savedFile);
            lockPanel?.();
        }

        onResumeConsumed?.(); // 告訴父層 Task 已處理完 resume

    }, [resume, lockPanel, onResumeConsumed]);


    const openOverlay = (fileName, mode) => {
        setActiveFile(fileName);
        setActionMode(mode);

        // 存到 sessionStorage
        sessionStorage.setItem("schedule_mode", mode);
        sessionStorage.setItem("schedule_file", fileName);
        sessionStorage.setItem("schedule_panel_active", "true");

        // 在啟動後，限制這個任務，不能被選擇任務排程、執行任務
        lockPanel?.();
    };

    const closeOverlay = () => {
        setActionMode(null);
        setActiveFile(null);

        sessionStorage.removeItem("schedule_mode");
        sessionStorage.removeItem("schedule_file");
        sessionStorage.removeItem("schedule_panel_active");

        // 清空父層儲存的 [指定地點文件內容]
        onClearWaypointData?.();

        unlockPanel?.();
    };

    // 新增任務排程文件
    const handleScheduleAdd = async (fileName) => {
        try {
            setLoading(true);

            // 從父層 task call API 去 server 取資料
            await onLoadWaypointFile?.(fileName);

            // API 成功後才進入新增模式
            openOverlay(fileName, "新增");
        } catch (err) {
            addToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    // 修改任務排程文件
    const handleScheduleEdit = async (fileName) => {
        try {
            setLoading(true);
            // const result = await scheduleApi.API(fileName);

            openOverlay(fileName, "修改");
            // addToast?.(result.message, "success");

        } catch (err) {
            addToast?.(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="schedule-panel">
            {/* 頂部狀態列 */}
            <div className="schedule-header">
                <div className="schedule-header-item">
                    <span className="label">使用的地點文件：</span>
                    <span className="value">{activeFile ?? "未選擇"}</span>
                </div>

                <div className="schedule-header-item">
                    <span className="label">編輯模式：</span>
                    <span className="value">{actionMode ?? "檢視"}</span>
                </div>
            </div>

            <div className="schedule-list-wrapper">

                {/* 文件列表 */}
                <div className="schedule-list">

                    {waypointFilesForSchedule.length === 0 && (
                        <div className="schedule-empty">
                            目前沒有任何座標文件
                        </div>
                    )}

                    {waypointFilesForSchedule.map(file => (
                        <div key={file} className="schedule-row">
                            <span className="schedule-file-name">{file}</span>

                            <div className="schedule-actions">
                                <button
                                    className="btn add"
                                    disabled={loading}
                                    onClick={() => handleScheduleAdd(file)}
                                >
                                    {loading ? "啟動中..." : "新增"}
                                </button>
                                <button
                                    className="btn edit"
                                    style={{ display: "none" }}  // 暫時不使用
                                    disabled={loading}
                                    onClick={() => handleScheduleEdit(file)}
                                >
                                    修改
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Overlay */}
                {actionMode && (
                    <ScheduleOverlay
                        mode={actionMode}
                        onClose={closeOverlay}
                        addToast={addToast}
                        taskTypeOptions={taskTypeOptions}
                        setCreateTaskMode={setCreateTaskMode}
                        onSubmitAllSchedules={onSubmitAllSchedules}
                    />
                )}

            </div>
        </div>
    );
};

export default SchedulePanel;
