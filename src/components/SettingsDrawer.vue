<script setup lang="ts">
import type { WordBookMeta } from '@/types/word';
import type { Language, Translations } from '@/utils/i18n';
import commonUtil from '@/utils/commonUtil';

const props = defineProps<{
    show: boolean;
    isDark: 'dark' | 'light';
    lang: Language;
    studyMode: 'quiz' | 'browse';
    ttsDisabled: boolean;
    currentBookValue: string;
    i18n: Translations;
    wordBookList: WordBookMeta[];
}>();

const emit = defineEmits<{
    (e: 'update:show', val: boolean): void;
    (e: 'change-book', item: WordBookMeta): void;
    (e: 'change-study-mode', mode: 'quiz' | 'browse'): void;
    (e: 'change-theme', theme: 'dark' | 'light'): void;
    (e: 'change-lang', lang: Language): void;
    (e: 'change-tts', enabled: boolean): void;
}>();

const closeDrawer = () => {
    emit('update:show', false);
};

const GITHUB_URL = 'https://github.com/lanzm/HandyCards';
const GITHUB_ICON_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZmZmZiI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMiAyQzYuNDc3IDIgMiA2LjQ4NCAyIDEyLjAxN2MwIDQuNDI1IDIuODY1IDguMTggNi44MzkgOS41MDQuNS4wOTIuNjgyLS4yMTcuNjgyLS40ODMgMC0uMjM3LS4wMDgtLjg2OC0uMDEzLTEuNzAzLTIuNzgyLjYwNS0zLjM2OS0xLjM0My0zLjM2OS0xLjM0My0uNDU0LTEuMTU4LTEuMTEtMS40NjYtMS4xMS0xLjQ2Ni0uOTA4LS42Mi4wNjktLjYwOC4wNjktLjYwOCAxLjAwMy4wNyAxLjUzIDEuMDMyIDEuNTMgMS4wMzIuODkyIDEuNTMgMi4zNDEgMS4wODggMi45MS44MzIuMDkyLS42NDcuMzUtMS4wODguNjM2LTEuMzM4LTIuMjItLjI1My00LjU1NS0xLjExMy00LjU1NS00Ljk1MSAwLTEuMDkzLjM5LTEuOTg4IDEuMDI5LTIuNjg4LS4xMDMtLjI1My0uNDQ2LTEuMjcyLjA5OC0yLjY1IDAgMCAuODQtLjI3IDIuNzUgMS4wMjZBOS41NjQgOS41NjQgMCAwMTEyIDYuODQ0Yy44NS4wMDQgMS43MDUuMTE1IDIuNTA0LjMzNyAxLjkwOS0xLjI5NiAyLjc0Ny0xLjAyNyAyLjc0Ny0xLjAyNy41NDYgMS4zNzkuMjAyIDIuMzk4LjEgMi42NTEuNjQuNyAxLjAyOCAxLjU5NSAxLjAyOCAyLjY4OCAwIDMuODQ4LTIuMzM5IDQuNjk1LTQuNTY2IDQuOTQzLjM1OS4zMDkuNjc4LjkyLjY3OCAxLjg1NSAwIDEuMzM4LS4wMTIgMi40MTktLjAxMiAyLjc0NyAwIC4yNjguMTguNTguNjg4LjQ4MkExMC4wMTkgMTAuMDE5IDAgMDAyMiAxMi4wMTdDMjIgNi40ODQgMTcuNTIyIDIgMTIgMnoiLz48L3N2Zz4=';
const WECHAT_ICON_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZmZmZiI+PHBhdGggZD0iTTguNjkxIDIuMTg4QzMuODkxIDIuMTg4IDAgNS40NzggMCA5LjUzYzAgMi4yMTIgMS4xNyA0LjIwMyAzLjAwMiA1LjU1YS41OS41OSAwIDAgMSAuMjEzLjY2NWwtLjM5IDEuNDhjLS4wMTkuMDctLjA0OC4xNDEtLjA0OC4yMTMgMCAuMTYzLjEzLjI5NS4yOS4yOTVhLjMyNi4zMjYgMCAwIDAgLjE1MS0uMDRsMS45OC0xLjAyYS43MjIuNzIyIDAgMCAxIC40OS0uMDdjMS4wMDIuMjUgMi4wMTIuMzggMy4wNDIuMzguMyAwIC42LS4wMS44OS0uMDRhNi4wNyA2LjA3IDAgMCAxLS4yMi0xLjYxYzAtMy41MiAzLjMyLTYuMzggNy40MS02LjM4LjQxIDAgLjgxLjAzIDEuMjEuMDlDMTcuMDYgNS44NiAxMy4yIDIuMTg4IDguNjkgMi4xODh6bS0yLjYgNC4zODJjLjU3IDAgMS4wNC40NyAxLjA0IDEuMDQgMCAuNTgtLjQ3IDEuMDUtMS4wNCAxLjA1LS41OCAwLTEuMDUtLjQ3LTEuMDUtMS4wNSAwLS41Ny40Ny0xLjA0IDEuMDUtMS4wNHptNS4yIDBjLjU4IDAgMS4wNS40NyAxLjA1IDEuMDQgMCAuNTgtLjQ3IDEuMDUtMS4wNSAxLjA1LS41NyAwLTEuMDQtLjQ3LTEuMDQtMS4wNSAwLS41Ny40Ny0xLjA0IDEuMDQtMS4wNHptNC44MiA0LjE0OGMtMy42IDAtNi41MiAyLjQ3LTYuNTIgNS41MiAwIDMuMDUgMi45MiA1LjUyIDYuNTIgNS41Mi43OCAwIDEuNTQtLjExIDIuMjYtLjMxYS41OC41OCAwIDAgMSAuNDEuMDVsMS41My43OWEuMjUuMjUgMCAwIDAgLjEyLjAzYy4xMiAwIC4yMi0uMS4yMi0uMjMgMC0uMDUtLjAyLS4xMS0uMDQtLjE2bC0uMy0xLjE1YS40Ni40NiAwIDAgMSAuMTYtLjUxYzEuNDItMS4wNCAyLjMzLTIuNTggMi4zMy00LjI5IDAtMy4wNS0yLjkyLTUuNTItNi41Mi01LjUyem0tMi4wOCAzLjM4Yy40NSAwIC44MS4zNi44MS44MSAwIC40NC0uMzYuODEtLjgxLjgxYS44MS44MSAwIDAgMS0uODEtLjgxYzAtLjQ1LjM2LS44MS44MS0uODF6bTQuMTYgMGMuNDQgMCAuODEuMzYuODEuODEgMCAuNDQtLjM3LjgxLS44MS44MWEuODEuODEgMCAwIDEtLjgxLS44MWMwLS40NS4zNy0uODEuODEtLjgxeiIvPjwvc3ZnPg==';
const FEEDBACK_ICON_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIxIDExLjVhOC4zOCA4LjM4IDAgMCAxLS45IDMuOCA4LjUgOC41IDAgMCAxLTcuNiA0LjcgOC4zOCA4LjM4IDAgMCAxLTMuOC0uOUwzIDIxbDEuOS01LjdhOC4zOCA4LjM4IDAgMCAxLS45LTMuOCA4LjUgOC41IDAgMCAxIDQuNy03LjYgOC4zOCA4LjM4IDAgMCAxIDMuOC0uOWguNWE4LjQ4IDguNDggMCAwIDEgOCA4di41eiIvPjxsaW5lIHgxPSIxMiIgeTE9IjgiIHgyPSIxMiIgeTI9IjEyIi8+PGxpbmUgeDE9IjEyIiB5MT0iMTYiIHgyPSIxMi4wMSIgeTI9IjE2Ii8+PC9zdmc+';

