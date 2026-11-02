<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick, getCurrentInstance } from 'vue'
// import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
// import { SHARE_TITLE, DEFAULT_SHARE_COVER, renderShareCardOnDemand } from "@/utils/shareCard";
import commonUtil from "@/utils/commonUtil";
import { wordBooksData, createWordRandomizer } from "@/utils/wordbooks";
import { getInitialTheme, setNavigationBarTheme, type ThemeMode } from "@/utils/themeUtil";
import { getTranslations, type Language } from "@/utils/i18n";
import { getWordAnatomy, getUniquePos, getPosIcon, formatDefinitionPos, formatDefinitionContent } from "@/utils/anatomy";
import SettingsDrawer from "@/components/SettingsDrawer.vue";
import { useWordAudio } from "@/composables/useWordAudio";
import { useFloatingGear } from "@/composables/useFloatingGear";
import type { WordItem, WordBookMeta, WordAnatomy } from "@/types/word";

const isDark = ref<ThemeMode>(getInitialTheme());
const wordObj = ref<WordItem | null>(null);
const scrollTop = ref(0);
const detailScrollTop = ref(0);
const hasDetailOverflow = ref(false);
const wordBook = ref<WordBookMeta | null>(null);
const studyMode = ref<'quiz' | 'browse'>('quiz');
const knowFlag = ref(false); // Controls whether the translations are revealed
const isRevealing = ref(false); // Controls camera focus animation exclusively on intentional tap
const cardTapCount = ref(0);
const showQuizPrompt = computed(() => cardTapCount.value < 5);
const preventClick = ref(false);
const { playFlag, playWord, stopAudio } = useWordAudio();
const ttsDisabled = ref(false);
const loading = ref(false);
const showDrawer = ref(false);
const {
    gearX,
    gearY,
    gearReady,
    isHiding,
    dockSide,
    onGearChange,
    onGearTouchStart,
    onGearTouchEnd
} = useFloatingGear(showDrawer);
type DetailSectionKey = 'definitions' | 'examples' | 'anatomy';

const createDefaultDetailSections = () => ({
    definitions: true,
    examples: false,
    anatomy: false
});

const detailSections = ref<Record<DetailSectionKey, boolean>>(createDefaultDetailSections());
const instance = getCurrentInstance();

const lang = ref<Language>('zh');
const i18n = computed(() => getTranslations(lang.value));

const setLang = (newLang: Language) => {
    lang.value = newLang;
    uni.setStorageSync('lang', newLang);
};

// Memory cache for all words in the current book
const wordList = ref<WordItem[]>([]);

// Backing-history tracking list and index pointer for session
const historyWords = ref<WordItem[]>([]);
const historyIndex = ref(-1);

// Preloaded next word to show in the background card when we are at the end of history
const preloadedNextWord = ref<WordItem | null>(null);

// Background card display states
const bgWordObj = ref<WordItem | null>(null);
const bgKnowFlag = ref(false);
const bgCardTransitionClass = ref('');

const wordRandomizer = createWordRandomizer();
const pickRandomWord = (): WordItem | null => wordRandomizer.pick(wordList.value);

// Swiping down states (when dragging previous word from top)
const isSwipingDownActive = ref(false);
const screenHeight = ref(800);

// Card swipe transition state
const cardTransitionClass = ref('');

// Touch drag card state
const startX = ref(0);
const startY = ref(0);
const cardY = ref(0); // Drag Y offset
const isSwiping = ref(false);

// Dynamic inline card style while dragging
const cardStyle = computed(() => {
    if (isSwiping.value) {
        if (cardY.value < 0) {
            // Dragging UP
            return `transform: translate3d(0, ${cardY.value}px, 0); z-index: 10; transition: none !important;`;
        } else {
            // Dragging DOWN
            if (isSwipingDownActive.value) {
                const progress = Math.min(cardY.value / 80, 1);
                const scale = 1.0 - progress * 0.06;
                const translateY = progress * 18;
                const opacity = 1.0 - progress * 0.12;
                return `transform: scale(${scale}) translate3d(0, ${translateY}px, 0); opacity: ${opacity}; z-index: 5; transition: none !important;`;
            } else {
                return `transform: translate3d(0, 0, 0); z-index: 10; transition: none !important;`;
            }
        }
    }
    return 'z-index: 10;';
});

