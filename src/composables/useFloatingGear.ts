import { ref, watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue';

/**
 * 管理设置悬浮齿轮按钮的位置、手势拖拽、吸边贴合与优雅自动隐藏的 Composable
 */
export function useFloatingGear(showDrawer: Ref<boolean>) {
    const gearX = ref(300);
    const gearY = ref(350);
    const lastDragX = ref(300);
    const lastDragY = ref(350);
    const gearReady = ref(false);
    const isHiding = ref(true);
    const dockSide = ref<'left' | 'right'>('right');
    let gearIntroTimer: ReturnType<typeof setTimeout> | null = null;

    const GEAR_WIDTH = 50;
    const VISIBLE_GAP = 16; // 弹出时距离屏幕边缘的间隙

    let cachedScreenWidth = 0;
    let cachedScreenHeight = 0;

    const getScreenDimensions = () => {
        if (cachedScreenWidth > 0) {
            return { screenWidth: cachedScreenWidth, screenHeight: cachedScreenHeight };
        }
        try {
            const sys = uni.getSystemInfoSync();
            cachedScreenWidth = sys.windowWidth || 375;
            cachedScreenHeight = sys.windowHeight || 667;
        } catch {
            cachedScreenWidth = 375;
            cachedScreenHeight = 667;
        }
        return { screenWidth: cachedScreenWidth, screenHeight: cachedScreenHeight };
    };

    /**
     * 启动延时吸边收起定时器
     * @param delay 停留毫秒数，默认 1500ms
     */
    const startAutoHideTimer = (delay = 1500) => {
        if (gearIntroTimer) {
            clearTimeout(gearIntroTimer);
            gearIntroTimer = null;
        }
        gearIntroTimer = setTimeout(() => {
            if (!showDrawer.value) {
                dockGear();
            }
            gearIntroTimer = null;
        }, delay);
    };

    /**
     * 唤醒齿轮：从吸边缝隙中弹出到屏幕内部完全展示
     */
    const wakeUpGear = () => {
        if (gearIntroTimer) {
            clearTimeout(gearIntroTimer);
            gearIntroTimer = null;
        }
        try {
            const { screenWidth } = getScreenDimensions();

            if (dockSide.value === 'left') {
                gearX.value = VISIBLE_GAP;
                lastDragX.value = VISIBLE_GAP;
            } else {
                const visibleX = Math.max(screenWidth - GEAR_WIDTH - VISIBLE_GAP, 0);
                gearX.value = visibleX;
                lastDragX.value = visibleX;
            }
            isHiding.value = false;
        } catch {
            isHiding.value = false;
        }
    };

    /**
     * 吸边折叠：贴靠到屏幕边缘并开启半透明半隐藏状态
     */
    const dockGear = () => {
        try {
            const { screenWidth } = getScreenDimensions();

            if (dockSide.value === 'left') {
                gearX.value = 0;
                lastDragX.value = 0;
            } else {
                const dockedX = screenWidth - GEAR_WIDTH;
                gearX.value = dockedX;
                lastDragX.value = dockedX;
            }
            isHiding.value = true;
        } catch {
            isHiding.value = true;
        }
    };

    const onGearChange = (e: any) => {
        if (e.detail?.source === 'touch') {
            lastDragX.value = e.detail.x;
            lastDragY.value = e.detail.y;
            isHiding.value = false;
        }
    };

    const onGearTouchStart = () => {
        if (gearIntroTimer) {
            clearTimeout(gearIntroTimer);
            gearIntroTimer = null;
        }
        isHiding.value = false;
    };

    const onGearTouchEnd = () => {
        try {
            const { screenWidth } = getScreenDimensions();
            const centerX = (screenWidth - GEAR_WIDTH) / 2;

            if (lastDragX.value < centerX) {
                dockSide.value = 'left';
                gearX.value = VISIBLE_GAP;
                lastDragX.value = VISIBLE_GAP;
            } else {
                dockSide.value = 'right';
                const visibleX = Math.max(screenWidth - GEAR_WIDTH - VISIBLE_GAP, 0);
                gearX.value = visibleX;
                lastDragX.value = visibleX;
            }

            gearY.value = lastDragY.value;
            isHiding.value = false;

            // 拖拽松手后保持弹出 1.5 秒，随后自动吸边折叠
            startAutoHideTimer(1500);
        } catch (e) {
            console.error(e);
        }
    };

    const initGearPosition = () => {
        gearReady.value = false;
        if (gearIntroTimer) {
            clearTimeout(gearIntroTimer);
            gearIntroTimer = null;
        }
        try {
            const sys = uni.getSystemInfoSync();
            cachedScreenWidth = sys.windowWidth || 375;
            cachedScreenHeight = sys.windowHeight || 667;
            const screenWidth = cachedScreenWidth;
            const visibleX = Math.max(screenWidth - GEAR_WIDTH - VISIBLE_GAP, 0);

            dockSide.value = 'right';
            gearX.value = visibleX;
            gearY.value = cachedScreenHeight * 0.4;
            lastDragX.value = visibleX;
            lastDragY.value = cachedScreenHeight * 0.4;
            isHiding.value = false;

            startAutoHideTimer(1400);
        } catch (e) {
            gearX.value = 350;
            gearY.value = 300;
            isHiding.value = false;
        }
        nextTick(() => {
            gearReady.value = true;
        });
    };

    // 监听抽屉打开与关闭
    watch(showDrawer, (isOpen) => {
        if (isOpen) {
            // 打开抽屉时：确保齿轮唤醒弹出且保持可见，不自动收起
            wakeUpGear();
        } else {
            // 关闭抽屉回到主屏：齿轮保持弹出展示 1.5 秒，视觉反馈结束后优雅吸边
            startAutoHideTimer(1500);
        }
    });

    onMounted(() => {
        initGearPosition();
    });

    onUnmounted(() => {
        if (gearIntroTimer) {
            clearTimeout(gearIntroTimer);
            gearIntroTimer = null;
        }
    });

    return {
        gearX,
        gearY,
        gearReady,
        isHiding,
        dockSide,
        onGearChange,
        onGearTouchStart,
        onGearTouchEnd,
        wakeUpGear,
        initGearPosition
    };
}
