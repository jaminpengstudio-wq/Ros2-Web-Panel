// scripts/WaypointMapRenderer.js

export class WaypointMapRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // 暫存原始地圖像素
        this.mapCanvas = document.createElement("canvas");
        this.mapCtx = this.mapCanvas.getContext("2d");

        this.mapInfo = null;

        // ===== 繪製mark =====
        this.selectedPose = null;      // 紅色的 mark
        this.confirmedWaypoints = [];  // 綠色的 mark

        // ===== 互動狀態 =====
        this.scale = 1.0;
        this.rotation = 0; // radians (保留，但右鍵不再控制地圖旋轉)
        this.panX = 0;     // 平移（右鍵控制地圖平移）
        this.panY = 0;

        // ===== 滑鼠狀態 =====
        this.isRightDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.onLeftClick = null;    // 左鍵點擊選座標地點

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
        this.canvas.removeEventListener("wheel", this.onWheel);
        this.canvas.removeEventListener("mousedown", this.onMouseDown);
        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("mouseup", this.onMouseUp);
        this.canvas.removeEventListener("contextmenu", this.onContextMenu);

        this.mapInfo = null;
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

    // 設定紅色座標點並畫出 (未確認)
    setSelectedPose(pose) {
        this.selectedPose = pose;
        this.draw();
    }

    // 設定綠色座標點並畫出 (已確認)
    setConfirmedWaypoints(wps) {
        this.confirmedWaypoints = wps || [];
        this.draw();
    }

    setOnLeftClick(cb) {
        this.onLeftClick = cb;
    }

    // ===== 滑鼠事件 =====
    onContextMenu(e) {
        e.preventDefault();
    }

    onMouseDown(e) {
        // 左鍵點擊
        if (e.button === 0 && this.onLeftClick) {
            const pose = this.screenToMap(e.clientX, e.clientY);
            this.onLeftClick(pose);
            return;
        }

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

    draw() {
        // if (!this.mapInfo || !this.canvas) return;
        if (!this.mapInfo) return;

        const parent = this.canvas.parentElement;
        const W = parent.clientWidth;
        const H = parent.clientHeight;

        const dpr = window.devicePixelRatio || 1;

        // 設定 canvas 實體像素尺寸
        this.canvas.width = Math.floor(W * dpr);
        this.canvas.height = Math.floor(H * dpr);
        this.canvas.style.width = `${W}px`;
        this.canvas.style.height = `${H}px`;

        const ctx = this.ctx;
        // reset transform，避免累積
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // 對齊 dpr
        ctx.scale(dpr, dpr);
        // 關掉插值
        ctx.imageSmoothingEnabled = false;

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

        // ===== 畫選取的紅色 mark =====
        if (this.selectedPose) {
            this.drawPoseMarkerInMapSpace(this.selectedPose, "red");
        }

        // ===== 畫以確認的綠色 mark =====
        this.confirmedWaypoints.forEach(wp => {
            this.drawPoseMarkerInMapSpace(wp, "green");
        });

        ctx.restore();
    }

    // 螢幕 → map 座標轉換
    screenToMap(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const W = rect.width;
        const H = rect.height;

        // === 1. 螢幕 → 以畫面中心為原點的座標 ===
        let dx = clientX - rect.left - (W / 2 + this.panX);
        let dy = clientY - rect.top - (H / 2 + this.panY);

        // === 2. 反旋轉 ===
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;

        const { width, height, resolution, origin } = this.mapInfo.info;

        // === 3. 反縮放 ===
        const baseScale = Math.min(W / width, H / height);
        const finalScale = baseScale * this.scale;

        const mx = rx / finalScale;
        const my = ry / finalScale;

        // === 4. map-centered pixel → map pixel ===
        const px = mx + width / 2;
        const py = height / 2 - my;

        // === 5. map pixel → ROS world (meter) ===
        const wx = origin.position.x + px * resolution;
        const wy = origin.position.y + py * resolution;

        return {
            x: +wx.toFixed(3),
            y: +wy.toFixed(3),
            yaw: 0.0,
        };
    }

    // 畫 marker 的工具
    drawPoseMarkerInMapSpace(pose, color = "red") {
        const { x, y } = pose;
        const { resolution, origin, width, height } = this.mapInfo.info;

        // world → map pixel
        const px = (x - origin.position.x) / resolution;
        const py = (y - origin.position.y) / resolution;

        // map pixel → map-centered pixel
        const mx = px - width / 2;
        const my = height / 2 - py;

        const ctx = this.ctx;

        // 半徑用「世界大小」，不要用螢幕 pixel
        const r = Math.max(3, 4 / this.scale);

        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }


}

