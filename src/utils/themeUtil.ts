export type ThemeMode = 'dark' | 'light';

/**
 * 获取当前初始化主题（优先读取 Storage，未配置则遵循系统深浅色偏好）
 */
export const getInitialTheme = (): ThemeMode => {
    try {
        const savedTheme = uni.getStorageSync('theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
            return savedTheme;
        }
        const appBase = typeof (uni as any).getAppBaseInfo === 'function' ? (uni as any).getAppBaseInfo() : null;
        const systemTheme = appBase?.theme ?? uni.getSystemInfoSync?.()?.theme;
        return systemTheme === 'dark' ? 'dark' : 'light';
    } catch {
        return 'light';
    }
};

/**
 * 根据深浅主题动态设置微信小程序/移动端原生导航栏颜色
 */
export const setNavigationBarTheme = (theme: ThemeMode): void => {
    if (theme === 'dark') {
        uni.setNavigationBarColor({
            frontColor: '#ffffff',
            backgroundColor: '#09090B',
            animation: { duration: 200, timingFunc: 'linear' },
        });
    } else {
        uni.setNavigationBarColor({
            frontColor: '#000000',
            backgroundColor: '#E9EEF4',
            animation: { duration: 200, timingFunc: 'linear' },
        });
    }
};
