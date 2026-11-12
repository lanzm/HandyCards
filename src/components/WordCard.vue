<script lang="ts">
export default {
    options: {
        virtualHost: true
    }
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import type { WordItem, DetailSectionKey } from '@/types/word';
import type { Translations, Language } from '@/utils/i18n';
import commonUtil from '@/utils/commonUtil';
import { 
    getUniquePos, 
    getPosIcon, 
    formatDefinitionPos, 
    formatDefinitionContent 
} from '@/utils/anatomy';

const props = withDefaults(defineProps<{
    word: WordItem | null;
    loading?: boolean;
    isBackground?: boolean;
    isRevealed?: boolean;
    isRevealing?: boolean;
    showQuizPrompt?: boolean;
    ttsDisabled?: boolean;
    playFlag?: boolean;
    i18n: Translations;
    scrollTop?: number;
    detailSections?: Record<DetailSectionKey, boolean>;
    bookValue?: string;
    totalWords?: number;
    lang?: Language;
}>(), {
    loading: false,
    isBackground: false,
    isRevealed: true,
    isRevealing: false,
    showQuizPrompt: false,
    ttsDisabled: false,
    playFlag: false,
    scrollTop: 0,
    bookValue: '',
    totalWords: 0,
    lang: 'zh',
    detailSections: () => ({
        definitions: true,
        examples: false,
        collocations: false,
        confusing: false,
        secondary: false,
        anatomy: false
    })
});

const emit = defineEmits<{
    (e: 'play-audio'): void;
    (e: 'tap-card'): void;
    (e: 'next-word'): void;
    (e: 'toggle-section', section: DetailSectionKey): void;
    (e: 'scroll', event: Event | CustomEvent<{ scrollTop: number }>): void;
    (e: 'touch-start', event: TouchEvent): void;
    (e: 'touch-move', event: TouchEvent): void;
    (e: 'touch-end'): void;
    (e: 'detail-touch-start', event: TouchEvent): void;
    (e: 'detail-touch-move', event: TouchEvent): void;
    (e: 'detail-touch-end'): void;
}>();

const cleanStr = (s?: string) => (s ?? '').replace(/["'“”‘’「」『』\\]/g, '').trim();

const parseCognateItem = (text?: string) => {
    if (!text) return null;
    // 1. 匹配中英文圆括号、方括号或中括号：如 "dict (说)"、"dict [说]"、"dict【说】"
    const bracketMatch = text.match(/^([^（\(\[【]+)(?:\s*[（\(\[【]([^）\)\]】]+)[）\)\]】])?$/);
    if (bracketMatch && bracketMatch[2]) {
        const term = cleanStr(bracketMatch[1]);
        const meaning = cleanStr(bracketMatch[2]);
        return {
            term,
            meaning: /[\u4e00-\u9fa5]/.test(meaning) ? meaning : ''
        };
    }
    // 2. 匹配冒号或破折号分隔：如 "dict: 言，说" 或 "dict - 言"
    const colonMatch = text.match(/^([^:：\-–—]+)\s*[:：\-–—]\s*(.+)$/);
    if (colonMatch && /[\u4e00-\u9fa5]/.test(colonMatch[2])) {
        return {
            term: cleanStr(colonMatch[1]),
            meaning: cleanStr(colonMatch[2])
        };
    }
    return { term: cleanStr(text), meaning: '' };
};

const parsedRoot = computed(() => {
    const r = props.word?.r?.r;
    if (!r) return null;
    return parseCognateItem(r);
});

const parsedFamily = computed(() => {
    const list = props.word?.r?.f;
    if (!list || list.length === 0) return [];
    return list.map(item => parseCognateItem(item) || { term: cleanStr(item), meaning: '' });
});

const uniquePosList = computed(() => getUniquePos(props.word?.t));

const totalCount = computed(() => {
    if (props.totalWords && props.totalWords > 0) {
        return props.totalWords;
    }
    const found = commonUtil.wordBookList.find(b => b.value === props.bookValue);
    return found?.count ?? 1200;
});

// 线性插值辅助函数
const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

interface ColorStop {
    t: number;
    light: [number, number, number];
    dark: [number, number, number];
}

// 连续平滑色彩光谱锚点（根据全书进度比率 t 自适应连续渐变）：
// 0.00: 质感墨灰
// 0.10: 质感墨灰（前 10% 仅由浅入深提升透明度，起步清爽不抢夺注意力）
// 0.45: 灿金暖琥珀（渐入佳境）
// 0.75: 炽烈赤红（势如破竹）
// 1.00: 极光曜紫（通关升华）
const COLOR_STOPS: ColorStop[] = [
    { t: 0.00, light: [100, 116, 139], dark: [148, 163, 184] }, // #64748B / #94A3B8
    { t: 0.10, light: [100, 116, 139], dark: [148, 163, 184] },
    { t: 0.45, light: [217, 119, 6],   dark: [251, 191, 36]  }, // 灿金暖琥珀 #D97706 / #FBBF24
    { t: 0.75, light: [225, 29, 72],   dark: [251, 113, 133] }, // 炽烈赤红 #E11D48 / #FB7185
    { t: 1.00, light: [147, 51, 234],  dark: [192, 132, 252] }, // 极光曜紫 #9333EA / #C084FC
];

function interpolateColor(t: number) {
    if (t <= COLOR_STOPS[0].t) {
        const s = COLOR_STOPS[0];
        return { rL: s.light[0], gL: s.light[1], bL: s.light[2], rD: s.dark[0], gD: s.dark[1], bD: s.dark[2] };
    }
    const last = COLOR_STOPS[COLOR_STOPS.length - 1];
    if (t >= last.t) {
        return { rL: last.light[0], gL: last.light[1], bL: last.light[2], rD: last.dark[0], gD: last.dark[1], bD: last.dark[2] };
    }

    for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
        const c1 = COLOR_STOPS[i];
        const c2 = COLOR_STOPS[i + 1];
        if (t >= c1.t && t <= c2.t) {
            const range = c2.t - c1.t;
            const progress = range > 0 ? (t - c1.t) / range : 0;
            return {
                rL: lerp(c1.light[0], c2.light[0], progress),
                gL: lerp(c1.light[1], c2.light[1], progress),
                bL: lerp(c1.light[2], c2.light[2], progress),
                rD: lerp(c1.dark[0], c2.dark[0], progress),
                gD: lerp(c1.dark[1], c2.dark[1], progress),
                bD: lerp(c1.dark[2], c2.dark[2], progress),
            };
        }
    }

    const s = COLOR_STOPS[0];
    return { rL: s.light[0], gL: s.light[1], bL: s.light[2], rD: s.dark[0], gD: s.dark[1], bD: s.dark[2] };
}

// 连续平滑升温彩蛋：墨灰 (0.00~0.10) -> 灿金 (0.45) -> 炽红 (0.75) -> 极光紫 (1.00)
const seqBadgeStyle = computed(() => {
    const idx = props.word?.cardIndex;
    if (!idx || idx <= 0) return '';

    const total = totalCount.value > 1 ? totalCount.value : 1000;
    // 归一化全书进度比率 t (0.0 ~ 1.0)
    const t = Math.max(0, Math.min(1, (idx - 1) / (total - 1)));

    // 前 10% 阶段由极轻的不透明度 0.25 线性淡入到 1.0，起步清爽不抢夺视线
    const opacity = t <= 0.10
        ? Number((0.25 + 0.75 * (t / 0.10)).toFixed(2))
        : 1;

    const { rL, gL, bL, rD, gD, bD } = interpolateColor(t);

    // 字重随进度微调递增，终点圆满加粗
    const weight = t >= 0.85 ? 700 : (t >= 0.45 ? 600 : 500);

    return `--seq-opacity: ${opacity}; --seq-color-light: rgb(${rL},${gL},${bL}); --seq-color-dark: rgb(${rD},${gD},${bD}); font-weight: ${weight};`;
});

// 长单词自适应阶梯字号：防止长词被右侧编号挤压或丑陋折行
const wordFontSizeClass = computed(() => {
    const len = props.word?.w?.trim()?.length || 0;
    if (len >= 17) return 'word-size-xs';   // 22px (极长词)
    if (len >= 14) return 'word-size-sm';   // 26px (如 implementation 14 字母)
    if (len >= 11) return 'word-size-md';   // 30px (如 conservation 12 字母)
    return '';                              // 36px 默认饱满大字
});
</script>

<template>
    <!-- Skeleton loader when loading or word is missing in foreground mode -->
    <view v-if="loading || !word" class="flex flex-col h-full w-full box-border flex-1 min-h-0 justify-between px-5">
        <view class="flex flex-col items-center justify-center gap-3 mb-7 pt-2.5">
            <view class="skeleton-shimmer w-[160px] h-[36px] rounded-md"></view>
            <view class="skeleton-shimmer w-[100px] h-[18px] rounded"></view>
            <view class="skeleton-shimmer w-[64px] h-[22px] rounded-full"></view>
        </view>

        <view class="card-divider shrink-0"></view>

        <view class="flex-1 flex flex-col items-center justify-center gap-4 py-7">
            <view class="skeleton-shimmer w-[72px] h-[72px] rounded-full"></view>
            <view class="skeleton-shimmer w-[200px] h-4 rounded"></view>
            <view class="skeleton-shimmer w-[140px] h-4 rounded"></view>
        </view>

        <view class="flex gap-3 w-full mt-auto pb-1">
            <view class="skeleton-shimmer h-[48px] rounded-xl flex-[3]"></view>
            <view class="skeleton-shimmer h-[48px] rounded-xl flex-[7]"></view>
        </view>
    </view>

    <!-- Card Content -->
    <view v-else class="flex flex-col h-full w-full box-border flex-1 min-h-0 justify-between">
        <!-- Word & Audio Section (Fixed Header) -->
        <view 
          class="px-5 mb-3 shrink-0"
          @touchstart="!isBackground ? emit('touch-start', $event) : undefined"
          @touchmove="!isBackground ? emit('touch-move', $event) : undefined"
          @touchend="!isBackground ? emit('touch-end') : undefined"
        >
            <view class="flex flex-col gap-1">
                <!-- Word & Top-Right Sequence Badge Row -->
                <view class="flex justify-between items-start gap-2">
                    <text 
                      class="word-large-text flex-1 min-w-0 pr-1" 
                      :class="wordFontSizeClass"
                      @click.stop="!isBackground && !ttsDisabled && emit('play-audio')"
                    >{{ word.w }}</text>

                    <!-- Top-right minimalist card sequence badge with smooth heat interpolation easter egg -->
                    <view v-if="word?.cardIndex" class="card-seq-badge shrink-0">
                        <text class="card-seq-text" :style="seqBadgeStyle">#{{ word.cardIndex }}</text>
                    </view>
                </view>

                <!-- Phonetic Audio Row -->
                <view 
                  class="inline-flex flex-wrap items-center gap-2" 
                  @click.stop="!isBackground && !ttsDisabled && emit('play-audio')"
                >
                    <text class="phonetic-small-text">/{{ word.p }}/</text>
                    <view 
                      v-if="!ttsDisabled" 
                      class="phonetic-speaker-box" 
                      :class="{ 'playing': playFlag && !isBackground }"
                    >
                        <text class="speaker-horn"></text>
                        <text class="speaker-arc arc-1"></text>
                        <text class="speaker-arc arc-2"></text>
                    </view>
                </view>
            </view>
            
            <!-- Part of Speech Tabs/Pills -->
            <view class="flex flex-wrap gap-2 mt-3.5" v-if="uniquePosList.length > 0">
                <view 
                  v-for="(item, index) in uniquePosList" 
                  :key="index"
                  class="pos-pill"
                >
                    <text class="text-[13px]">{{ getPosIcon(item) }}</text>
                    <text class="pos-pill-text">{{ item }}</text>
                </view>
            </view>
        </view>

        <!-- Divider -->
        <view class="px-5 w-full box-border shrink-0">
            <view class="card-divider"></view>
        </view>

        <!-- Details Section: Background Card Mode (Static Preview) -->
        <view 
          v-if="isBackground" 
          class="relative flex flex-col justify-between flex-1 w-full min-h-0 box-border overflow-hidden"
        >
            <view 
              class="w-full flex-1 px-5 box-border select-none pointer-events-none overflow-hidden card-details-content"
              :class="{ 'card-details-blurred': !isRevealed }"
            >
                <!-- Definitions -->
                <view class="detail-section mb-3">
                    <view class="detail-section-header">
                        <text class="section-header-title">{{ i18n.definitionsTitle }}</text>
                        <view class="section-toggle-icon is-open"></view>
                    </view>
                    <view class="detail-section-body">
                        <view class="example-list">
                            <view
                              v-for="(item, index) in word.t"
                              :key="index"
                              class="example-item"
                            >
                                <view class="flex items-baseline gap-1.5">
                                    <text class="font-bold text-[13.5px] text-[var(--ej-color-brand)] shrink-0" v-if="formatDefinitionPos(item[0])">
                                        {{ formatDefinitionPos(item[0]) }}.
                                    </text>
                                    <text class="example-en-text font-bold">{{ formatDefinitionContent(item) }}</text>
                                </view>
                            </view>
                        </view>
                    </view>
                </view>

                <!-- Secondary Meanings Mock -->
                <view v-if="word?.sm && word.sm.length > 0" class="detail-section mb-3">
                    <view class="detail-section-header">
                        <text class="section-header-title">{{ i18n.secondaryTitle }}</text>
                        <view class="section-toggle-icon"></view>
                    </view>
                </view>

                <!-- Collocations Mock -->
                <view v-if="word?.c && word.c.length > 0" class="detail-section mb-3">
                    <view class="detail-section-header">
                        <text class="section-header-title">{{ i18n.collocationsTitle }}</text>
                        <view class="section-toggle-icon"></view>
                    </view>
                </view>

                <!-- Confusing Words Mock -->
                <view v-if="word?.cf && word.cf.length > 0" class="detail-section mb-3">
                    <view class="detail-section-header">
                        <text class="section-header-title">{{ i18n.confusingTitle }}</text>
                        <view class="section-toggle-icon"></view>
                    </view>
                </view>

                <!-- Examples Mock -->
                <view v-if="word?.s && word.s.length > 0" class="detail-section mb-3">
                    <view class="detail-section-header">
                        <text class="section-header-title">{{ i18n.examplesTitle }}</text>
                        <view class="section-toggle-icon"></view>
                    </view>
                </view>

                <!-- Word Roots & Cognates Mock -->
                <view v-if="word?.r && (word.r.r || (word.r.f && word.r.f.length > 0))" class="detail-section mb-3">
                    <view class="detail-section-header">
                        <text class="section-header-title">{{ i18n.wordRootTitle }}</text>
                        <view class="section-toggle-icon"></view>
                    </view>
                </view>

                <view class="h-8 w-full shrink-0"></view>
            </view>

            <!-- Bottom subtle hint mock -->
            <view v-if="!isRevealed && showQuizPrompt" class="flex items-center justify-center gap-1.5 py-1.5 px-5 shrink-0 pointer-events-none">
                <text class="text-[11px] text-[var(--ej-text-secondary)] opacity-75 tracking-wide font-normal">
                    💡 {{ i18n.quizPrompt }}
                </text>
            </view>
        </view>

        <!-- Details Section: Foreground Card Mode (Interactive) -->
        <view
          v-else
          class="relative flex flex-col justify-between flex-1 w-full min-h-0 box-border overflow-hidden cursor-pointer"
          @click="!isRevealed && emit('tap-card')"
          @touchstart="!isRevealed ? emit('touch-start', $event) : undefined"
          @touchmove="!isRevealed ? emit('touch-move', $event) : undefined"
          @touchend="!isRevealed ? emit('touch-end') : undefined"
        >
            <!-- Scrollable details list with camera lens blur/focus transition -->
            <scroll-view
              :key="'detail-' + word.w"
              scroll-y="true"
              :show-scrollbar="false"
              :enhanced="true"
              :scroll-top="scrollTop"
              class="card-scroll-view w-full flex-1 min-w-0 card-details-content"
              :class="{ 
                  'card-details-blurred': !isRevealed,
                  'card-details-focusing': isRevealing 
              }"
              @scroll="emit('scroll', $event)"
              @touchstart="emit('detail-touch-start', $event)"
              @touchmove="emit('detail-touch-move', $event)"
              @touchend="emit('detail-touch-end')"
            >
                <view class="px-5 box-border w-full">
                    <!-- Definitions -->
                    <view class="detail-section mb-3">
                        <view class="detail-section-header" @click.stop="emit('toggle-section', 'definitions')">
                            <text class="section-header-title">{{ i18n.definitionsTitle }}</text>
                            <view class="section-toggle-icon" :class="{ 'is-open': detailSections.definitions }"></view>
                        </view>
                        <view v-if="detailSections.definitions" class="detail-section-body">
                            <view class="example-list">
                                <view
                                  v-for="(item, index) in word?.t"
                                  :key="index"
                                  class="example-item"
                                >
                                    <view class="flex items-baseline gap-1.5">
                                        <text class="font-bold text-[13.5px] text-[var(--ej-color-brand)] shrink-0" v-if="formatDefinitionPos(item[0])">
                                            {{ formatDefinitionPos(item[0]) }}.
                                        </text>
                                        <text class="example-en-text font-bold">{{ formatDefinitionContent(item) }}</text>
                                    </view>
                                </view>
                            </view>
                        </view>
                    </view>

                    <!-- Secondary Meanings Section -->
                    <view v-if="word?.sm && word.sm.length > 0" class="detail-section mb-3">
                        <view class="detail-section-header" @click.stop="emit('toggle-section', 'secondary')">
                            <text class="section-header-title">{{ i18n.secondaryTitle }}</text>
                            <view class="section-toggle-icon" :class="{ 'is-open': detailSections.secondary }"></view>
                        </view>
                        <view v-if="detailSections.secondary" class="detail-section-body">
                            <view class="example-list">
                                <view
                                  v-for="(item, index) in word.sm"
                                  :key="index"
                                  class="example-item"
                                >
                                    <text class="example-en-text font-bold text-[var(--ej-color-brand)]">{{ item[0] }}</text>
                                    <text class="example-cn-text">{{ item[1] }}</text>
                                </view>
                            </view>
                        </view>
                    </view>

                    <!-- Collocations Section -->
                    <view v-if="word?.c && word.c.length > 0" class="detail-section mb-3">
                        <view class="detail-section-header" @click.stop="emit('toggle-section', 'collocations')">
                            <text class="section-header-title">{{ i18n.collocationsTitle }}</text>
                            <view class="section-toggle-icon" :class="{ 'is-open': detailSections.collocations }"></view>
                        </view>
                        <view v-if="detailSections.collocations" class="detail-section-body">
                            <view class="example-list">
                                <view
                                  v-for="(item, index) in word.c"
                                  :key="index"
                                  class="example-item"
                                >
                                    <text class="example-en-text font-bold">{{ item[0] }}</text>
                                    <text class="example-cn-text">{{ item[1] }}</text>
                                </view>
                            </view>
                        </view>
                    </view>

                    <!-- Confusing Words Section -->
                    <view v-if="word?.cf && word.cf.length > 0" class="detail-section mb-3">
                        <view class="detail-section-header" @click.stop="emit('toggle-section', 'confusing')">
                            <text class="section-header-title">{{ i18n.confusingTitle }}</text>
                            <view class="section-toggle-icon" :class="{ 'is-open': detailSections.confusing }"></view>
                        </view>
                        <view v-if="detailSections.confusing" class="detail-section-body">
                            <view class="example-list">
                                <view
                                  v-for="(item, index) in word.cf"
                                  :key="index"
                                  class="example-item"
                                >
                                    <text class="example-en-text font-bold">{{ item[0] }}</text>
                                    <text class="example-cn-text">{{ item[1] }}</text>
                                </view>
                            </view>
                        </view>
                    </view>

                    <!-- Examples / Translations -->
                    <view v-if="word?.s && word.s.length > 0" class="detail-section mb-3">
                        <view class="detail-section-header" @click.stop="emit('toggle-section', 'examples')">
                            <text class="section-header-title">{{ i18n.examplesTitle }}</text>
                            <view class="section-toggle-icon" :class="{ 'is-open': detailSections.examples }"></view>
                        </view>
                        <view v-if="detailSections.examples" class="detail-section-body">
                            <view class="example-list">
                                <view
                                  v-for="(item, index) in word.s"
                                  :key="index"
                                  class="example-item"
                                >
                                    <text class="example-en-text font-bold">{{ item[0] }}</text>
                                    <text class="example-cn-text">{{ item[1] }}</text>
                                </view>
                            </view>
                        </view>
                    </view>

                    <!-- Word Roots & Cognates Section -->
                    <view class="detail-section mb-3" v-if="parsedRoot || parsedFamily.length > 0">
                        <view class="detail-section-header" @click.stop="emit('toggle-section', 'anatomy')">
                            <text class="section-header-title">{{ i18n.wordRootTitle }}</text>
                            <view class="section-toggle-icon" :class="{ 'is-open': detailSections.anatomy }"></view>
                        </view>
                        <view v-if="detailSections.anatomy" class="detail-section-body">
                            <view class="example-list">
                                <!-- Core Root -->
                                <view class="example-item" v-if="parsedRoot">
                                    <text class="root-sub-title">{{ i18n.wordRootLabel }}</text>
                                    <text class="example-en-text font-bold">{{ parsedRoot.term }}</text>
                                    <text class="example-cn-text" v-if="parsedRoot.meaning">{{ parsedRoot.meaning }}</text>
                                </view>

                                <!-- Family Cognates -->
                                <view class="example-item" v-if="parsedFamily.length > 0">
                                    <text class="root-sub-title">{{ i18n.wordFamilyLabel }}</text>
                                    <view class="flex flex-col gap-2.5">
                                        <view v-for="(cog, cIndex) in parsedFamily" :key="cIndex" class="flex flex-col gap-0.5">
                                            <text class="example-en-text font-bold">{{ cog.term }}</text>
                                            <text class="example-cn-text" v-if="cog.meaning">{{ cog.meaning }}</text>
                                        </view>
                                    </view>
                                </view>
                            </view>
                        </view>
                    </view>

                    <!-- Bottom breathing spacer -->
                    <view class="h-8 w-full shrink-0"></view>
                </view>
            </scroll-view>

            <!-- Bottom subtle hint -->
            <view 
              v-if="!isRevealed && showQuizPrompt" 
              class="flex items-center justify-center gap-1.5 py-1.5 px-5 shrink-0 pointer-events-none"
            >
                <text class="text-[11px] text-[var(--ej-text-secondary)] opacity-75 tracking-wide font-normal">
                    💡 {{ i18n.quizPrompt }}
                </text>
            </view>
        </view>

        <!-- Footer Buttons (Fixed inside the bottom of the card) -->
        <view 
          class="mt-4 px-5 shrink-0"
          @touchstart="!isBackground ? emit('touch-start', $event) : undefined"
          @touchmove="!isBackground ? emit('touch-move', $event) : undefined"
          @touchend="!isBackground ? emit('touch-end') : undefined"
        >
            <view class="w-full">
                <view 
                  class="card-btn btn-primary text-base" 
                  hover-class="btn-primary-hover"
                  :hover-stay-time="100"
                  @click.stop="!isBackground && emit('next-word')"
                >
                    {{ i18n.nextBtn }}
                </view>
            </view>
        </view>
    </view>
</template>

<style>
:host {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    width: 100%;
    min-height: 0;
}

::-webkit-scrollbar,
.card-scroll-view::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    background: transparent !important;
    color: transparent !important;
}