const bgCardStyle = computed(() => {
    if (isSwiping.value) {
        const threshold = 80;
        if (cardY.value < 0) {
            // Dragging UP
            const progress = Math.min(Math.abs(cardY.value) / threshold, 1);
            const scale = 0.88 + progress * 0.12;
            const translateY = 32 - progress * 32;
            const opacity = 0.7 + progress * 0.3;
            return `transform: scale(${scale}) translate3d(0, ${translateY}px, 0); opacity: ${opacity}; z-index: 5; transition: none !important;`;
        } else {
            // Dragging DOWN
            if (isSwipingDownActive.value) {
                const translateY = -screenHeight.value + cardY.value;
                return `transform: translate3d(0, ${translateY}px, 0); opacity: 1; z-index: 10; transition: none !important;`;
            }
        }
    }
    return '';
});

const updatePreloadedNextWord = () => {
    if (wordList.value.length === 0) return;
    if (!preloadedNextWord.value) {
        preloadedNextWord.value = pickRandomWord();
    }
};

const getNextWord = () => {
    if (historyIndex.value < historyWords.value.length - 1) {
        return historyWords.value[historyIndex.value + 1];
    }
    if (!preloadedNextWord.value) {
        updatePreloadedNextWord();
    }
    return preloadedNextWord.value;
};

const syncBgCard = () => {
    if (isSwipingDownActive.value) {
        return;
    }
    bgWordObj.value = getNextWord();
    bgKnowFlag.value = studyMode.value === 'browse';
};

const currentWordAnatomy = computed(() => {
    const w = wordObj.value?.w ?? '';
    const anatomy = getWordAnatomy(w, wordBook.value?.value, lang.value);
    return {
        ...anatomy,
        wordLength: w.length,
    };
});

const nextWord = () => {
    nextWordDirectional('up');
};

const handleCardTap = () => {
    if (preventClick.value) return;
    isRevealing.value = true;
    knowFlag.value = true;
    if (cardTapCount.value < 5) {
        cardTapCount.value += 1;
        uni.setStorageSync('cardTapCount', cardTapCount.value);
    }
    setTimeout(() => {
        isRevealing.value = false;
    }, 320);
};

const updateNavBarColor = () => {
    setNavigationBarTheme(isDark.value);
};

const setTheme = (theme: 'dark' | 'light') => {
    isDark.value = theme;
    uni.setStorageSync('theme', theme);
    updateNavBarColor();
};

const setStudyMode = (mode: 'quiz' | 'browse') => {
    studyMode.value = mode;
    uni.setStorageSync('studyMode', mode);
    knowFlag.value = mode === 'browse';
    syncBgCard();
};


const setTtsDisabled = (disabled: boolean) => {
    ttsDisabled.value = disabled;
    uni.setStorageSync('ttsDisabled', disabled);
    if (disabled) {
        stopAudio();
    }
};

const setTtsEnabled = (enabled: boolean) => {
    setTtsDisabled(!enabled);
};

const loadWordBook = () => {
    wordBook.value = commonUtil.getCurrWordBook();
    wordRandomizer.reset();
    wordList.value = [];
    historyWords.value = [];
    historyIndex.value = -1;
    preloadedNextWord.value = null;

    const bookVal = wordBook.value?.value;
    const data = bookVal ? wordBooksData[bookVal] : null;
    if (data && data.length > 0) {
        wordList.value = data;
        randomWord();
        updatePreloadedNextWord();
        syncBgCard();
    } else {
        commonUtil.msg(i18n.value.loadFailAlert, "error");
    }
    loading.value = false;
};

// Raw, non-animated word loading (used on initialization)
const randomWord = () => {
    knowFlag.value = studyMode.value === 'browse';
    if (wordList.value.length === 0) {
        loadWordBook();
        return;
    }
    
    if (historyWords.value.length === 0) {
        const firstWord = pickRandomWord();
        if (firstWord) {
            historyWords.value.push(firstWord);
            historyIndex.value = 0;
            wordObj.value = firstWord;
        }
    } else {
        wordObj.value = historyWords.value[historyIndex.value];
    }
    getSpeech();
};