const handleCopyGithub = () => {
    commonUtil.copyText(GITHUB_URL, props.i18n.githubCopiedMsg || '已复制链接');
};

const handleTtsSwitch = (e: Event) => {
    const custom = e as CustomEvent<{ value: boolean }>;
    emit('change-tts', Boolean(custom.detail?.value));
};
</script>

<template>
    <view class="settings-drawer-wrapper" :class="[isDark]">
        <!-- Settings Drawer Overlay -->
        <view 
            class="drawer-overlay" 
            :class="{ 'show': show }" 
            @click="closeDrawer"
            @touchmove.stop.prevent
        ></view>
        
        <!-- Settings Drawer Panel -->
        <view class="drawer-panel" :class="{ 'show': show }">
            <view class="flex flex-col w-full h-full overflow-hidden">
                <view class="flex justify-between items-center mb-4">
                    <text class="text-[17px] font-bold tracking-tight text-[var(--ej-text-primary)]">{{ i18n.settingsTitle }}</text>
                    <view 
                        class="drawer-close-btn cursor-pointer" 
                        @click="closeDrawer"
                        hover-class="drawer-close-btn-hover"
                        :hover-stay-time="100"
                    >
                        <text class="drawer-close-icon">✕</text>
                    </view>
                </view>
                
                <scroll-view scroll-y="true" class="drawer-scroll-view flex-1 min-h-0 h-full">
                    <view class="pr-1 box-border w-full">
                        <!-- Option 1: Wordbook Select -->
                        <view class="mb-4">
                            <text class="section-label-style text-[var(--ej-text-muted)]">{{ i18n.currentBookLabel }}</text>
                            <view class="grid grid-cols-2 gap-2.5">
                                <view 
                                    v-for="item in wordBookList" 
                                    :key="item.value"
                                    class="book-card"
                                    :class="{ 'active': currentBookValue === item.value }"
                                    @click="emit('change-book', item)"
                                >
                                    <text class="text-sm font-medium text-center">{{ i18n.wordBookLabels[item.value] || item.label }}</text>
                                    <text class="book-card-count">{{ i18n.wordBookCountText(item.count) }}</text>
                                </view>
                            </view>
                        </view>
                        
                        <!-- Option 1.5: Study Mode Toggle (Quiz vs Browse) -->
                        <view class="mb-4">
                            <text class="section-label-style text-[var(--ej-text-muted)]">{{ i18n.studyModeLabel }}</text>
                            <view class="flex rounded-xl border border-solid border-[var(--ej-border)] overflow-hidden bg-[var(--ej-bg-sub)]">
                                <view 
                                    class="theme-switch-option"
                                    :class="{ 'active': studyMode === 'quiz' }"
                                    @click="emit('change-study-mode', 'quiz')"
                                >
                                    {{ i18n.quizModeText }}
                                </view>
                                <view 
                                    class="theme-switch-option"
                                    :class="{ 'active': studyMode === 'browse' }"
                                    @click="emit('change-study-mode', 'browse')"
                                >
                                    {{ i18n.browseModeText }}
                                </view>
                            </view>
                            <view class="mt-1.5 px-1 flex items-center">
                                <text class="text-[11px] text-[var(--ej-text-muted)] leading-tight">
                                    💡 {{ studyMode === 'quiz' ? i18n.quizModeDesc : i18n.browseModeDesc }}
                                </text>
                            </view>
                        </view>

                        <!-- Option 2: Theme Toggle -->
                        <view class="mb-4">
                            <text class="section-label-style text-[var(--ej-text-muted)]">{{ i18n.themeLabel }}</text>
                            <view class="flex rounded-xl border border-solid border-[var(--ej-border)] overflow-hidden bg-[var(--ej-bg-sub)]">
                                <view 
                                    class="theme-switch-option"
                                    :class="{ 'active': isDark === 'light' }"
                                    @click="emit('change-theme', 'light')"
                                >
                                    {{ i18n.lightModeText }}
                                </view>
                                <view 
                                    class="theme-switch-option"
                                    :class="{ 'active': isDark === 'dark' }"
                                    @click="emit('change-theme', 'dark')"
                                >
                                    {{ i18n.darkModeText }}
                                </view>
                            </view>
                        </view>

                        <!-- Option 2.5: Language Toggle -->
                        <view class="mb-4">
                            <text class="section-label-style text-[var(--ej-text-muted)]">{{ i18n.langLabel }}</text>
                            <view class="flex rounded-xl border border-solid border-[var(--ej-border)] overflow-hidden bg-[var(--ej-bg-sub)]">
                                <view 
                                    class="theme-switch-option"
                                    :class="{ 'active': lang === 'zh' }"
                                    @click="emit('change-lang', 'zh')"
                                >
                                    <view class="flex-center gap-2 h-full w-full">
                                        <text class="lang-badge">文</text>
                                        <text class="text-sm font-medium">中文</text>
                                    </view>
                                </view>
                                <view 
                                    class="theme-switch-option"
                                    :class="{ 'active': lang === 'en' }"
                                    @click="emit('change-lang', 'en')"
                                >
                                    <view class="flex-center gap-2 h-full w-full">
                                        <text class="lang-badge">A</text>
                                        <text class="text-sm font-medium">English</text>
                                    </view>
                                </view>
                            </view>
                        </view>

                        <!-- Option 2.6: TTS Toggle -->
                        <view class="mb-4">
                            <text class="section-label-style text-[var(--ej-text-muted)]">{{ i18n.ttsLabel }}</text>
                            <view class="settings-row-card">
                                <view class="flex flex-col gap-0.5 min-w-0">
                                    <text class="text-sm font-medium text-[var(--ej-text-primary)]">{{ i18n.ttsTitle }}</text>
                                    <text class="text-[11px] text-[var(--ej-text-muted)] leading-tight">{{ ttsDisabled ? i18n.ttsDisabledHint : i18n.ttsEnabledHint }}</text>
                                </view>
                                <switch
                                    :checked="!ttsDisabled"
                                    color="#2563EB"
                                    class="settings-switch"
                                    @change="handleTtsSwitch"
                                />
                            </view>
                        </view>

                        <!-- Option 2.7: Open Source & About -->
                        <view class="mb-4">
                            <text class="section-label-style text-[var(--ej-text-muted)]">{{ i18n.shareLabel }}</text>
                            
                            <view class="flex flex-col gap-2.5">
                                <!-- 1. Share with Friends (Native open-type="share") -->
                                <button class="drawer-action-btn" open-type="share">
                                    <view class="action-icon-box wechat-bg">
                                        <image :src="WECHAT_ICON_SVG" class="action-svg-icon" mode="aspectFit" />
                                    </view>
                                    <view class="flex flex-col gap-0.5 flex-1 min-w-0">
                                        <view class="flex items-center gap-1.5 flex-nowrap">
                                            <text class="text-sm font-semibold text-[var(--ej-text-primary)] truncate">{{ i18n.shareFriendsTitle }}</text>
                                            <text class="badge-tag share-tag">{{ i18n.shareFriendsBadge }}</text>
                                        </view>
                                        <text class="text-[11px] text-[var(--ej-text-muted)] truncate leading-tight">{{ i18n.shareFriendsDesc }}</text>
                                    </view>
                                    <view class="action-pill share-pill">
                                        <text class="text-[11px] font-semibold text-[#07C160]">{{ i18n.shareFriendsAction }}</text>
                                    </view>
                                </button>

                                <!-- 2. Official Feedback (Native open-type="feedback") -->
                                <button class="drawer-action-btn" open-type="feedback">
                                    <view class="action-icon-box feedback-bg">
                                        <image :src="FEEDBACK_ICON_SVG" class="action-svg-icon" mode="aspectFit" />
                                    </view>
                                    <view class="flex flex-col gap-0.5 flex-1 min-w-0">
                                        <view class="flex items-center gap-1.5 flex-nowrap">
                                            <text class="text-sm font-semibold text-[var(--ej-text-primary)] truncate">{{ i18n.feedbackTitle }}</text>
                                            <text class="badge-tag feedback-tag">{{ i18n.feedbackBadge }}</text>
                                        </view>
                                        <text class="text-[11px] text-[var(--ej-text-muted)] truncate leading-tight">{{ i18n.feedbackDesc }}</text>
                                    </view>
                                    <view class="action-pill feedback-pill">
                                        <text class="text-[11px] font-semibold text-[#6366F1]">{{ i18n.feedbackAction }}</text>
                                    </view>
                                </button>

                                <!-- 3. GitHub Open Source Card (Click to copy) -->
                                <view class="drawer-action-btn" @click="handleCopyGithub">
                                    <view class="action-icon-box github-bg">
                                        <image :src="GITHUB_ICON_SVG" class="action-svg-icon" mode="aspectFit" />
                                    </view>
                                    <view class="flex flex-col gap-0.5 flex-1 min-w-0">
                                        <view class="flex items-center gap-1.5 flex-nowrap">
                                            <text class="text-sm font-semibold text-[var(--ej-text-primary)] truncate">{{ i18n.githubCardTitle }}</text>
                                            <text class="badge-tag github-tag">{{ i18n.githubBadgeText }}</text>
                                        </view>
                                        <text class="text-[11px] text-[var(--ej-text-muted)] truncate leading-tight">github.com/lanzm/HandyCards</text>
                                    </view>
                                    <view class="action-pill github-pill">
                                        <text class="text-[11px] font-semibold">{{ i18n.copyLinkText }}</text>
                                    </view>
                                </view>
                            </view>
                        </view>

                        <!-- Bottom breathing spacer -->
                        <view class="h-8 w-full shrink-0"></view>
                    </view>
                </scroll-view>
            </view>
        </view>
    </view>
