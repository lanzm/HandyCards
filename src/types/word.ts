export interface WordRootData {
    r?: string;              // 核心词根及含义，如 "tract (拉、拖)"
    f?: string[];            // 同根派生词族，如 ["contract (合同)", "distract (分散)"]
}

export interface WordItem {
    w: string;                  // 单词文本
    p: string;                  // 音标
    t: [string, string][];      // [词性, 释义][]
    s?: [string, string][];     // [英文例句, 中文翻译][]
    r?: WordRootData;           // 词根词缀及同根词族
    cardIndex?: number;         // 词卡在洗牌序列中的编号 (1 ~ N)
}

export interface WordBookMeta {
    label: string;
    value: string;
    count: number;              // 词书词汇量
}

export type DetailSectionKey = 'definitions' | 'examples' | 'anatomy';
