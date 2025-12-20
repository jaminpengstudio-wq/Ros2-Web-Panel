const API_BASE = "https://ros_bot1_server.jampenglab.tw/bot1/api/v1";

// 取得 AWS KVS WebRTC 用的 temporary credentials
export const getAwsKvsCredentials = async () => {
    const res = await fetch(`${API_BASE}/aws/kvs/credentials`, {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error("取得 AWS credentials 失敗");
    }

    const data = await res.json();

    return {
        accessKeyId: data.accessKeyId,
        secretAccessKey: data.secretAccessKey,
        sessionToken: data.sessionToken,
        region: data.region,
        expiresAt: data.expiresAt,
    };
};
