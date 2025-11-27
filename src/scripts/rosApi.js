
const API_BASE = "https://ros_bot1_server.jampenglab.tw/bot1/api/v1";

// 取得 ROS 狀態
export const getStatus = async () => {
    const url = `${API_BASE}/ros/status/`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("讀取 ROS 狀態失敗");
        return await response.json();
    } catch (err) {
        console.error("❌ 無法取得 ROS 狀態:", err);
        return { running: false, mode: "idle", mapName: null };
    }
};

// 啟動建圖或導航模式
export const startMode = async (mode, mapName = null) => {
    const url = `${API_BASE}/ros/start_mode/`;
    try {
        const payload = { mode };

        // 只有導航模式才加入 mapName
        if (mapName) {
            payload.mapName = mapName;
        }

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "伺服器回應失敗");
        }

        return await response.text();
    } catch (err) {
        console.error(`❌ 啟動 ${mode} 模式失敗:`, err);
        throw err;
    }
};

// 停止 ROS 運作
export const stopMode = async () => {
    const url = `${API_BASE}/ros/stop_mode/`;
    try {
        const response = await fetch(url, {
            method: "POST",
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "伺服器回應失敗");
        }

        return await response.text();
    } catch (err) {
        console.error("❌ 停止 ROS 模式失敗:", err);
        throw err;
    }
};

// 取得所有地圖名稱列表
export const getMaps = async () => {
    const url = `${API_BASE}/maps/list_maps/`;
    try {
        const response = await fetch(url, {
            method: "GET",
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "伺服器回應失敗");
        }

        return await response.json(); // 回傳地圖名稱陣列
    } catch (err) {
        console.error("❌ 取得地圖列表失敗:", err);
        throw err;
    }
};

// 儲存地圖
export const saveMap = async (folderName) => {
    const url = `${API_BASE}/maps/save_map/`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderName })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "伺服器回應失敗");
        }

        return await response.text();
    } catch (err) {
        console.error("❌ 儲存地圖失敗:", err);
        throw err;
    }
};

const rosApi = { getStatus, startMode, stopMode, getMaps, saveMap };
export default rosApi;
