export type Language = 'zh' | 'en';

export interface Translations {
    appTitle: string;
    quizPrompt: string;
    nextBtn: string;
    loadingText: string;
    
    definitionsTitle: string;
    wordRootTitle: string;
    wordRootLabel: string;
    wordFamilyLabel: string;
    examplesTitle: string;
    collocationsTitle: string;
    confusingTitle: string;
    secondaryTitle: string;
    
    settingsTitle: string;
    currentBookLabel: string;
    studyModeLabel: string;
    quizModeText: string;
    browseModeText: string;
    quizModeDesc: string;
    browseModeDesc: string;
    themeLabel: string;
    ttsLabel: string;
    ttsTitle: string;
    ttsEnabledHint: string;
    ttsDisabledHint: string;
    lightModeText: string;
    darkModeText: string;
    shareLabel: string;
    shareCardTitle: string;
    shareTimelineTitle: string;
    shareCardDesc: string;
    shareBadgeText: string;
    githubCardTitle: string;
    githubBadgeText: string;
    copyLinkText: string;
    githubCopiedMsg: string;
    
    firstWordAlert: string;
    loadFailAlert: string;
    subpackageFailAlert: string;
    bookCompletedAlert: string;
    
    langLabel: string;
    
    wordBookCountText: (count: number) => string;
    wordBookLabels: Record<string, string>;
}

export const getTranslations = (lang: Language): Translations => {
    const isZh = lang === 'zh';
    return {
        appTitle: isZh ? '随手词卡' : 'HandyCards',
        // Main card states
        quizPrompt: isZh ? '轻触查看释义' : 'Tap to reveal definitions',
        nextBtn: isZh ? '下一个' : 'Next',
        loadingText: isZh ? '加载中...' : 'Loading...',
        
        // Card detail section headers
        definitionsTitle: isZh ? '释义列表' : 'Definitions',
        wordRootTitle: isZh ? '同根派生' : 'Roots & Cognates',
        wordRootLabel: isZh ? '核心词根' : 'Core Root',
        wordFamilyLabel: isZh ? '同根派生词' : 'Cognates',
        examplesTitle: isZh ? '应用例句' : 'Examples',
        collocationsTitle: isZh ? '常用搭配' : 'Collocations',
        confusingTitle: isZh ? '形近辨析' : 'Confusing Pairs',
        secondaryTitle: isZh ? '熟词生义' : 'Tricky Meanings',
        
        // Drawer main settings
        settingsTitle: isZh ? '设置选项' : 'Settings',
        currentBookLabel: isZh ? '当前词书' : 'Current Wordbook',
        studyModeLabel: isZh ? '刷词模式' : 'Study Mode',
        quizModeText: isZh ? '自测模式' : 'Quiz Mode',
        browseModeText: isZh ? '速览模式' : 'Browse Mode',
        quizModeDesc: isZh ? '默认遮挡释义，轻触卡片查看' : 'Hide definitions, tap card to reveal',
        browseModeDesc: isZh ? '直接显示释义与例句，无需点击' : 'Directly show all definitions and examples',
        themeLabel: isZh ? '显示模式' : 'Display Mode',
        ttsLabel: isZh ? '发音设置' : 'Pronunciation',
        ttsTitle: isZh ? '单词发音' : 'Word Pronunciation',
        ttsEnabledHint: isZh ? '自动播放和点击发音' : 'Auto-play and tap pronunciation',
        ttsDisabledHint: isZh ? '已关闭，不请求在线发音' : 'Off. No online pronunciation request',
        lightModeText: isZh ? '☀️ 明亮模式' : '☀️ Light Mode',
        darkModeText: isZh ? '🌙 暗黑模式' : '🌙 Dark Mode',
        shareLabel: isZh ? '开源与分享' : 'Open Source & Share',
        shareCardTitle: isZh ? '微信分享二维码' : 'WeChat Share QR Code',
        shareTimelineTitle: isZh ? '随手词卡 · 不搞花里胡哨，纯粹离线翻卡背单词' : 'HandyCards · Pure & Offline Flashcard Vocabulary',
        shareCardDesc: isZh ? '点击查看高清大图，长按可识别或转发' : 'Tap to preview QR code, long press to scan or share',
        shareBadgeText: isZh ? '二维码' : 'QR Code',
        githubCardTitle: isZh ? 'GitHub 开源项目' : 'GitHub Repo',
        githubBadgeText: isZh ? 'CC 非商用' : 'CC BY-NC 4.0',
        copyLinkText: isZh ? '复制链接' : 'Copy',
        githubCopiedMsg: isZh ? '已复制链接' : 'Link copied',
        
        // Alerts & Messages
        firstWordAlert: isZh ? '已经是第一词了' : 'Already at the first word',
        loadFailAlert: isZh ? '加载词书失败' : 'Failed to load wordbook',
        subpackageFailAlert: isZh ? '词书分包下载失败，请检查网络后重试' : 'Subpackage download failed, please check network',
        bookCompletedAlert: isZh ? '🎉 恭喜背完整本！已开启新一轮洗牌' : '🎉 Congratulations! Shuffled for the next round',
        
        // Language Selector
        langLabel: isZh ? '界面语言' : 'Language',
        
        // Additional formatting & dictionary lists
        wordBookCountText: (count: number) => isZh ? `${count} 词` : `${count} words`,
        wordBookLabels: {
            'CET4luan_1': isZh ? '四级词汇' : 'CET-4 Vocab',
            'CET6luan_1': isZh ? '六级词汇' : 'CET-6 Vocab',
            'KaoYanluan_1': isZh ? '考研词汇' : 'Postgrad Vocab',
            'IELTSluan_2': isZh ? '雅思词汇' : 'IELTS Vocab'
        }
    };
};
