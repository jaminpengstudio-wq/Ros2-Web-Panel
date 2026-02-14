// scripts/ExecuteMapRenderer.js

export class ExecuteMapRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // 暫存原始地圖像素
        this.mapCanvas = document.createElement("canvas");
        this.mapCtx = this.mapCanvas.getContext("2d");

        this.mapInfo = null;
        this.robotPose = null;
        this.plan = null;
        this.showPlan = true;

        // 動畫平滑機器移動狀態
        this.currentPose = null;   // 畫面正在顯示的位置
        this.targetPose = null;    // 最新 amcl 位置
        this.animationId = null;
        this.lastUpdateTime = 0;
        this.interpolateDuration = 300; // 毫秒 (控制移動順滑程度)

        // ===== 互動狀態 =====
        this.scale = 1.0;
        this.rotation = 0; // radians (保留，但右鍵不再控制地圖旋轉)
        this.panX = 0;     // 平移（右鍵控制地圖平移）
        this.panY = 0;

        // ===== 滑鼠狀態 =====
        this.isRightDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // ===== 右鍵雙擊判斷 =====
        this.lastRightClickTime = 0;
        this.RIGHT_DOUBLE_CLICK_MS = 300;

        // ===== 綁定事件 =====
        this.onWheel = this.onWheel.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);

        canvas.addEventListener("wheel", this.onWheel, { passive: false });
        canvas.addEventListener("mousedown", this.onMouseDown);
        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("mouseup", this.onMouseUp);
        canvas.addEventListener("contextmenu", this.onContextMenu);
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.canvas.removeEventListener("wheel", this.onWheel);
        this.canvas.removeEventListener("mousedown", this.onMouseDown);
        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("mouseup", this.onMouseUp);
        this.canvas.removeEventListener("contextmenu", this.onContextMenu);

        this.mapInfo = null;
    }

    setRobotPose(pose) {
        const now = performance.now();

        if (!this.currentPose) {
            this.currentPose = JSON.parse(JSON.stringify(pose));
        }

        this.startPose = JSON.parse(JSON.stringify(this.currentPose));
        this.targetPose = pose;

        this.lastUpdateTime = now;

        if (!this.animationId) {
            this.animate();
        }
    }

    // 設定路徑規劃
    setPlan(plan) {
        this.plan = plan;
        this.draw();
    }

    // 控制是否顯示路徑規劃
    setPlanVisibility(visible) {
        this.showPlan = visible;
        this.draw();
    }

    setMap(mapInfo) {
        if (!mapInfo) return;

        this.mapInfo = mapInfo;

        const { width, height } = mapInfo.info;
        this.mapCanvas.width = width;
        this.mapCanvas.height = height;

        // 建立原始 ImageData
        const img = this.mapCtx.createImageData(width, height);
        const pixels = img.data;
        const data = mapInfo.data;

        for (let i = 0; i < data.length; i++) {
            const value = data[i];
            const x = i % width;
            const y = height - Math.floor(i / width) - 1;
            const idx = (y * width + x) * 4;

            let color;
            if (value === -1) color = 205;
            else color = 255 - Math.round((value / 100) * 255);

            pixels[idx] = color;
            pixels[idx + 1] = color;
            pixels[idx + 2] = color;
            pixels[idx + 3] = 255;
        }

        this.mapCtx.putImageData(img, 0, 0);
        this.draw();
    }

    // 機器平滑移動的動畫函式
    animate() {
        const now = performance.now();

        if (this.startPose && this.targetPose) {

            const t = (now - this.lastUpdateTime) / this.interpolateDuration;
            const progress = Math.min(t, 1.0);

            const sp = this.startPose.pose.position;
            const tp = this.targetPose.pose.position;

            const cp = this.currentPose.pose.position;

            cp.x = sp.x + (tp.x - sp.x) * progress;
            cp.y = sp.y + (tp.y - sp.y) * progress;

            // ===== 角度插值 =====
            const sy = this.getYaw(this.startPose.pose.orientation);
            const ty = this.getYaw(this.targetPose.pose.orientation);

            let diff = ty - sy;
            if (diff > Math.PI) diff -= 2 * Math.PI;
            if (diff < -Math.PI) diff += 2 * Math.PI;

            const newYaw = sy + diff * progress;
            this.setYaw(this.currentPose.pose.orientation, newYaw);
        }

        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    getYaw(q) {
        return Math.atan2(
            2 * (q.w * q.z + q.x * q.y),
            1 - 2 * (q.y * q.y + q.z * q.z)
        );
    }

    setYaw(q, yaw) {
        q.x = 0;
        q.y = 0;
        q.z = Math.sin(yaw / 2);
        q.w = Math.cos(yaw / 2);
    }

    // ===== 滑鼠事件 =====
    onContextMenu(e) {
        e.preventDefault();
    }

    onMouseDown(e) {
        if (e.button !== 2) return;

        const now = performance.now();
        const dt = now - this.lastRightClickTime;
        this.lastRightClickTime = now;

        // 右鍵雙擊 → reset
        if (dt < this.RIGHT_DOUBLE_CLICK_MS) {
            this.resetView();
            return;
        }

        // 右鍵拖曳 → 平移地圖
        this.isRightDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    }

    onMouseMove(e) {
        if (!this.isRightDragging) return;

        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        // 依照目前縮放調整平移靈敏度
        this.panX += dx / this.scale;
        this.panY += dy / this.scale;

        this.draw();
    }

    onMouseUp() {
        this.isRightDragging = false;
    }

    onWheel(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        this.scale *= zoomFactor;

        // 限制縮放範圍
        this.scale = Math.min(Math.max(this.scale, 0.2), 5.0);

        this.draw();
    }

    // ===== reset 視角 =====
    resetView() {
        this.scale = 1.0;
        this.rotation = 0;
        this.panX = 0;
        this.panY = 0;
        this.isRightDragging = false;
        this.draw();
    }

    resizeIfNeeded() {
        if (!this.canvas) return;

        const parent = this.canvas.parentElement;
        if (!parent) return;

        const W = parent.clientWidth;
        const H = parent.clientHeight;
        const dpr = window.devicePixelRatio || 1;

        const newWidth = Math.floor(W * dpr);
        const newHeight = Math.floor(H * dpr);

        if (this.canvas.width !== newWidth || this.canvas.height !== newHeight) {
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            this.canvas.style.width = `${W}px`;
            this.canvas.style.height = `${H}px`;
        }
    }

    draw() {
        if (!this.mapInfo) return;

        // 只在尺寸真的改變時才 resize
        this.resizeIfNeeded();

        const parent = this.canvas.parentElement;
        const W = parent.clientWidth;
        const H = parent.clientHeight;
        const dpr = window.devicePixelRatio || 1;

        const ctx = this.ctx;

        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform，避免累積
        ctx.scale(dpr, dpr);                // 對齊 dpr
        ctx.imageSmoothingEnabled = false;  // 關掉插值

        ctx.clearRect(0, 0, W, H);

        const mapW = this.mapCanvas.width;
        const mapH = this.mapCanvas.height;

        const baseScale = Math.min(W / mapW, H / mapH);
        const finalScale = baseScale * this.scale;

        ctx.save();
        ctx.translate(W / 2 + this.panX, H / 2 + this.panY);
        ctx.rotate(this.rotation);
        ctx.scale(finalScale, finalScale);

        ctx.drawImage(this.mapCanvas, -mapW / 2, -mapH / 2);

        // 先畫路徑
        this.drawPlan(ctx, finalScale);

        // 再畫機器人
        this.drawRobot(ctx, finalScale);

        ctx.restore();
    }

    // 畫路徑規劃
    drawPlan(ctx, finalScale) {
        if (!this.showPlan) return;  // 如果控制按鈕 [關閉] 就不會畫出路徑規劃

        if (!this.plan || !this.mapInfo) return;
        if (!this.plan.poses || this.plan.poses.length === 0) return;

        const { resolution, origin, width, height } = this.mapInfo.info;

        ctx.save();

        ctx.strokeStyle = "rgba(255, 0, 0, 0.6)";
        ctx.lineWidth = 1 / finalScale;

        // 讓線條更圓滑
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        ctx.beginPath();

        for (let i = 0; i < this.plan.poses.length; i++) {

            const pose = this.plan.poses[i];

            // world → map pixel
            const px = (pose.x - origin.position.x) / resolution;
            const py = (pose.y - origin.position.y) / resolution;

            const cx = px - width / 2;
            const cy = height / 2 - py;

            if (i === 0)
                ctx.moveTo(cx, cy);
            else
                ctx.lineTo(cx, cy);
        }

        ctx.stroke();
        ctx.restore();
    }

    // 畫機器人位置
    drawRobot(ctx, finalScale) {
        if (!this.currentPose || !this.mapInfo) return;

        const { position, orientation } = this.currentPose.pose;
        const { resolution, origin, width, height } = this.mapInfo.info;

        // ROS world → map pixel
        const px = (position.x - origin.position.x) / resolution;
        const py = (position.y - origin.position.y) / resolution;

        // map pixel → centered pixel
        const cx = px - width / 2;
        const cy = height / 2 - py;

        // quaternion → yaw
        const yaw = Math.atan2(
            2 * (orientation.w * orientation.z + orientation.x * orientation.y),
            1 - 2 * (orientation.y * orientation.y + orientation.z * orientation.z)
        );

        ctx.save();

        ctx.translate(cx, cy);
        ctx.rotate(-yaw);

        const size = 7 / finalScale;

        // 機器人本體
        ctx.fillStyle = "red";
        ctx.beginPath();

        // 三角形
        ctx.moveTo(size, 0);                  // 前端尖角
        ctx.lineTo(-size * 0.6, size * 0.6);  // 左後角
        ctx.lineTo(-size * 0.6, -size * 0.6); // 右後角

        ctx.closePath();
        ctx.fill();

        // 描邊(不一定需要)======
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 1 / finalScale;
        ctx.stroke();
        //=====================

        ctx.restore();
    }

}
