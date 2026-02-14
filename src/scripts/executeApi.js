const API_BASE = "https://ros_bot1_server.jampenglab.tw/bot1/api/v1";

const executeApi = {

    // 取得所有任務排程文件的名稱
    getAllScheduleList: async () => {
        const res = await fetch(`${API_BASE}/task/execute/schedule_list`, {
            method: "GET",
        });

        const data = await res.json();
        if (!res.ok || data.success === false) {
            throw new Error(data.message || "取得列表失敗");
        }

        return data.files ?? [];
    },

    // 開啟執行任務的面板時，先啟動 ROS Launch File 和 Action Server
    handleROSLaunchFile: async (fileName) => {
        const res = await fetch(`${API_BASE}/task/execute/ros_launch`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ fileName }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "啟動 ROS Launch File 失敗");
        }

        return data;
    },

    // 關閉執行任務的面板時，也關閉 ROS Launch File 和 Action Server
    cancelROSLaunch: async () => {
        const res = await fetch(`${API_BASE}/task/execute/cancel_ros`, {
            method: "POST",
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "關閉 ROS Launch File 失敗");
        }

        return data;
    },

    // 開始執行任務排程
    startMission: async (missionFileName, isCycleMode) => {
        if (!missionFileName) {
            throw new Error("缺少任務名稱");
        }

        const res = await fetch(`${API_BASE}/task/execute/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ missionFileName, isCycleMode }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "執行任務失敗");
        }

        return data;
    },

    // 暫停目前任務的步驟
    stopMission: async () => {
        const res = await fetch(`${API_BASE}/task/execute/stop`, {
            method: "POST",
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "暫停任務失敗");
        }

        return data;
    },

    // 取消所有任務排程
    canclMission: async () => {
        const res = await fetch(`${API_BASE}/task/execute/cancel`, {
            method: "POST",
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "取消任務失敗");
        }

        return data;
    },

    // 刪除指定任務排程的文件
    deleteMissionFile: async (missionFile) => {
        if (!missionFile) {
            throw new Error("缺少文件名稱");
        }

        const res = await fetch(`${API_BASE}/task/execute/delete_Mission_file/${encodeURIComponent(missionFile)}`, {
            method: "DELETE",
        });

        const data = await res.json();
        if (!res.ok || data.success === false) {
            throw new Error(data.message || "刪除失敗");
        }

        return data;
    },

};

export default executeApi;
