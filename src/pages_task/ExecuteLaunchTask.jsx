import { useState } from "react";
import MissionStatus from "./MissionStatus";

const ExecuteLaunchTask = ({
    onClose, addToast,
    isRunningExecuteLocked, lockRunningExecute, unlockRunningExecute,
    startMission, stopMission, canclMission, currentMissionSequence,
}) => {

    const [showExecuteOverlay, setShowExecuteOverlay] = useState(false);
    const [isCycleMode, setIsCycleMode] = useState(null);

    // 關閉 ROS 系統
    const handleClose = () => {
        onClose?.();

        unlockRunningExecute?.();
        // 刪除執行狀態
        sessionStorage.removeItem("execute_RunningExecute");
    };

    const OpenExecuteOverlay = () => {
        setShowExecuteOverlay(true);
    };

    const CloseExecuteOverlay = () => {
        setShowExecuteOverlay(false);
        setIsCycleMode(null);
    };

    // 暫停當下任務步驟
    const stopExecute = async () => {
        try {
            // 通知父層呼叫 API
            await stopMission?.();

            unlockRunningExecute?.();

            // 刪除執行狀態
            sessionStorage.removeItem("execute_RunningExecute");
        } catch (error) {
            addToast?.("暫停失敗", "error");
        }
    };

    // 取消所有任務排程
    const cancelExecute = async () => {
        try {
            // 通知父層呼叫 API
            await canclMission?.();

            unlockRunningExecute?.();

            // 刪除執行狀態
            sessionStorage.removeItem("execute_RunningExecute");
        } catch (error) {
            addToast?.("取消失敗", "error");
        }
    };

    // 確定執行
    const ConfirmExecute = async () => {
        if (isCycleMode === null) {
            addToast?.("請選擇是否循環執行");
            return;
        }

        try {
            // 通知父層呼叫 API
            await startMission?.(isCycleMode);

            lockRunningExecute?.();
            CloseExecuteOverlay();

            // 將執行狀態存到 sessionStorage 切換頁時恢復用
            sessionStorage.setItem("execute_RunningExecute", "true");

        } catch (err) {
            addToast?.("執行失敗", "error");
        }
    };


    return (
        <div className="execute-launch-task">
            {/* Header */}
            <div className="execute-launch-header">
                <div className="execute-launch-box">
                    <div
                        className={`execute-btn launch-btn ${isRunningExecuteLocked ? "disabled-btn" : ""}`}
                        onClick={OpenExecuteOverlay}
                        disabled={isRunningExecuteLocked}
                    >
                        執行任務

                    </div>
                    <div
                        className="execute-btn stop-btn"
                        onClick={stopExecute}
                    >
                        停止任務
                    </div>
                    <div
                        className="execute-btn cancel-btn"
                        onClick={cancelExecute}
                    >

                        取消任務
                    </div>
                </div>

                <div className="execute-btn close-btn" onClick={handleClose}>
                    關閉系統
                    {/* 關閉 ROS 系統 */}
                </div>
            </div>

            {/* 顯示任務的 feedback 狀態內容 */}
            <MissionStatus
                currentMissionSequence={currentMissionSequence}
            />

            {/* 覆蓋層 */}
            {showExecuteOverlay && (
                <div className="execute-confirm-overlay">
                    <div className="execute-confirm-panel">
                        <div className="save-title">
                            是否要持續任務
                        </div>
                        <select
                            value={isCycleMode}
                            onChange={(e) => setIsCycleMode(e.target.value)}
                        >
                            <option >請選擇</option>
                            <option value="true">要</option>
                            <option value="false">不要</option>
                        </select>

                        <div className="save-actions">
                            <div
                                className="btn-confirm"
                                onClick={ConfirmExecute}
                            >
                                <span>確定執行</span>
                            </div>

                            <div
                                className="btn-cancel"
                                onClick={CloseExecuteOverlay}
                            >
                                <span>取消</span>
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default ExecuteLaunchTask;