// Animated card swipe transition in a specified direction (up or down)
const nextWordDirectional = (dir: 'up' | 'down') => {
    if (dir === 'down') {
        if (historyIndex.value <= 0) {
            commonUtil.msg(i18n.value.firstWordAlert);
            return;
        }
        
        isSwipingDownActive.value = true;
        bgWordObj.value = wordObj.value;
        bgKnowFlag.value = knowFlag.value;
        
        // Go back in history
        historyIndex.value -= 1;
        wordObj.value = historyWords.value[historyIndex.value];
        knowFlag.value = true;
    } else {
        // Go forward in history or load a new word
        isSwipingDownActive.value = false;
        
        if (historyIndex.value < historyWords.value.length - 1) {
            historyIndex.value += 1;
        } else {
            if (preloadedNextWord.value) {
                historyWords.value.push(preloadedNextWord.value);
                preloadedNextWord.value = null;
            } else {
                if (wordList.value.length === 0) {
                    loadWordBook();
                    return;
                }
                const newWord = pickRandomWord();
                if (newWord) {
                    historyWords.value.push(newWord);
                }
            }
            historyIndex.value = historyWords.value.length - 1;
        }
    }

    isRevealing.value = false;
    if (dir === 'up') {
        knowFlag.value = studyMode.value === 'browse';
    }

    cardTransitionClass.value = dir === 'up' ? 'card-slide-out-up' : 'card-slide-in-down';
    bgCardTransitionClass.value = dir === 'up' ? 'bg-card-to-active' : 'bg-card-to-back';
    
    setTimeout(() => {
        // Change content and reset hidden state mid-transition
        if (dir === 'up') {
            knowFlag.value = studyMode.value === 'browse';
            wordObj.value = historyWords.value[historyIndex.value];
            
            // Instantly teleport the card back to center without animation
            cardTransitionClass.value = 'card-reset-center';
            bgCardTransitionClass.value = 'bg-card-to-back-instant';
            
            setTimeout(() => {
                cardTransitionClass.value = '';
                bgCardTransitionClass.value = '';
                isSwipingDownActive.value = false;
                updatePreloadedNextWord();
                syncBgCard();
            }, 30);
        } else {
            // When going down, card is already in center, so just clear classes directly
            cardTransitionClass.value = '';
            bgCardTransitionClass.value = '';
            isSwipingDownActive.value = false;
            updatePreloadedNextWord();
            syncBgCard();
        }
        getSpeech();
    }, 250);
};

const getSpeech = () => {
    playWord(wordObj.value?.w, ttsDisabled.value);
};

const changeWordBook = (item: WordBookMeta) => {
    uni.setStorageSync('wordBook', item.value);
    wordBook.value = item;
    loadWordBook();
    showDrawer.value = false;
};

const updateDetailOverflow = () => {
    nextTick(() => {
        const query = uni.createSelectorQuery();
        const scopedQuery = instance?.proxy ? query.in(instance.proxy as any) : query;

        scopedQuery.select('.detail-scroll-view').boundingClientRect();
        scopedQuery.select('.detail-scroll-content').boundingClientRect();
        scopedQuery.exec((rects: any[]) => {
            const viewportRect = rects?.[0];
            const contentRect = rects?.[1];

            if (!viewportRect || !contentRect) {
                hasDetailOverflow.value = false;
                return;
            }

            hasDetailOverflow.value = contentRect.height > viewportRect.height + 2;
        });
    });
};

const toggleDetailSection = (section: DetailSectionKey) => {
    detailSections.value[section] = !detailSections.value[section];
    updateDetailOverflow();
};



// Card touch drag event handlers
const onCardTouchStart = (e: any) => {
    preventClick.value = false;
    if (e.touches && e.touches[0]) {
        startX.value = e.touches[0].clientX;
        startY.value = e.touches[0].clientY;
        cardY.value = 0;
        isSwiping.value = false;
    }
};

const onCardTouchMove = (e: any) => {
    if (!e.touches || !e.touches[0]) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - startX.value;
    const deltaY = currentY - startY.value;
    
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        preventClick.value = true;
    }
    
    if (!isSwiping.value) {
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
            isSwiping.value = true;
            
            // Check if we are swiping DOWN (previous word)
            if (deltaY > 0) {
                if (historyIndex.value > 0) {
                    isSwipingDownActive.value = true;
                    bgWordObj.value = historyWords.value[historyIndex.value - 1];
                    bgKnowFlag.value = true;
                } else {
                    isSwiping.value = false;
                    commonUtil.msg(i18n.value.firstWordAlert);
                }
            } else {
                isSwipingDownActive.value = false;
            }
        }
    }
    
    if (isSwiping.value) {
        cardY.value = deltaY;
    }
};

