const API_BASE = "https://ros_bot1_server.jampenglab.tw/bot1/api/v1";

const scheduleApi = {

    // 取得使用該地圖建立的所有座標地點文件名稱
    getAllWaypointList: async () => {

        const res = await fetch(`${API_BASE}/task/schedule/waypoint_list`, {
            method: "GET",
        });

        const data = await res.json();
        if (!res.ok || data.success === false) {
            throw new Error(data.message || "取得列表失敗");
        }

        return data.files ?? [];
    },

    // 取得指定地點座標文件的檔案內容
    getWaypointFileDetail: async (fileName) => {

        const res = await fetch(`${API_BASE}/task/schedule/waypoint_detail`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ fileName }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "取得地點資料失敗");
        }

        return data;
    },

    // 儲存所有任務排程
    saveAllSchedules: async (payload) => {
        const res = await fetch(`${API_BASE}/task/schedule/save_all`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.message);
        }

        return data;
    },


};

export default scheduleApi;
