<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import commonUtil from "@/utils/commonUtil";
import { getInitialTheme, setNavigationBarTheme, type ThemeMode } from "@/utils/themeUtil";
import { getTranslations, type Language } from "@/utils/i18n";
import SettingsDrawer from "@/components/SettingsDrawer.vue";
import WordCard from "@/components/WordCard.vue";
import { useWordAudio } from "@/composables/useWordAudio";
import { useFloatingGear } from "@/composables/useFloatingGear";
import { useWordDeck } from "@/composables/useWordDeck";
import { useCardSwipe } from "@/composables/useCardSwipe";
import type { DetailSectionKey } from "@/types/word";

// Theme & Locale
const isDark = ref<ThemeMode>(getInitialTheme());
const lang = ref<Language>('zh');
const i18n = computed(() => getTranslations(lang.value));

const updateNavBarColor = () => {
    setNavigationBarTheme(isDark.value);
};

const setTheme = (theme: 'dark' | 'light') => {
    isDark.value = theme;
    uni.setStorageSync('theme', theme);
    updateNavBarColor();
};

const setLang = (newLang: Language) => {
    lang.value = newLang;
    uni.setStorageSync('lang', newLang);
};

// Audio TTS
const { playFlag, playWord, stopAudio } = useWordAudio();
const ttsDisabled = ref(false);

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

const getSpeech = () => {
    playWord(wordObj.value?.w, ttsDisabled.value);
};

// Study Mode & Quiz Focus
const studyMode = ref<'quiz' | 'browse'>('quiz');
const knowFlag = ref(false);
const isRevealing = ref(false);
const cardTapCount = ref(0);
const showQuizPrompt = computed(() => cardTapCount.value < 5);

const createDefaultDetailSections = (): Record<DetailSectionKey, boolean> => ({
    definitions: true,
    examples: false,
    collocations: false,
    confusing: false,
    secondary: false,
    anatomy: false
});
const detailSections = ref<Record<DetailSectionKey, boolean>>(createDefaultDetailSections());

const toggleDetailSection = (section: DetailSectionKey) => {
    detailSections.value[section] = !detailSections.value[section];
};

const setStudyMode = (mode: 'quiz' | 'browse') => {
    studyMode.value = mode;
    uni.setStorageSync('studyMode', mode);
    knowFlag.value = mode === 'browse';
    syncBgCard();
};

const handleCardTap = () => {
    if (preventClick.value) return;
    isRevealing.value = true;
    knowFlag.value = true;
    cardTapCount.value++;
    uni.setStorageSync('cardTapCount', cardTapCount.value);
};

// Drawer & Floating Gear
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

const handleGearClick = () => {
    wakeUpGear();
    showDrawer.value = true;
};

// Word Deck State Machine
const wordDeck = useWordDeck({
    studyMode,
    knowFlag,
    isRevealing,
    i18n,
    onWordChange: (word) => {
        resetCardScrollTop();
        playWord(word?.w, ttsDisabled.value);
    }
});

const {
    wordBook,
    wordObj,
    bgWordObj,
    bgKnowFlag,
    loading,
    cardTransitionClass,
    bgCardTransitionClass,
    loadWordBook,
    changeWordBook,
    nextWord,
    syncBgCard
} = wordDeck;

// Gesture Swipe Engine
const cardSwipe = useCardSwipe({
    historyIndex: wordDeck.historyIndex,
    historyWords: wordDeck.historyWords,
    wordObj: wordDeck.wordObj,
    bgWordObj: wordDeck.bgWordObj,
    bgKnowFlag: wordDeck.bgKnowFlag,
    knowFlag,
    isRevealing,
    isSwipingDownActive: wordDeck.isSwipingDownActive,
    cardTransitionClass: wordDeck.cardTransitionClass,
    bgCardTransitionClass: wordDeck.bgCardTransitionClass,
    i18n,
    nextWordDirectional: wordDeck.nextWordDirectional,
    syncBgCard: wordDeck.syncBgCard,
    updatePreloadedNextWord: wordDeck.updatePreloadedNextWord,
    onSwipeDownSuccess: () => {
        resetCardScrollTop();
        playWord(wordDeck.wordObj.value?.w, ttsDisabled.value);
    }
});

const {
    cardStyle,
    bgCardStyle,
    preventClick,
    scrollTop,
    onCardTouchStart,
    onCardTouchMove,
    onCardTouchEnd,
    onDetailTouchStart,
    onDetailTouchMove,
    onDetailTouchEnd,
    onDetailScroll,
    resetCardScrollTop
} = cardSwipe;

// Watch word change to reset scroll & detail sections
watch(() => wordObj.value?.w, () => {
    resetCardScrollTop();
    detailSections.value = createDefaultDetailSections();
});

// App lifecycle & initialization
const initData = () => {
    try {
        const sys = uni.getSystemInfoSync();
        cardSwipe.screenHeight.value = sys.windowHeight || 800;
    } catch (e) {
        cardSwipe.screenHeight.value = 800;
    }

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
    loadWordBook();
};

const onSystemThemeChange = (res: UniApp.OnThemeChangeCallbackResult) => {
    const savedTheme = uni.getStorageSync('theme');
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
            class="word-card-host"
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
            class="word-card-host"
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

</style>