</template>

<style scoped>
/* Drawer structural styles */
.drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.4);
    z-index: 1000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
}
.drawer-overlay.show {
    opacity: 1;
    pointer-events: auto;
}

.drawer-panel {
    position: fixed;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 70vh;
    background-color: var(--ej-bg-card);
    color: var(--ej-text-primary);
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    z-index: 1001;
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s, color 0.3s;
    box-sizing: border-box;
    padding: 20px 16px calc(16px + env(safe-area-inset-bottom)) 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.drawer-panel.show {
    transform: translateY(0);
}

.drawer-close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ej-text-sub);
    background-color: transparent;
    transition: all 0.2s;
    box-sizing: border-box;
}

.drawer-close-btn-hover {
    background-color: var(--ej-border);
    opacity: 0.8;
}

.drawer-close-icon {
    font-size: 15px;
    line-height: 1;
}

.drawer-scroll-view {
    -webkit-mask-image: linear-gradient(to bottom, #000000 0%, #000000 calc(100% - 36px), rgba(0, 0, 0, 0.4) calc(100% - 14px), transparent 100%);
    mask-image: linear-gradient(to bottom, #000000 0%, #000000 calc(100% - 36px), rgba(0, 0, 0, 0.4) calc(100% - 14px), transparent 100%);
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
}


.book-card {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 12px;
    padding: 12px;
    border: 1px solid var(--ej-border);
    background-color: var(--ej-bg-sub);
    text-align: center;
    transition: all 0.2s;
}

.book-card.active {
    border-color: var(--ej-color-brand);
    background-color: var(--ej-color-brand-subtle);
    color: var(--ej-color-brand);
    font-weight: 600;
}

.book-card-count {
    font-size: 11px;
    font-weight: 500;
    text-align: center;
    color: var(--ej-text-muted);
}

.book-card.active .book-card-count {
    color: var(--ej-color-brand);
}

.theme-switch-option {
    flex: 1;
    text-align: center;
    padding: 10px 0;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    color: var(--ej-text-muted);
}

.theme-switch-option.active {
    background-color: var(--ej-bg-card);
    color: var(--ej-color-brand);
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.lang-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 800;
    background-color: var(--ej-border);
    color: var(--ej-text-muted);
    line-height: 1;
    transition: all 0.2s;
}

.theme-switch-option.active .lang-badge {
    background-color: var(--ej-color-brand);
    color: #FFFFFF;
}

.settings-row-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--ej-border);
    background-color: var(--ej-bg-sub);
    transition: all 0.2s;
    box-sizing: border-box;
}