/* Word Info Top Section */
.card-seq-badge {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    margin-top: 5px;
    user-select: none;
}

.card-seq-text {
    font-size: 13px;
    font-style: italic;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: var(--seq-color-light, #64748B);
    opacity: var(--seq-opacity, 0.25);
    line-height: 1.1;
    letter-spacing: 0.5px;
    transition: color 0.3s ease, opacity 0.3s ease;
}

.dark .card-seq-text {
    color: var(--seq-color-dark, #94A3B8);
}

.word-large-text {
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.15;
    word-break: normal;
    color: var(--ej-text-primary);
}

.word-large-text.word-size-md {
    font-size: 30px;
}

.word-large-text.word-size-sm {
    font-size: 26px;
}

.word-large-text.word-size-xs {
    font-size: 22px;
}

.phonetic-small-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--ej-text-muted);
    font-family: monospace;
    word-break: break-word;
}

.phonetic-speaker-box {
    position: relative;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    display: inline-block;
    vertical-align: middle;
    cursor: pointer;
    border-radius: 4px;
    transition: transform 0.15s ease;
}

.phonetic-speaker-box:active {
    transform: scale(0.9);
}

.speaker-horn,
.speaker-arc {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: block;
    background-color: var(--ej-color-brand);
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.speaker-horn {
    -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5'></polygon></svg>") no-repeat center / contain;
    mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5'></polygon></svg>") no-repeat center / contain;
    opacity: 0.85;
}

.speaker-arc.arc-1 {
    -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M15.54 8.46a5 5 0 0 1 0 7.07'></path></svg>") no-repeat center / contain;
    mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M15.54 8.46a5 5 0 0 1 0 7.07'></path></svg>") no-repeat center / contain;
    opacity: 0.85;
}

.speaker-arc.arc-2 {
    -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M19.07 4.93a10 10 0 0 1 0 14.14'></path></svg>") no-repeat center / contain;
    mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M19.07 4.93a10 10 0 0 1 0 14.14'></path></svg>") no-repeat center / contain;
    opacity: 0.85;
}

/* 播放态：原生弧形音波层层扩散动效（仿微信语音/扬声器扩散） */
.phonetic-speaker-box.playing .speaker-horn {
    opacity: 1;
    animation: horn-vibrate 0.9s ease-in-out infinite;
}

.phonetic-speaker-box.playing .arc-1 {
    animation: wave-arc-1 0.9s ease-in-out infinite;
}

.phonetic-speaker-box.playing .arc-2 {
    animation: wave-arc-2 0.9s ease-in-out infinite;
}

@keyframes horn-vibrate {
    0%, 100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.08);
    }
}