const onCardTouchEnd = () => {
    if (!isSwiping.value) {
        isSwiping.value = false;
        isSwipingDownActive.value = false;
        return;
    }
    
    const threshold = 80; // Swipe offset threshold
    
    if (cardY.value < -threshold) {
        // Swiped UP: Next word
        isSwiping.value = false;
        nextWordDirectional('up');
    } else if (cardY.value > threshold && isSwipingDownActive.value) {
        // Swiped DOWN: Previous word
        isSwiping.value = false;
        
        cardTransitionClass.value = 'active-card-to-back-instant';
        bgCardTransitionClass.value = 'prev-card-to-active-instant';
        
        setTimeout(() => {
            isRevealing.value = false;
            historyIndex.value -= 1;
            wordObj.value = historyWords.value[historyIndex.value];
            knowFlag.value = true;
            cardTransitionClass.value = 'card-reset-center';
            bgCardTransitionClass.value = 'bg-card-reset-back';
            isSwipingDownActive.value = false;
            cardY.value = 0;
            getSpeech();
            updatePreloadedNextWord();
            syncBgCard();
            
            setTimeout(() => {
                cardTransitionClass.value = '';
                bgCardTransitionClass.value = '';
            }, 30);
        }, 200);
    } else {
        // Revert/Cancel swipe
        isSwiping.value = false;
        
        if (isSwipingDownActive.value) {
            cardTransitionClass.value = '';
            bgCardTransitionClass.value = '';
            isSwipingDownActive.value = false;
            cardY.value = 0;
            syncBgCard();
        } else {
            cardY.value = 0;
        }
    }
};

const onDetailTouchStart = (e: any) => {
    if (hasDetailOverflow.value) return;
    onCardTouchStart(e);
};

const onDetailTouchMove = (e: any) => {
    if (hasDetailOverflow.value) return;
    onCardTouchMove(e);
};

const onDetailTouchEnd = () => {
    if (hasDetailOverflow.value) return;
    onCardTouchEnd();
};

const handleGearClick = () => {
    showDrawer.value = true;
};

const onDetailScroll = (e: any) => {
    detailScrollTop.value = e.detail?.scrollTop || 0;
};

const resetCardScrollTop = () => {
    scrollTop.value = detailScrollTop.value || 1;
    nextTick(() => {
        scrollTop.value = 0;
        detailScrollTop.value = 0;
    });
};

// Reset card scroll position to top and update dynamic share cover when switching words
watch(() => wordObj.value?.w, () => {
    resetCardScrollTop();
    detailSections.value = createDefaultDetailSections();
    updateDetailOverflow();
    // if (newWord) {
    //     updateShareCard(newWord, wordObj.value?.p);
    // }
});

watch(knowFlag, (visible) => {
    if (visible) {
        updateDetailOverflow();
    } else {
        hasDetailOverflow.value = false;
    }
});

const initData = () => {
    try {
        const sys = uni.getSystemInfoSync();
        screenHeight.value = sys.windowHeight || 800;
    } catch (e) {
        screenHeight.value = 800;
    }

    // Explicitly reset drawer states on initialization to prevent simulator cache issues
    showDrawer.value = false;

    isDark.value = getInitialTheme();
    const savedLang = uni.getStorageSync('lang');
    if (savedLang === 'zh' || savedLang === 'en') {
        lang.value = savedLang;
    }
    const savedStudyMode = uni.getStorageSync('studyMode');
    if (savedStudyMode === 'quiz' || savedStudyMode === 'browse') {
        studyMode.value = savedStudyMode;
    }
    knowFlag.value = studyMode.value === 'browse';
    const savedTapCount = Number(uni.getStorageSync('cardTapCount'));
    cardTapCount.value = Number.isFinite(savedTapCount) && savedTapCount >= 0 ? savedTapCount : 0;
    const savedTtsDisabled = uni.getStorageSync('ttsDisabled');
    ttsDisabled.value = savedTtsDisabled === true || savedTtsDisabled === 'true';
    updateNavBarColor();

    wordBook.value = commonUtil.getCurrWordBook();
    loadWordBook();
}

const onSystemThemeChange = (res: any) => {
    const savedTheme = uni.getStorageSync('theme');
    // If user hasn't explicitly set a preference, follow system
    if (savedTheme !== 'dark' && savedTheme !== 'light') {
        if (res.theme === 'dark' || res.theme === 'light') {
            isDark.value = res.theme;
            updateNavBarColor();
        }
    }
};

