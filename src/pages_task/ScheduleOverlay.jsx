import ScheduleAdd from "./ScheduleAdd";
import ScheduleEdit from "./ScheduleEdit";


const ScheduleOverlay = ({
    mode, onClose, addToast,
    taskTypeOptions, setCreateTaskMode, onSubmitAllSchedules,
}) => {

    return (
        <div className="schedule-overlay">
            <div className="schedule-overlay-panel">

                {mode === "新增" && (
                    <ScheduleAdd
                        onClose={onClose}
                        addToast={addToast}
                        taskTypeOptions={taskTypeOptions}
                        setCreateTaskMode={setCreateTaskMode}
                        onSubmitAllSchedules={onSubmitAllSchedules}
                    />
                )}

                {mode === "修改" && (
                    <ScheduleEdit
                        onClose={onClose}
                        addToast={addToast}
                    />
                )}

            </div>
        </div>
    );
};

export default ScheduleOverlay;
