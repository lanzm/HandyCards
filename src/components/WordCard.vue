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
import { 
    getWordAnatomy, 
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
    lang: 'zh',
    detailSections: () => ({
        definitions: true,
        examples: false,
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

const currentWordAnatomy = computed(() => {
    if (props.isBackground) return null;
    const w = props.word?.w ?? '';
    if (!w) return null;
    const anatomy = getWordAnatomy(w, props.bookValue, props.lang);
    return {
        ...anatomy,
        wordLength: w.length,
    };
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
            <view class="flex justify-between items-start gap-2">
                <view class="flex flex-col gap-1 flex-1 min-w-0 pr-1">
                    <text 
                      class="word-large-text" 
                      @click.stop="!isBackground && !ttsDisabled && emit('play-audio')"
                    >{{ word.w }}</text>
                    <view 
                      class="inline-flex flex-wrap items-center gap-2" 
                      @click.stop="!isBackground && !ttsDisabled && emit('play-audio')"
                    >
                        <text class="phonetic-small-text">/{{ word.p }}/</text>
                        <text 
                          v-if="!ttsDisabled" 
                          class="phonetic-speaker-inline" 
                          :class="{ 'playing': playFlag && !isBackground }"
                        ></text>
                    </view>
                </view>

                <!-- Top-right minimalist card sequence badge (#158) -->
                <view v-if="word?.cardIndex" class="card-seq-badge shrink-0">
                    <text class="card-seq-text">#{{ word.cardIndex }}</text>
                </view>
            </view>
            
            <!-- Part of Speech Tabs/Pills -->
            <view class="flex flex-wrap gap-2 mt-3.5" v-if="word?.t && word.t.length > 0">
                <view 
                  v-for="(item, index) in getUniquePos(word.t)" 
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
                        <text class="section-toggle-icon">-</text>
                    </view>
                    <view class="detail-section-body">
                        <view class="flex flex-col gap-2.5">
                            <view
                              v-for="(item, index) in word.t"
                              :key="index"
                              class="flex flex-col gap-0.5"
                            >
                                <text class="item-number-prefix">
                                    {{ index + 1 }}.<template v-if="formatDefinitionPos(item[0])"> ({{ formatDefinitionPos(item[0]) }})</template>
                                </text>
                                <text class="item-definition-content">{{ formatDefinitionContent(item) }}</text>
                            </view>
                        </view>
                    </view>
                </view>

                <!-- Examples Mock -->
                <view v-if="word?.s && word.s.length > 0" class="detail-section mb-3">
                    <view class="detail-section-header">
                        <text class="section-header-title">{{ i18n.examplesTitle }}</text>
                        <text class="section-toggle-icon">+</text>
                    </view>
                </view>

                <!-- Word Anatomy Mock -->
                <view v-if="word?.w" class="detail-section mb-3">
                    <view class="detail-section-header">
                        <text class="section-header-title">{{ i18n.wordAnatomyTitle }}</text>
                        <text class="section-toggle-icon">+</text>
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
                            <text class="section-toggle-icon">{{ detailSections.definitions ? '-' : '+' }}</text>
                        </view>
                        <view v-if="detailSections.definitions" class="detail-section-body">
                            <view class="flex flex-col gap-2.5">
                            <view
                              v-for="(item, index) in word?.t"
                              :key="index"
                              class="flex flex-col gap-0.5"
                            >
                                <text class="item-number-prefix">
                                    {{ index + 1 }}.<template v-if="formatDefinitionPos(item[0])"> ({{ formatDefinitionPos(item[0]) }})</template>
                                </text>
                                <text class="item-definition-content">{{ formatDefinitionContent(item) }}</text>
                            </view>
                            </view>
                        </view>
                    </view>

                    <!-- Examples / Translations -->
                    <view v-if="word?.s && word.s.length > 0" class="detail-section mb-3">
                        <view class="detail-section-header" @click.stop="emit('toggle-section', 'examples')">
                            <text class="section-header-title">{{ i18n.examplesTitle }}</text>
                            <text class="section-toggle-icon">{{ detailSections.examples ? '-' : '+' }}</text>
                        </view>
                        <view v-if="detailSections.examples" class="detail-section-body">
                            <view class="example-list">
                            <view
                              v-for="(item, index) in word.s"
                              :key="index"
                              class="example-item"
                            >
                                <text class="example-en-text">{{ item[0] }}</text>
                                <text class="example-cn-text">{{ item[1] }}</text>
                            </view>
                            </view>
                        </view>
                    </view>

                    <!-- Word Anatomy Section -->
                    <view class="detail-section mb-3" v-if="word?.w">
                        <view class="detail-section-header" @click.stop="emit('toggle-section', 'anatomy')">
                            <text class="section-header-title">{{ i18n.wordAnatomyTitle }}</text>
                            <text class="section-toggle-icon">{{ detailSections.anatomy ? '-' : '+' }}</text>
                        </view>
                        <view v-if="detailSections.anatomy" class="detail-section-body">
                            <view class="flex flex-wrap gap-2">
                            <view class="anatomy-card-item">
                                <text class="anatomy-item-label">{{ i18n.difficultyLabel }}</text>
                                <view class="flex items-center gap-0.5">
                                    <text
                                      v-for="star in currentWordAnatomy?.difficulty"
                                      :key="'star-' + star"
                                      class="text-sm"
                                    >⭐</text>
                                </view>
                            </view>
                            <view class="anatomy-card-item">
                                <text class="anatomy-item-label">{{ i18n.syllablesLabel }}</text>
                                <text class="text-sm font-semibold text-[var(--ej-text-primary)]">{{ i18n.syllablesCountText(currentWordAnatomy?.syllables ?? 1) }}</text>
                            </view>
                            <view class="anatomy-card-item full-width" v-if="currentWordAnatomy?.suffixInfo">
                                <text class="anatomy-item-label">{{ i18n.suffixLabel }}</text>
                                <view class="flex items-start gap-2">
                                    <text class="suffix-badge">{{ currentWordAnatomy.suffixInfo.suffix }}</text>
                                    <text class="suffix-meaning">{{ currentWordAnatomy.suffixInfo.meaning }}</text>
                                </view>
                            </view>
                            <view class="anatomy-card-item full-width" v-else-if="currentWordAnatomy">
                                <text class="anatomy-item-label">{{ i18n.lengthLabel }}</text>
                                <text class="text-sm font-semibold text-[var(--ej-text-primary)]">{{ i18n.wordLengthText(currentWordAnatomy.wordLength, currentWordAnatomy.vowelsCount, currentWordAnatomy.consonantsCount) }}</text>
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
    margin-top: 2px;
    user-select: none;
}

.card-seq-text {
    font-size: 12px;
    font-weight: 500;
    font-style: italic;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: var(--ej-text-primary);
    opacity: 0.22;
    line-height: 1;
    letter-spacing: 0.5px;
}

.word-large-text {
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
    word-break: normal;
    color: var(--ej-text-primary);
}

.phonetic-small-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--ej-text-muted);
    font-family: monospace;
    word-break: break-word;
}

.phonetic-speaker-inline {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    display: inline-block;
    vertical-align: middle;
    margin-left: 0;
    background-color: var(--ej-color-brand);
    -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5'></polygon><path d='M15.54 8.46a5 5 0 0 1 0 7.07'></path><path d='M19.07 4.93a10 10 0 0 1 0 14.14'></path></svg>") no-repeat center / contain;
    mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5'></polygon><path d='M15.54 8.46a5 5 0 0 1 0 7.07'></path><path d='M19.07 4.93a10 10 0 0 1 0 14.14'></path></svg>") no-repeat center / contain;
    opacity: 0.85;
    transition: all 0.2s;
}

.phonetic-speaker-inline.playing {
    transform: scale(1.2);
    opacity: 1;
}

.playing {
    position: relative;
    animation: speaker-pulse 0.6s ease-in-out infinite;
}

.playing::after {
    content: '';
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    bottom: -1px;
    border-radius: 50%;
    border: 2px solid var(--ej-color-brand);
    opacity: 0.8;
    animation: speaker-ripple 0.6s cubic-bezier(0.25, 0, 0, 1) infinite;
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
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 700;
    line-height: 1;
    flex-shrink: 0;
    color: var(--ej-color-brand);
    background: var(--ej-color-brand-light);
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

/* Word Anatomy Section */
.anatomy-card-item {
    flex: 1 1 calc(50% - 4px);
    display: flex;
    flex-direction: column;
    padding: 8px 10px;
    border-radius: 8px;
    box-sizing: border-box;
    background: var(--ej-border-section);
    border: 1px solid var(--ej-border-section);
}

.anatomy-card-item.full-width {
    flex: 1 1 100%;
}

.anatomy-item-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
    color: var(--ej-text-sub);
}

.suffix-badge {
    font-size: 11px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 6px;
    background: var(--ej-color-brand);
    color: #FFFFFF;
    flex-shrink: 0;
}

.suffix-meaning {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--ej-text-primary);
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

.btn-primary:active {
    background-color: var(--ej-color-brand-active);
}
</style>
