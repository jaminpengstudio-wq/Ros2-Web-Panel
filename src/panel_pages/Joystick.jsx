import { useRef, useState, useEffect, useCallback } from "react";

const Joystick = ({ onMove, onStop }) => {
    const baseRef = useRef(null);
    const [size, setSize] = useState(0);

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
        if (!baseRef.current || size === 0) return;

        const rect = baseRef.current.getBoundingClientRect();
        const dx = e.clientX - (rect.left + radius);
        const dy = e.clientY - (rect.top + radius);
        const distance = Math.min(Math.sqrt(dx * dx + dy * dy), radius - stickRadius);

        const angle = Math.atan2(dy, dx);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        setStickPos({ x, y });
    }, [size, radius, stickRadius]);

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

    // 用 DOM 尺寸當「唯一尺寸來源」
    useEffect(() => {
        if (!baseRef.current) return;

        const updateSize = () => {
            const rect = baseRef.current.getBoundingClientRect();
            setSize(rect.width);
        };

        updateSize();

        // RWD / resize 時也會更新: 也就是 --btn-size 會從上層 teleoperation.css .tele-box 自動往下更動這裡
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);


    return (
        <div
            ref={baseRef}
            onPointerDown={handlePointerDown}
            className="joystick-base"
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
