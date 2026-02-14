import { useEffect, useState } from "react";
import waypointApi from "../scripts/waypointApi";
import WaypointOverlay from "./WaypointOverlay";

const WAYPOINT_FILES_KEY = "waypoint_files";

const WaypointPanel = ({
    maps, addToast, lockPanel, unlockPanel,
    mapRef, onMapStart, onMapStop, resume, onResumeConsumed,
    selectedPose, onConfirmWaypoint,
    confirmedWaypoints, setConfirmedWaypoints, clearWaypointState,
    refreshWaypointList,
}) => {
    const [activeMap, setActiveMap] = useState(null);
    const [actionMode, setActionMode] = useState(null);     // 新增 | 修改
    const [loading, setLoading] = useState(false);
    const [waypointFiles, setWaypointFiles] = useState([]); // 所有座標地點文件列表

    useEffect(() => {
        if (!resume || !maps.length) return;

        const savedMap = sessionStorage.getItem("waypoint_map");
        const savedMode = sessionStorage.getItem("waypoint_mode");
        const savedFiles = sessionStorage.getItem(WAYPOINT_FILES_KEY);

        const mapToResume = savedMap ?? maps[0];
        const modeToResume = savedMode ?? "新增";

        setActiveMap(mapToResume);
        setActionMode(modeToResume);

        // 恢復所有座標地點文件列表
        if (savedFiles) {
            setWaypointFiles(JSON.parse(savedFiles));
        }

        lockPanel?.();
        onMapStart?.();
        onResumeConsumed?.(); // 告訴父層 Task 已處理完 resume

    }, [resume, maps, lockPanel, onMapStart, onResumeConsumed]);

    if (!maps.length) {
        return <div className="create-waypoint-empty">沒有可用的地圖</div>;
    }

    const openOverlay = (map, mode) => {
        setActiveMap(map);
        setActionMode(mode);

        // 存到 sessionStorage
        sessionStorage.setItem("waypoint_map", map);
        sessionStorage.setItem("waypoint_mode", mode);
    };

    const closeOverlay = () => {
        setActiveMap(null);
        setActionMode(null);

        sessionStorage.removeItem("waypoint_map");
        sessionStorage.removeItem("waypoint_mode");

        // 在關閉 ROS 後，不限制可重新選建立座標地點、任務排程、執行任務
        unlockPanel?.();
        onMapStop?.();    // 告訴父層 task 結束建立座標，要關閉地圖
    };

    // 呼叫 API 啟動 waypoint 編輯地圖 - 新增狀態
    const handleStartAdd = async (mapName) => {
        try {
            setLoading(true);
            const result = await waypointApi.startMap(mapName);

            // 在啟動 ROS 後，限制這個任務，不能被選擇任務排程、執行任務
            lockPanel?.();

            // API 成功後才進入新增模式
            openOverlay(mapName, "新增");
            addToast?.(result.message, "success");

            // 啟動 ROS 後
            onMapStart?.();                    // 告訴父層 Task 啟動了地圖
            mapRef?.current?.requestMap?.();   // 主動呼叫地圖
        } catch (err) {
            addToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    // 呼叫 API 啟動地圖 & 取得座標地點文件列表 - 修改狀態
    const handleStartEdit = async (mapName) => {
        try {
            setLoading(true);
            const result = await waypointApi.startMap(mapName);

            // 取得 waypoint 檔案列表
            const listResult = await waypointApi.getWaypointList(mapName);
            const files = listResult.files || [];
            setWaypointFiles(files);

            // 存到 sessionStorage (切換分頁時須取回的資料位置)
            sessionStorage.setItem(WAYPOINT_FILES_KEY, JSON.stringify(files));

            lockPanel?.();

            openOverlay(mapName, "修改");
            addToast?.(result.message, "success");
            addToast?.(listResult.message, "success");
            onMapStart?.();
            mapRef?.current?.requestMap?.();
        } catch (err) {
            addToast?.(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-waypoint-panel">

            <div className="waypoint-header">
                <div className="waypoint-header-item">
                    <span className="label">使用的地圖名稱：</span>
                    <span className="value">{activeMap ?? "未選擇"}</span>
                </div>

                <div className="waypoint-header-item">
                    <span className="label">編輯模式：</span>
                    <span className="value">{actionMode ?? "檢視"}</span>
                </div>
            </div>

            <div className="map-list-wrapper">
                {/* 地圖列表 */}
                <div className="map-list">
                    {maps.map(map => (
                        <div key={map} className="map-row">
                            <span className="map-name">{map}</span>

                            <div className="map-actions">
                                <button
                                    className="btn add"
                                    disabled={loading}
                                    onClick={() => handleStartAdd(map)}
                                >
                                    {loading ? "啟動中..." : "新增"}
                                </button>
                                <button
                                    className="btn edit"
                                    disabled={loading}
                                    onClick={() => handleStartEdit(map)}
                                >
                                    修改
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Overlay */}
                {actionMode && (
                    <WaypointOverlay
                        mapName={activeMap}
                        mode={actionMode}
                        onClose={closeOverlay}
                        addToast={addToast}

                        selectedPose={selectedPose}
                        onConfirmWaypoint={onConfirmWaypoint}
                        confirmedWaypoints={confirmedWaypoints}
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

export default WaypointPanel;
