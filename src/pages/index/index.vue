<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick, getCurrentInstance } from 'vue'
// import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
// import { SHARE_TITLE, DEFAULT_SHARE_COVER, renderShareCardOnDemand } from "@/utils/shareCard";
import commonUtil from "@/utils/commonUtil";
import { wordBooksData, createWordRandomizer } from "@/utils/wordbooks";
import { getInitialTheme, setNavigationBarTheme, type ThemeMode } from "@/utils/themeUtil";
import { getTranslations, type Language } from "@/utils/i18n";
import SettingsDrawer from "@/components/SettingsDrawer.vue";
import WordCard from "@/components/WordCard.vue";
import { useWordAudio } from "@/composables/useWordAudio";
import { useFloatingGear } from "@/composables/useFloatingGear";
import type { WordItem, WordBookMeta, DetailSectionKey } from "@/types/word";

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
    onGearTouchEnd,
    wakeUpGear
} = useFloatingGear(showDrawer);
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
    wakeUpGear();
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
          <WordCard
            :word="bgWordObj"
            :is-background="true"
            :is-revealed="bgKnowFlag"
            :show-quiz-prompt="showQuizPrompt"
            :tts-disabled="ttsDisabled"
            :i18n="i18n"
            :book-value="wordBook?.value || ''"
            :lang="lang"
          />
      </view>

      <!-- Large Container Card with Swipe Gestures and Dynamic Inline styles -->
      <view 
        class="app-card" 
        :class="[cardTransitionClass]"
        :style="cardStyle"
      >
          <WordCard
            :word="wordObj"
            :loading="loading"
            :is-background="false"
            :is-revealed="knowFlag"
            :is-revealing="isRevealing"
            :show-quiz-prompt="showQuizPrompt"
            :tts-disabled="ttsDisabled"
            :play-flag="playFlag"
            :i18n="i18n"
            :book-value="wordBook?.value || ''"
            :lang="lang"
            :scroll-top="scrollTop"
            :detail-sections="detailSections"
            @play-audio="getSpeech"
            @tap-card="handleCardTap"
            @next-word="nextWord"
            @toggle-section="toggleDetailSection"
            @scroll="onDetailScroll"
            @touch-start="onCardTouchStart"
            @touch-move="onCardTouchMove"
            @touch-end="onCardTouchEnd"
            @detail-touch-start="onDetailTouchStart"
            @detail-touch-move="onDetailTouchMove"
            @detail-touch-end="onDetailTouchEnd"
          />
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

::-webkit-scrollbar,
.card-scroll-view::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    background: transparent !important;
    color: transparent !important;
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

.app-card > word-card,
.app-card-bg > word-card,
word-card,
.word-card-host {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    width: 100%;
    min-height: 0;
    justify-content: space-between;
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