onMounted(() => {
    initData();
    uni.onThemeChange(onSystemThemeChange);
});

onUnmounted(() => {
    stopAudio();
    uni.offThemeChange(onSystemThemeChange);
});

/*
// --- WeChat Share Hooks --- [Temporarily disabled]
// 微信分享给好友 / 群聊（纯按需懒生成：仅在点击分享时动态绘制当前单词专属 5:4 高清海报）
onShareAppMessage(() => {
    const word = wordObj.value?.w;
    const phonetic = wordObj.value?.p;

    const promise = renderShareCardOnDemand(instance?.proxy, word, phonetic)
        .then((imageUrl) => ({
            title: SHARE_TITLE,
            path: '/pages/index/index',
            imageUrl,
        }))
        .catch(() => ({
            title: SHARE_TITLE,
            path: '/pages/index/index',
            imageUrl: DEFAULT_SHARE_COVER,
        }));

    return {
        title: SHARE_TITLE,
        path: '/pages/index/index',
        promise,
        imageUrl: DEFAULT_SHARE_COVER,
    };
});

// 微信分享到朋友圈（官方规范：朋友圈为 1:1 正方形缩略图，不传 imageUrl 微信自动使用小程序官方 1:1 Logo 图标）
onShareTimeline(() => {
    return {
        title: SHARE_TITLE,
        query: '',
    };
});
*/
</script>

