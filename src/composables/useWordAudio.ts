import { ref, onUnmounted } from 'vue';

declare const wx: any;

/**
 * Composable for managing word speech audio playback across MP-Weixin and H5 platforms.
 * Handles request versioning to prevent race conditions, temporary file management on WeChat,
 * Base64 fallback on H5, and audio instance lifecycle management.
 */
export function useWordAudio() {
    const playFlag = ref(false);
    let activeAudioContext: UniApp.InnerAudioContext | any = null;
    let activeTempFilePath: string | null = null;
    let activeRequestTask: UniApp.RequestTask | null = null;
    let speechRequestVersion = 0;

    const cleanupActiveTempFile = () => {
        if (activeTempFilePath && typeof wx !== 'undefined' && wx.getFileSystemManager) {
            try {
                wx.getFileSystemManager().unlink({
                    filePath: activeTempFilePath,
                    fail: () => {}
                });
            } catch {
                // ignore
            }
            activeTempFilePath = null;
        }
    };

    const stopAudio = () => {
        if (activeRequestTask) {
            try {
                activeRequestTask.abort();
            } catch {
                // ignore
            }
            activeRequestTask = null;
        }
        if (activeAudioContext) {
            try {
                activeAudioContext.stop();
                activeAudioContext.destroy();
            } catch (e) {
                // ignore
            }
            activeAudioContext = null;
        }
        cleanupActiveTempFile();
        playFlag.value = false;
    };

    const playArrayBufferAudio = (data: ArrayBuffer, logMsg: string, requestVersion: number, onPlayEnd?: () => void) => {
        if (requestVersion !== speechRequestVersion) {
            return;
        }
        if (activeAudioContext) {
            try {
                activeAudioContext.stop();
                activeAudioContext.destroy();
            } catch (e) {
                // ignore
            }
            activeAudioContext = null;
        }
        cleanupActiveTempFile();
        playFlag.value = true;

        const handleEnd = () => {
            playFlag.value = false;
            if (onPlayEnd) onPlayEnd();
        };

        // WeChat Mini Program File System
        if (typeof wx !== 'undefined' && wx.getFileSystemManager && wx.env && wx.env.USER_DATA_PATH) {
            const fs = wx.getFileSystemManager();
            cleanupActiveTempFile();
            const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_speech_${Date.now()}.mp3`;
            activeTempFilePath = tempFilePath;

            fs.writeFile({
                filePath: tempFilePath,
                data: data,
                encoding: 'binary',
                success: () => {
                    if (requestVersion !== speechRequestVersion) {
                        fs.unlink({ filePath: tempFilePath, fail: () => {} });
                        if (activeTempFilePath === tempFilePath) {
                            activeTempFilePath = null;
                        }
                        return;
                    }
                    const audioContext = uni.createInnerAudioContext();
                    activeAudioContext = audioContext;
                    audioContext.autoplay = true;
                    audioContext.src = tempFilePath;
                    audioContext.onPlay(() => {
                        playFlag.value = true;
                        console.log(logMsg);
                    });
                    const cleanup = () => {
                        fs.unlink({
                            filePath: tempFilePath,
                            fail: (err: any) => console.warn('删除临时音频文件失败:', err)
                        });
                        if (activeTempFilePath === tempFilePath) {
                            activeTempFilePath = null;
                        }
                        if (activeAudioContext === audioContext) {
                            activeAudioContext = null;
                        }
                        audioContext.destroy();
                        handleEnd();
                    };
                    audioContext.onEnded(cleanup);
                    audioContext.onError((err) => {
                        console.error(logMsg + ' 播放失败:', err.errMsg, err.errCode);
                        cleanup();
                    });
                },
                fail: (err: any) => {
                    console.error('写入临时音频文件失败:', err);
                    if (activeTempFilePath === tempFilePath) {
                        activeTempFilePath = null;
                    }
                    handleEnd();
                }
            });
        } else {
            // H5 fallback via Base64
            const base64String = uni.arrayBufferToBase64(data);
            const audioContext = (uni as any).createInnerAudioContext({
                useWebAudioImplement: true,
            });
            activeAudioContext = audioContext;
            audioContext.autoplay = true;
            audioContext.src = 'data:audio/mpeg;base64,' + base64String;
            audioContext.onPlay(() => {
                playFlag.value = true;
                console.log(logMsg);
            });
            const cleanup = () => {
                if (activeAudioContext === audioContext) {
                    activeAudioContext = null;
                }
                audioContext.destroy();
                handleEnd();
            };
            audioContext.onEnded(cleanup);
            audioContext.onError((err: any) => {
                console.error(logMsg + ' 播放失败 (Base64):', err.errMsg, err.errCode);
                cleanup();
            });
        }
    };

    const playWord = (word?: string, ttsDisabled = false) => {
        if (ttsDisabled) {
            stopAudio();
            return;
        }
        if (!word) return;

        const currentWord = word;
        const thisVersion = ++speechRequestVersion;
        stopAudio();
        playFlag.value = true;

        activeRequestTask = uni.request({
            url: 'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(currentWord) + '&type=1',
            header: {},
            responseType: 'arraybuffer',
            success: (res) => {
                activeRequestTask = null;
                if (thisVersion !== speechRequestVersion) {
                    return;
                }
                if (res.statusCode !== 200) {
                    console.error('音频获取失败, 状态码:', res.statusCode);
                    playFlag.value = false;
                    return;
                }
                playArrayBufferAudio(res.data as ArrayBuffer, '播放单词 (有道)', thisVersion, () => {
                    playFlag.value = false;
                });
            },
            fail: (err) => {
                activeRequestTask = null;
                if (thisVersion === speechRequestVersion) {
                    // 过滤主动 abort 导致的错误日志，避免控制台刷屏
                    if (err?.errMsg && !err.errMsg.includes('abort')) {
                        console.error('音频获取失败:', err);
                    }
                    playFlag.value = false;
                }
            }
        });
    };

    onUnmounted(() => {
        stopAudio();
    });

    return {
        playFlag,
        playWord,
        stopAudio
    };
}
