import ExecuteLaunchTask from "./ExecuteLaunchTask";
import ExecuteDeleteTask from "./ExecuteDeleteTask";

const ExecuteOverlay = ({
    mode, activeFile, onClose, addToast,
    isRunningExecuteLocked, lockRunningExecute, unlockRunningExecute,
    startMission, stopMission, canclMission, deleteMissionFile,
    currentMissionSequence,
}) => {

    return (
        <div className="execute-overlay">
            <div className="execute-overlay-panel">

                {mode === "啟用" && (
                    <ExecuteLaunchTask
                        onClose={onClose}
                        addToast={addToast}

                        isRunningExecuteLocked={isRunningExecuteLocked}
                        lockRunningExecute={lockRunningExecute}
                        unlockRunningExecute={unlockRunningExecute}
                        startMission={startMission}
                        stopMission={stopMission}
                        canclMission={canclMission}
                        currentMissionSequence={currentMissionSequence}
                    />
                )}

                {mode === "刪除" && (
                    <ExecuteDeleteTask
                        onClose={onClose}
                        addToast={addToast}
                        activeFile={activeFile}

                        deleteMissionFile={deleteMissionFile}
                    />
                )}

            </div>
        </div>
    );
};

export default ExecuteOverlay;