<template>
  <!-- Full screen Movable Area wrapper -->
  <movable-area class="page-container" :class="[isDark]">
      <!-- Background Card (visible underneath when current card slides up) -->
      <view 
        v-if="bgWordObj && !loading"
        class="app-card-bg" 
        :class="[bgCardTransitionClass]"
        :style="bgCardStyle"
      >
          <!-- Word & Audio Section (Fixed) -->
          <view v-if="bgWordObj" class="px-5 mb-3 shrink-0">
              <view class="flex justify-between items-center">
                  <view class="flex flex-col gap-1 flex-1 min-w-0">
                      <text class="word-large-text">{{ bgWordObj.w }}</text>
                      <view class="inline-flex items-center gap-2">
                          <text class="phonetic-small-text">/{{ bgWordObj.p }}/</text>
                          <text v-if="!ttsDisabled" class="phonetic-speaker-inline"></text>
                      </view>
                  </view>
              </view>
              
              <!-- Part of Speech Tabs/Pills -->
              <view class="flex flex-wrap gap-2 mt-3.5" v-if="bgWordObj?.t && bgWordObj.t.length > 0">
                  <view 
                    v-for="(item, index) in getUniquePos(bgWordObj.t)" 
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

          <!-- Scrollable details container (Background card) -->
          <view 
            v-if="bgWordObj" 
            class="relative flex flex-col justify-between flex-1 w-full min-h-0 box-border overflow-hidden"
          >
              <view 
                class="w-full flex-1 px-5 box-border select-none pointer-events-none overflow-hidden card-details-content"
                :class="{ 'card-details-blurred': !bgKnowFlag }"
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
                                v-for="(item, index) in bgWordObj.t"
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

                  <!-- Examples -->
                  <view v-if="bgWordObj?.s && bgWordObj.s.length > 0" class="detail-section mb-3">
                      <view class="detail-section-header">
                          <text class="section-header-title">{{ i18n.examplesTitle }}</text>
                          <text class="section-toggle-icon">+</text>
                      </view>
                  </view>

                  <!-- Word Anatomy Section -->
                  <view v-if="bgWordObj?.w" class="detail-section mb-3">
                      <view class="detail-section-header">
                          <text class="section-header-title">{{ i18n.wordAnatomyTitle }}</text>
                          <text class="section-toggle-icon">+</text>
                      </view>
                  </view>

                  <!-- Bottom breathing spacer -->
                  <view class="h-8 w-full shrink-0"></view>
              </view>

              <!-- Bottom subtle hint mock (visible when !bgKnowFlag && showQuizPrompt) -->
              <view v-if="!bgKnowFlag && showQuizPrompt" class="flex items-center justify-center gap-1.5 py-1.5 px-5 shrink-0 pointer-events-none">
                  <text class="text-[11px] text-[var(--ej-text-secondary)] opacity-75 tracking-wide font-normal">
                      💡 {{ i18n.quizPrompt }}
                  </text>
              </view>
          </view>

          <!-- Footer Buttons (Static mock) -->
          <view class="mt-4 px-5 shrink-0">
              <view class="w-full">
                  <view class="card-btn btn-primary text-base">{{ i18n.nextBtn }}</view>
              </view>
          </view>
      </view>

      <!-- Large Container Card with Swipe Gestures and Dynamic Inline styles -->
      <view 
        class="app-card" 
        :class="[cardTransitionClass]"
        :style="cardStyle"
      >
          <view v-if="loading || !wordObj" class="flex flex-col h-full w-full box-border flex-1 px-5">
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

          <!-- Word & Audio Section (Fixed) -->
          <view 
            v-else
            class="px-5 mb-3 shrink-0"
            @touchstart="onCardTouchStart"
            @touchmove="onCardTouchMove"
            @touchend="onCardTouchEnd"
          >
              <view class="flex justify-between items-center">
                  <view class="flex flex-col gap-1 flex-1 min-w-0">
                      <text class="word-large-text" @click.stop="!ttsDisabled && getSpeech()">{{ wordObj.w }}</text>
                      <view class="inline-flex items-center gap-2" @click.stop="!ttsDisabled && getSpeech()">
                          <text class="phonetic-small-text">/{{ wordObj.p }}/</text>
                          <text v-if="!ttsDisabled" class="phonetic-speaker-inline" :class="{ 'playing': playFlag }"></text>
                      </view>
                  </view>
              </view>
              
              <!-- Part of Speech Tabs/Pills -->
              <view class="flex flex-wrap gap-2 mt-3.5" v-if="wordObj?.t && wordObj.t.length > 0">
                  <view 
                    v-for="(item, index) in getUniquePos(wordObj.t)" 
                    :key="index"
                    class="pos-pill"
                  >
                      <text class="text-[13px]">{{ getPosIcon(item) }}</text>
                      <text class="pos-pill-text">{{ item }}</text>
                  </view>
              </view>
          </view>

          <!-- Divider -->
          <view v-if="wordObj && !loading" class="px-5 w-full box-border shrink-0">
              <view class="card-divider"></view>
          </view>

          <!-- Details container with real content camera focus blur -->
          <view
            v-if="wordObj && !loading"
            class="relative flex flex-col justify-between flex-1 w-full min-h-0 box-border overflow-hidden cursor-pointer"
            @click="!knowFlag && handleCardTap()"
            @touchstart="!knowFlag ? onCardTouchStart($event) : undefined"
            @touchmove="!knowFlag ? onCardTouchMove($event) : undefined"
            @touchend="!knowFlag ? onCardTouchEnd() : undefined"
          >
              <!-- Scrollable details list with camera lens blur/focus transition -->
              <scroll-view
                :key="'detail-' + wordObj.w"
                scroll-y="true"
                :scroll-top="scrollTop"
                class="card-scroll-view w-full flex-1 min-w-0 card-details-content"
                :class="{ 
                    'card-details-blurred': !knowFlag,
                    'card-details-focusing': isRevealing 
                }"
                @scroll="onDetailScroll"
                @touchstart="onDetailTouchStart"
                @touchmove="onDetailTouchMove"
                @touchend="onDetailTouchEnd"
              >
                  <view class="px-5 box-border w-full">
                      <!-- Definitions -->
                      <view class="detail-section mb-3">
                          <view class="detail-section-header" @click.stop="toggleDetailSection('definitions')">
                              <text class="section-header-title">{{ i18n.definitionsTitle }}</text>
                              <text class="section-toggle-icon">{{ detailSections.definitions ? '-' : '+' }}</text>
                          </view>
                          <view v-if="detailSections.definitions" class="detail-section-body">
                              <view class="flex flex-col gap-2.5">
                              <view
                                v-for="(item, index) in wordObj?.t"
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
                      <view v-if="wordObj?.s && wordObj.s.length > 0" class="detail-section mb-3">
                          <view class="detail-section-header" @click.stop="toggleDetailSection('examples')">
                              <text class="section-header-title">{{ i18n.examplesTitle }}</text>
                              <text class="section-toggle-icon">{{ detailSections.examples ? '-' : '+' }}</text>
                          </view>
                          <view v-if="detailSections.examples" class="detail-section-body">
                              <view class="example-list">
                              <view
                                v-for="(item, index) in wordObj.s"
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
                      <view class="detail-section mb-3" v-if="wordObj?.w">
                          <view class="detail-section-header" @click.stop="toggleDetailSection('anatomy')">
                              <text class="section-header-title">{{ i18n.wordAnatomyTitle }}</text>
                              <text class="section-toggle-icon">{{ detailSections.anatomy ? '-' : '+' }}</text>
                          </view>
                          <view v-if="detailSections.anatomy" class="detail-section-body">
                              <view class="flex flex-wrap gap-2">
                              <view class="anatomy-card-item">
                                  <text class="anatomy-item-label">{{ i18n.difficultyLabel }}</text>
                                  <view class="flex items-center gap-0.5">
                                      <text
                                        v-for="star in currentWordAnatomy.difficulty"
                                        :key="'star-' + star"
                                        class="text-sm"
                                      >⭐</text>
                                  </view>
                              </view>
                              <view class="anatomy-card-item">
                                  <text class="anatomy-item-label">{{ i18n.syllablesLabel }}</text>
                                  <text class="text-sm font-semibold text-[var(--ej-text-primary)]">{{ i18n.syllablesCountText(currentWordAnatomy.syllables) }}</text>
                              </view>
                              <view class="anatomy-card-item full-width" v-if="currentWordAnatomy.suffixInfo">
                                  <text class="anatomy-item-label">{{ i18n.suffixLabel }}</text>
                                  <view class="flex items-start gap-2">
                                      <text class="suffix-badge">{{ currentWordAnatomy.suffixInfo.suffix }}</text>
                                      <text class="suffix-meaning">{{ currentWordAnatomy.suffixInfo.meaning }}</text>
                                  </view>
                              </view>
                              <view class="anatomy-card-item full-width" v-else>
                                  <text class="anatomy-item-label">{{ i18n.lengthLabel }}</text>
                                  <text class="text-sm font-semibold text-[var(--ej-text-primary)]">{{ i18n.wordLengthText(currentWordAnatomy.wordLength, currentWordAnatomy.vowelsCount, currentWordAnatomy.consonantsCount) }}</text>
                              </view>
                              </view>
                          </view>
                      </view>

                      <!-- Bottom breathing spacer so last content line is fully visible and above feathering mask -->
                      <view class="h-8 w-full shrink-0"></view>
                  </view>
              </scroll-view>

              <!-- Bottom subtle hint (Clean, natural, visible only in quiz mode when !knowFlag && showQuizPrompt) -->
              <view 
                v-if="!knowFlag && showQuizPrompt" 
                class="flex items-center justify-center gap-1.5 py-1.5 px-5 shrink-0 pointer-events-none"
              >
                  <text class="text-[11px] text-[var(--ej-text-secondary)] opacity-75 tracking-wide font-normal">
                      💡 {{ i18n.quizPrompt }}
                  </text>
              </view>
          </view>

          <!-- Footer Buttons (Fixed inside the bottom of the card) -->
          <view 
            v-if="wordObj && !loading"
            class="mt-4 px-5 shrink-0"
            @touchstart="onCardTouchStart"
            @touchmove="onCardTouchMove"
            @touchend="onCardTouchEnd"
          >
              <view class="w-full">
                  <view class="card-btn btn-primary text-base" @click.stop="nextWord()">
                      {{ i18n.nextBtn }}
                  </view>
              </view>
          </view>
      </view>

      <!-- Draggable floating gear settings button that snaps to edge and auto-hides -->
      <movable-view
        v-if="gearReady"
        class="floating-gear" 
        direction="all" 
        :x="gearX" 
        :y="gearY"
        :animation="true"
        @change="onGearChange"
        @touchstart="onGearTouchStart"
        @touchend="onGearTouchEnd"
      >
        <view 
            class="gear-btn flex-center" 
            :class="{ 
                'gear-hidden': isHiding,
                'dock-left': isHiding && dockSide === 'left',
                'dock-right': isHiding && dockSide === 'right'
            }"
            @click="handleGearClick"
        >
            <text class="gear-icon">⚙</text>
        </view>
      </movable-view>

      <!-- Settings Drawer Component -->
      <SettingsDrawer
        v-model:show="showDrawer"
        :is-dark="isDark"
        :lang="lang"
        :study-mode="studyMode"
        :tts-disabled="ttsDisabled"
        :current-book-value="wordBook?.value || ''"
        :i18n="i18n"
        :word-book-list="commonUtil.wordBookList"
        @change-book="changeWordBook"
        @change-study-mode="setStudyMode"
        @change-theme="setTheme"
        @change-lang="setLang"
        @change-tts="setTtsEnabled"
      />

      <!-- Offscreen Canvas for dynamic share card generation (Temporarily disabled)
      <canvas 
        type="2d" 
        id="shareCanvas" 
        style="position: fixed; left: -9999px; top: -9999px; width: 500px; height: 400px; pointer-events: none;"
      ></canvas>
      -->

  </movable-area>
