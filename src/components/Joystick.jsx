import { useRef, useState, useEffect, useCallback } from "react";

const Joystick = ({ size = 120, onMove, onStop }) => {
    const baseRef = useRef(null);
    const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const radius = size / 2;
    const stickRadius = size * 0.25;

    // 🟢 按下搖桿
    const handlePointerDown = (e) => {
        setIsDragging(true);
        baseRef.current.setPointerCapture(e.pointerId);
        moveStick(e);
    };

    // 🔵 拖動搖桿
    const moveStick = useCallback((e) => {
        if (!baseRef.current) return;
        const rect = baseRef.current.getBoundingClientRect();
        const dx = e.clientX - (rect.left + radius);
        const dy = e.clientY - (rect.top + radius);
        const distance = Math.min(Math.sqrt(dx * dx + dy * dy), radius - stickRadius);

        const angle = Math.atan2(dy, dx);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        setStickPos({ x, y });
    }, [radius, stickRadius]);

    // 🔴 放開搖桿
    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
        setStickPos({ x: 0, y: 0 });
        if (onStop) onStop();
    }, [onStop]);

    // 持續更新速度
    useEffect(() => {
        let animationFrame;
        const update = () => {
            if (isDragging && onMove) {
                const normX = stickPos.x / (radius - stickRadius);
                const normY = -stickPos.y / (radius - stickRadius);
                onMove({ x: normX, y: -normY });  // 上/下/左/右 方向控制校正
            }
            animationFrame = requestAnimationFrame(update);
        };
        update();
        return () => cancelAnimationFrame(animationFrame);
    }, [isDragging, stickPos, onMove, radius, stickRadius]);

    // 偵測 pointer 事件
    useEffect(() => {
        const el = baseRef.current;
        if (!el) return;

        const handleMove = (e) => { if (isDragging) moveStick(e); };
        el.addEventListener("pointermove", handleMove);
        el.addEventListener("pointerup", handlePointerUp);
        el.addEventListener("pointerleave", handlePointerUp);

        return () => {
            el.removeEventListener("pointermove", handleMove);
            el.removeEventListener("pointerup", handlePointerUp);
            el.removeEventListener("pointerleave", handlePointerUp);
        };
    }, [isDragging, moveStick, handlePointerUp]);

    return (
        <div
            ref={baseRef}
            onPointerDown={handlePointerDown}
            style={{
                cursor: "pointer",
                width: size,
                height: size,
                borderRadius: "50%",
                background: "radial-gradient(circle at 30% 30%, #2a2a3a, #1b1b26 80%)",
                border: "1.5px solid #5900ff",
                position: "relative",
                touchAction: "none",
                boxShadow: `
                    inset 6px 5px 12px rgba(16, 0, 47, 0.93),
                    inset -6px -5px 11px rgba(89, 0, 255, 0.5),
                    0 0 10px rgba(89, 0, 255, 0.6)
                    `,
            }}
        >
            <div
                style={{
                    width: stickRadius * 2,
                    height: stickRadius * 2,
                    borderRadius: "50%",
                    position: "absolute",
                    left: radius - stickRadius + stickPos.x,
                    top: radius - stickRadius + stickPos.y,
                    transition: isDragging ? "none" : "0.2s ease-out",
                    background: "radial-gradient(circle at 30% 30%, #00ffb0, #009f70 90%)",
                    boxShadow: "0 4px 11px rgba(0,255,159,0.8), inset 0 2px 6px rgba(255,255,255,0.4)",
                }}
            ></div>
        </div>
    );
};

export default Joystick;
