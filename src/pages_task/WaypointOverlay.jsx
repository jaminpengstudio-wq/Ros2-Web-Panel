import WaypointAdd from "./WaypointAdd";
import WaypointEdit from "./WaypointEdit";

const WaypointOverlay = ({
    mapName, mode, onClose, addToast, selectedPose,
    onConfirmWaypoint, confirmedWaypoints, setConfirmedWaypoints, clearWaypointState,
    waypointFiles, refreshWaypointList,
}) => {
    return (
        <div className="map-overlay">
            <div className="overlay-panel">

                {mode === "新增" && (
                    <WaypointAdd
                        mapName={mapName}
                        onClose={onClose}
                        addToast={addToast}

                        selectedPose={selectedPose}
                        onConfirmWaypoint={onConfirmWaypoint}
                        confirmedWaypoints={confirmedWaypoints}
                        clearWaypointState={clearWaypointState}
                        refreshWaypointList={refreshWaypointList}
                    />
                )}

                {mode === "修改" && (
                    <WaypointEdit
                        mapName={mapName}
                        onClose={onClose}
                        addToast={addToast}

                        selectedPose={selectedPose}
                        confirmedWaypoints={confirmedWaypoints}
                        onConfirmWaypoint={onConfirmWaypoint}
                        setConfirmedWaypoints={setConfirmedWaypoints}
                        clearWaypointState={clearWaypointState}

                        waypointFiles={waypointFiles}
                        refreshWaypointList={refreshWaypointList}
                    />
                )}

            </div>
        </div>
    );
};

export default WaypointOverlay;