</template>

<style>
/* Global tap-highlight reset for mobile webviews to prevent white/grey flashing on tap */
view, text, button, image, scroll-view, movable-area, movable-view {
    -webkit-tap-highlight-color: transparent !important;
}

/* Page background and container (Acting as movable area) */
.page-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    overflow: hidden;
    padding: 0;
    transition: background-color 0.3s, color 0.3s;
    background-color: var(--ej-bg-page);
    color: var(--ej-text-primary);
}

/* App Card container - wraps everything */
.app-card {
    width: calc(100% - 40px);
    max-width: 400px;
    height: 92vh;
    border-radius: 18px;
    padding: 28px 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
    overflow: hidden;
    transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s, transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s ease, color 0.3s;
    background-color: #FFFFFF;
    background-color: var(--ej-bg-card);
    border: 1px solid var(--ej-border-card);
    box-shadow: var(--ej-shadow-card);
    color: var(--ej-text-primary);
}

.dark .app-card {
    background-color: #18181B;
}

/* Background Stack Card */
.app-card-bg {
    position: absolute;
    top: 4vh;
    left: 20px;
    right: 20px;
    margin: 0 auto;
    width: calc(100% - 40px);
    max-width: 400px;
    height: 92vh;
    border-radius: 18px;
    padding: 28px 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
    overflow: hidden;
    background-color: #FFFFFF;
    background-color: var(--ej-bg-card-bg);
    border: 1px solid var(--ej-border-card);
    box-shadow: var(--ej-shadow-card-bg);
    color: var(--ej-text-primary);
    
    /* Layered Stack appearance default */
    transform: scale(0.94) translateY(24px);
    opacity: 0.85;
    z-index: 5;
    pointer-events: none;
}