.settings-switch {
    transform: scale(0.8);
    transform-origin: right center;
    margin-right: -4px;
}

.drawer-action-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    margin: 0;
    border-radius: 12px;
    border: 1px solid var(--ej-border);
    background-color: var(--ej-bg-sub);
    cursor: pointer;
    transition: all 0.2s;
    box-sizing: border-box;
    font-size: inherit;
    text-align: left;
    line-height: inherit;
    color: inherit;
    outline: none;
    font-family: inherit;
}

.drawer-action-btn::after {
    border: none;
}

.drawer-action-btn:active {
    background-color: var(--ej-color-brand-subtle);
    border-color: var(--ej-color-brand);
}

.action-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.action-icon-box.wechat-bg {
    background-color: #07C160;
}

.action-icon-box.feedback-bg {
    background-color: #6366F1;
}

.action-icon-box.github-bg {
    background-color: #24292F;
}

.action-svg-icon {
    width: 24px;
    height: 24px;
    display: block;
}

.badge-tag {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
    flex-shrink: 0;
    line-height: 1.2;
}

.badge-tag.share-tag {
    background-color: rgba(7, 193, 96, 0.1);
    color: #07C160;
}

.badge-tag.feedback-tag {
    background-color: rgba(99, 102, 241, 0.1);
    color: #6366F1;
}

.badge-tag.github-tag {
    background-color: rgba(36, 41, 47, 0.08);
    color: #24292F;
}

.dark .badge-tag.github-tag {
    background-color: rgba(255, 255, 255, 0.1);
    color: #E2E8F0;
}

.action-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    padding: 0 12px;
    border-radius: 6px;
    flex-shrink: 0;
    align-self: center;
    box-sizing: border-box;
}

.action-pill.share-pill {
    background-color: rgba(7, 193, 96, 0.1);
}

.action-pill.feedback-pill {
    background-color: rgba(99, 102, 241, 0.1);
}

.action-pill.github-pill {
    background-color: rgba(36, 41, 47, 0.08);
}

.action-pill.github-pill text {
    color: #24292F;
}

.dark .action-pill.github-pill {
    background-color: rgba(255, 255, 255, 0.1);
}

.dark .action-pill.github-pill text {
    color: #E2E8F0;
}

.action-pill text {
    line-height: 1;
    display: block;
}
</style>