@keyframes wave-arc-1 {
    0%, 15% {
        opacity: 0.15;
        transform: scale(0.92);
    }
    35%, 80% {
        opacity: 1;
        transform: scale(1);
    }
    100% {
        opacity: 0.15;
        transform: scale(0.92);
    }
}

@keyframes wave-arc-2 {
    0%, 40% {
        opacity: 0.15;
        transform: scale(0.92);
    }
    60%, 85% {
        opacity: 1;
        transform: scale(1);
    }
    100% {
        opacity: 0.15;
        transform: scale(0.92);
    }
}

/* POS tags */
.pos-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    background-color: var(--ej-bg-pill);
    border: 1px solid var(--ej-border);
}

.pos-pill-text {
    font-size: 12px;
    font-weight: 700;
    color: var(--ej-text-secondary);
}

.card-divider {
    height: 1px;
    width: 100%;
    background-color: var(--ej-border);
    margin: 16px 0;
}

/* Scroll Area inside Card */
.card-scroll-view {
    overflow-y: auto;
    padding-right: 0;
    width: 100%;
    box-sizing: border-box;
    -webkit-mask-image: linear-gradient(to bottom, #000000 0%, #000000 calc(100% - 36px), rgba(0, 0, 0, 0.4) calc(100% - 14px), transparent 100%);
    mask-image: linear-gradient(to bottom, #000000 0%, #000000 calc(100% - 36px), rgba(0, 0, 0, 0.4) calc(100% - 14px), transparent 100%);
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

/* Card details camera lens focus and blur transitions */
.card-details-focusing {
    transition: filter 0.28s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.22s ease;
    will-change: filter, opacity;
}

.card-details-blurred {
    filter: blur(10px);
    opacity: 0.7;
    user-select: none;
    pointer-events: none;
    -webkit-mask-image: linear-gradient(to bottom, #000000 0%, #000000 45%, rgba(0, 0, 0, 0.6) 70%, rgba(0, 0, 0, 0.2) 88%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000000 0%, #000000 45%, rgba(0, 0, 0, 0.6) 70%, rgba(0, 0, 0, 0.2) 88%, transparent 100%);
}

.card-details-blurred .detail-section {
    background: transparent !important;
    border-color: transparent !important;
}

.detail-section {
    border-radius: 10px;
    overflow: hidden;
    background: var(--ej-bg-section);
    border: 1px solid var(--ej-border-section);
}

.detail-section-header {
    height: 44px;
    min-height: 44px;
    padding: 0 14px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.section-toggle-icon {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    position: relative;
    flex-shrink: 0;
    color: var(--ej-color-brand);
    background: var(--ej-color-brand-light);
    box-sizing: border-box;
}

/* 纯 CSS 几何绝对居中横线（减号） */
.section-toggle-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 1.8px;
    background-color: currentColor;
    border-radius: 1px;
}

/* 纯 CSS 几何绝对居中竖线（与横线结合为加号） */
.section-toggle-icon::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 1.8px;
    height: 10px;
    background-color: currentColor;
    border-radius: 1px;
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
}

/* 展开状态：仅保留横线减号，竖线平滑旋转淡出 */
.section-toggle-icon.is-open::after {
    transform: translate(-50%, -50%) rotate(90deg);
    opacity: 0;
}

.section-header-title {
    display: flex;
    align-items: center;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--ej-text-muted);
    margin: 0;
    line-height: 1;
    letter-spacing: 0.03em;
}

.detail-section-body {
    padding: 2px 14px 14px 14px;
    box-sizing: border-box;
}

.item-number-prefix {
    font-size: 13px;
    font-weight: 700;
    color: var(--ej-color-brand);
}

.item-definition-content {
    font-size: 15.5px;
    font-weight: 600;
    line-height: 1.5;
    color: var(--ej-text-primary);
}

/* Examples & Roots List Section */
.root-sub-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ej-text-sub);
    margin-bottom: 2px;
}

/* Examples Section */
.example-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.example-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.example-item + .example-item {
    padding-top: 10px;
    border-top: 1px dashed var(--ej-border-section);
}

.example-en-text {
    font-size: 14.5px;
    font-weight: 600;
    line-height: 1.45;
    color: var(--ej-text-primary);
}

.example-cn-text {
    font-size: 12.5px;
    line-height: 1.4;
    color: var(--ej-text-secondary);
}

.card-btn {
    border-radius: 12px;
    padding: 12px 20px;
    font-weight: 700;
    text-align: center;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-sizing: border-box;
}

.btn-primary {
    color: #FFFFFF;
    background-color: var(--ej-color-brand);
}

.btn-primary:active,
.btn-primary-hover {
    background-color: var(--ej-color-brand-active);
    transform: scale(0.985);
}

.collocations-tag-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 9999px;
    background-color: rgba(245, 158, 11, 0.15);
    color: #D97706;
    letter-spacing: 0.3px;
    line-height: 1.2;
}

.confusing-tag-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 9999px;
    background-color: rgba(99, 102, 241, 0.15);
    color: #4F46E5;
    letter-spacing: 0.3px;
    line-height: 1.2;
}
</style>