.dark .app-card-bg {
    background-color: #18181B;
}

/* Word Info Top Section */
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
}

.phonetic-speaker-inline {
    width: 18px;
    height: 18px;
    display: inline-block;
    vertical-align: middle;
    margin-left: 6px;
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
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE 10+ */
}

.card-scroll-view::-webkit-scrollbar {
    display: none;
    width: 0 !important;
    height: 0 !important;
    background: transparent;
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

/* Custom premium thin scrollbar styling for drawers/other pages */
::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
}

::-webkit-scrollbar-thumb {
    background-color: rgba(15, 23, 42, 0.15);
    border-radius: 10px;
}

.dark ::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
}

::-webkit-scrollbar-track {
    background-color: transparent;
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

/* Definitions List */
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



.btn-primary {
    color: #FFFFFF;
    background-color: var(--ej-color-brand);
}
.btn-primary:active {
    background-color: var(--ej-color-brand-active);
}

.btn-secondary {
    background-color: var(--ej-bg-btn-secondary);
    border-color: var(--ej-border);
    color: var(--ej-text-secondary);
}
.btn-secondary:active {
    background-color: var(--ej-bg-btn-secondary-active);
}



.flex-center {
    display: flex;
    align-items: center;
    justify-content: center;
}
.flex-col-center {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
}

/* Draggable settings gear view */
.floating-gear {
    width: 50px;
    height: 50px;
    z-index: 999;
}

.gear-btn {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: var(--ej-bg-card);
    border: 1px solid var(--ej-border);
    box-shadow: var(--ej-shadow-gear);
    cursor: pointer;
    transition: opacity 0.3s, transform 0.3s, background-color 0.2s;
    opacity: 0.9;
}

.gear-btn.gear-hidden {
    opacity: 0.35;
}

.gear-btn.dock-left {
    transform: translate3d(-25px, 0, 0) !important;
}

.gear-btn.dock-right {
    transform: translate3d(25px, 0, 0) !important;
}

.gear-btn:active {
    transform: scale(0.92);
    opacity: 1 !important;
}

.gear-icon {
    font-size: 24px;
    color: var(--ej-text-muted);
}

</style>
