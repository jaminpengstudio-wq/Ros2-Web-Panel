import { useState, useEffect, useRef } from "react";
import mqttService from "../scripts/MqttService";
import Config from "../scripts/config";

// V2 版本-任務執行時的狀態顯示
//   -啟用指定任務排程文件時，回傳該任務文件所有的步驟和內容
//   -執行後根據 Actnion Server 回傳的 feedback 顯示正在執行的任務步驟

const MissionStatus = ({
    currentMissionSequence,
}) => {
    const [missionStatus, setMissionStatus] = useState(null);

    const wrapperRef = useRef(null);
    const activeItemRef = useRef(null);

    useEffect(() => {
        mqttService.connect();
        mqttService.subscribe(Config.MISSION_STATUS_TOPIC, handleMissionStatus);

        return () => {
            mqttService.unsubscribe(Config.MISSION_STATUS_TOPIC, handleMissionStatus);
        };
    }, []);

    const handleMissionStatus = (payload) => {
        if (!payload?.data) return;
        setMissionStatus(payload.data);
    };

    // 當 step 改變時，自動 scroll
    useEffect(() => {
        // if (activeItemRef.current) {
        //     activeItemRef.current.scrollIntoView({
        //         behavior: "smooth",
        //         // block: "center",    // 讓正在執行的任務永遠移到畫面中央
        //         block: "nearest"    //只有在超出畫面才移動
        //     });
        // }

        if (!activeItemRef.current || !wrapperRef.current) return;

        const wrapper = wrapperRef.current;
        const active = activeItemRef.current;

        const wrapperRect = wrapper.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();

        const isBelow = activeRect.bottom > wrapperRect.bottom;
        const isAbove = activeRect.top < wrapperRect.top;

        if (isBelow || isAbove) {
            wrapper.scrollTo({
                // 讓 active item 永遠貼齊容器頂部
                // top: active.offsetTop,

                // 讓 active 在畫面上 1/3 處
                top: active.offsetTop - wrapper.clientHeight * 0.3,

                behavior: "smooth"
            });
        }

    }, [missionStatus?.step]);

    return (
        <div className="mission-sequence-wrapper" ref={wrapperRef}>
            <div className="feedback-content">
                {currentMissionSequence?.map(step => {
                    const isActive = missionStatus?.step === step.step;

                    return (
                        <div
                            key={step.step}
                            ref={isActive ? activeItemRef : null}
                            className={`mission-sequence-item ${isActive ? "active" : ""}`}
                        >
                            <div className="step-number">
                                Step {step.step}
                            </div>

                            <div className="step-type">
                                {step.type}
                            </div>

                            {step.target_name && (
                                <div className="step-target">
                                    {step.target_name}
                                </div>
                            )}

                            {step.duration && (
                                <div>等待 {step.duration} 秒</div>
                            )}

                            {step.angle_deg && (
                                <div>旋轉 {step.angle_deg}°</div>
                            )}
                        </div>
                    );
                })}
            </div>

        </div>
    );
};

export default MissionStatus;
