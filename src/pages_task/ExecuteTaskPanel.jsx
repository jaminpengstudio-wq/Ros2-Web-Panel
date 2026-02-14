import { useEffect, useState } from "react";
// import executeApi from "../scripts/executeApi";
import ExecuteOverlay from "./ExecuteOverlay";

const ExecuteTaskPanel = ({
    addToast, lockPanel, unlockPanel, resume, onResumeConsumed,
    scheduleFilesForExecute, handleROSLaunchFile, cancelROSLaunch,
    isRunningExecuteLocked, lockRunningExecute, unlockRunningExecute,
    startMission, stopMission, canclMission, deleteMissionFile,
    currentMissionSequence,
}) => {

    const [actionMode, setActionMode] = useState(null);  // 執行 | 刪除
    const [activeFile, setActiveFile] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!resume) return;

        const savedMode = sessionStorage.getItem("execute_mode");
        const savedFile = sessionStorage.getItem("execute_file");
        const isActive = sessionStorage.getItem("execute_panel_active");

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
        sessionStorage.setItem("execute_mode", mode);
        sessionStorage.setItem("execute_file", fileName);
        sessionStorage.setItem("execute_panel_active", "true");

        // 在啟動後，限制這個任務，不能被選擇任務排程、執行任務
        lockPanel?.();
    };

    const closeOverlay = () => {
        // 關閉執行任務的面板時，也關閉 ROS Launch File 和 Action Server
        cancelROSLaunch?.();

        setActionMode(null);
        setActiveFile(null);

        sessionStorage.removeItem("execute_mode");
        sessionStorage.removeItem("execute_file");
        sessionStorage.removeItem("execute_panel_active");

        unlockPanel?.();
    };

    // 開啟執行任務排程面板
    const executeLaunchTask = async (fileName) => {
        try {
            setLoading(true);

            // 開啟執行任務的面板時，先啟動 ROS Launch File 和 Action Server
            await handleROSLaunchFile?.(fileName);

            // API 成功後才進入新增模式
            openOverlay(fileName, "啟用");
        } catch (err) {
            addToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    // 開啟刪除任務排程面板
    const executeDeleteTask = async (fileName) => {
        try {
            setLoading(true);

            // API 成功後才進入新增模式
            openOverlay(fileName, "刪除");
        } catch (err) {
            addToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="execute-task-panel">

            <div className="execute-header">
                <div className="execute-header-item">
                    <span className="label">目前使用的任務：</span>
                    <span className="value">{activeFile ?? "未選擇"}</span>
                </div>
            </div>

            <div className="execute-list-wrapper">

                <div className="execute-list">
                    {scheduleFilesForExecute.length === 0 && (
                        <div className="execute-empty">
                            目前沒有任何任務排程
                        </div>
                    )}

                    {scheduleFilesForExecute.map(file => (
                        <div key={file} className="execute-row">
                            <span className="execute-file-name">{file}</span>

                            <div className="execute-actions">
                                <button
                                    className="execute-task-btn"
                                    disabled={loading}
                                    onClick={() => executeLaunchTask(file)}
                                >
                                    {loading ? "啟動中..." : "啟用"}
                                </button>
                                <button
                                    className="execute-delete-btn"
                                    onClick={() => executeDeleteTask(file)}
                                    disabled={loading}
                                >
                                    刪除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Overlay */}
                {actionMode && (
                    <ExecuteOverlay
                        mode={actionMode}
                        activeFile={activeFile}
                        onClose={closeOverlay}
                        addToast={addToast}

                        isRunningExecuteLocked={isRunningExecuteLocked}
                        lockRunningExecute={lockRunningExecute}
                        unlockRunningExecute={unlockRunningExecute}

                        startMission={startMission}
                        stopMission={stopMission}
                        canclMission={canclMission}

                        deleteMissionFile={deleteMissionFile}
                        currentMissionSequence={currentMissionSequence}
                    />
                )}

            </div>
        </div>
    );
};

export default ExecuteTaskPanel;

