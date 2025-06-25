// 全局变量
let chapterFiles = [];
let characterFiles = [];
let currentChapterIndex = -1;
let currentCharacterIndex = -1;
let isCharacterChapter = false;
let isSidebarCollapsed = false;
let preloading = false;
let chapterListCache = null;
let characterListCache = null;
let isInitialLoadComplete = false; 

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    initAll();
});

function saveBookmark() {
    if (isCharacterChapter) {
        localStorage.setItem('lastCharacterIndex', currentCharacterIndex);
        localStorage.setItem('lastChapter', characterFiles[currentCharacterIndex].path);
    } else {
        localStorage.setItem('lastChapterIndex', currentChapterIndex);
        localStorage.setItem('lastChapter', chapterFiles[currentChapterIndex].path);
    }
    
    localStorage.setItem('isCharacterChapter', isCharacterChapter);
    localStorage.setItem('scrollPosition', window.scrollY);
    
    console.log('阅读进度已自动保存');
}

async function initAll() {
    try {
        isInitialLoadComplete = false;
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.style.display = 'flex';
        
        const errorBoundary = document.getElementById('errorBoundary');
        if (errorBoundary) errorBoundary.style.display = 'none';
        
        // 使用Promise.allSettled代替Promise.all，避免一个失败导致全部失败
        const results = await Promise.allSettled([
            loadChapterList(),
            loadCharacterList()
        ]);
        
        // 检查是否有失败的任务
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
            console.error('部分加载失败:', failed);
            // 不是所有失败都需要显示错误
        }
        
        initBookmark();
        initChapterNavigation();
        initSidebarToggle();
        initDownloadButton();
        addPreloadNotice();
        
        isInitialLoadComplete = true;
        
    } catch (error) {
        console.error('初始化失败:', error);
        // 只有在初始加载未完成时才显示全屏错误
        if (!isInitialLoadComplete) {
            showError('初始化失败，请刷新重试', true);
        }
    } finally {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}


function addPreloadNotice() {
    const preloadNotice = document.createElement('div');
    preloadNotice.className = 'preload-notice';
    preloadNotice.textContent = '正在预加载下一章...';
    document.body.appendChild(preloadNotice);
}

function initDownloadButton() {
    const downloadBtn = document.getElementById('downloadAllBtn');
    if (!downloadBtn) return;
    
    downloadBtn.addEventListener('click', function() {
        const cloudUrl = 'https://wwgj.lanzoum.com/iwOhu2zii94h';
        const isConfirmed = confirm('即将跳转到下载页面，是否继续？');
        if (isConfirmed) {
            window.open(cloudUrl, '_blank');
        }
    });
}

// 显示/隐藏加载状态
function showPreloadNotice() {
    const notice = document.querySelector('.preload-notice');
    if (notice) notice.classList.add('show');
    setTimeout(() => notice?.classList.remove('show'), 2000);
}

function showSkeletonLoader() {
    const skeleton = document.querySelector('.skeleton-loader');
    if (skeleton) skeleton.style.display = 'block';
}

function hideSkeletonLoader() {
    const skeleton = document.querySelector('.skeleton-loader');
    if (skeleton) skeleton.style.display = 'none';
}

// 带重试的fetch函数
async function fetchWithRetry(url, retries = 3, delay = 1000) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, retries - 1, delay * 2);
        }
        throw error;
    }
}

async function fetchTextWithRetry(url, retries = 3, delay = 1000) {
    try {
        const response = await fetch(url);
        
        // 更严格的响应验证
        if (!response.ok) {
            // 检查是否是404错误
            if (response.status === 404) {
                throw new Error(`文件未找到: ${url}`);
            }
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        
        const content = await response.text();
        
        // 验证内容是否有效
        if (content.includes('404: Not Found')) {
            throw new Error('请求的资源不存在');
        }
        
        return content;
    } catch (error) {
        if (retries > 0) {
            console.log(`重试 ${url} (剩余 ${retries} 次)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchTextWithRetry(url, retries - 1, delay * 2);
        }
        throw error;
    }
}

// 侧边栏切换功能
function initSidebarToggle() {
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.querySelector('.sidebar');
    const container = document.querySelector('.container');
    
    if (!toggleBtn || !sidebar || !container) {
        console.error('侧边栏元素未找到');
        return;
    }

    toggleBtn.addEventListener('click', function() {
        isSidebarCollapsed = !isSidebarCollapsed;
        
        if (isSidebarCollapsed) {
            sidebar.classList.add('collapsed');
            container.classList.add('with-collapsed-sidebar');
            toggleBtn.textContent = '显示';
        } else {
            sidebar.classList.remove('collapsed');
            container.classList.remove('with-collapsed-sidebar');
            toggleBtn.textContent = '隐藏';
        }
        
        localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
    });
    
    // 初始化侧边栏状态
    const savedSidebarState = localStorage.getItem('sidebarCollapsed');
    if (savedSidebarState === 'true') {
        isSidebarCollapsed = true;
        sidebar.classList.add('collapsed');
        container.classList.add('with-collapsed-sidebar');
        toggleBtn.textContent = '显示';
    }
}

// 章节列表功能
async function loadChapterList() {
    // 检查缓存
    const cachedList = localStorage.getItem('chapterListCache');
    if (cachedList) {
        try {
            chapterListCache = JSON.parse(cachedList);
            renderChapterList(chapterListCache);
            return;
        } catch (e) {
            console.error('解析章节缓存失败:', e);
        }
    }

    try {
        const files = await fetchWithRetry('https://api.github.com/repos/LYC-gh/lyc-gh.github.io/contents/chapters');
        chapterListCache = removeDuplicates(files); // 去重处理
        localStorage.setItem('chapterListCache', JSON.stringify(chapterListCache));
        renderChapterList(chapterListCache);
    } catch (error) {
        console.error('加载章节列表失败:', error);
        showError('加载章节列表失败，请刷新重试');
    }
}

// 人物设定列表功能
async function loadCharacterList() {
    // 检查缓存
    const cachedList = localStorage.getItem('characterListCache');
    if (cachedList) {
        try {
            characterListCache = JSON.parse(cachedList);
            renderCharacterList(characterListCache);
            return;
        } catch (e) {
            console.error('解析人物设定缓存失败:', e);
        }
    }

    try {
        const files = await fetchWithRetry('https://api.github.com/repos/LYC-gh/lyc-gh.github.io/contents/characters');
        characterListCache = removeDuplicates(files); // 去重处理
        localStorage.setItem('characterListCache', JSON.stringify(characterListCache));
        renderCharacterList(characterListCache);
    } catch (error) {
        console.error('加载人物设定列表失败:', error);
        showError('加载人物设定列表失败，请刷新重试');
    }
}

// 去重函数 - 解决重复第一章问题
function removeDuplicates(files) {
    const seen = new Set();
    return files.filter(file => {
        const key = file.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// 渲染章节列表
function renderChapterList(files) {
    const chapterList = document.getElementById('chapterList');
    if (!chapterList) return;
    
    chapterList.innerHTML = ''; // 清空现有内容
    
    chapterFiles = files
        .filter(file => file.name.endsWith('.txt'))
        .sort((a, b) => {
            // 提取章节数字
            const numA = extractChapterNumber(a.name);
            const numB = extractChapterNumber(b.name);
            
            // 如果都能提取到数字，按数字排序
            if (numA !== null && numB !== null) {
                return numA - numB;
            }
            
            // 否则按名称排序
            return a.name.localeCompare(b.name);
        });
    
    chapterFiles.forEach((file, index) => {
        const chapterItem = document.createElement('div');
        chapterItem.className = 'chapter-item';
        chapterItem.textContent = file.name.replace('.txt', '');
        
        chapterItem.addEventListener('click', () => {
            isCharacterChapter = false;
            loadChapter(file.path, index);
        });
        
        chapterList.appendChild(chapterItem);
    });
    
    updateChapterProgress();
}

function extractChapterNumber(name) {
    // 匹配"第一章"、"第1章"等格式
    const match = name.match(/第([一二三四五六七八九十百千万零\d]+)章/);
    if (match) {
        const numStr = match[1];
        
        // 如果是中文数字，转换为阿拉伯数字
        if (/[一二三四五六七八九十百千万零]/.test(numStr)) {
            return chineseToNumber(numStr);
        }
        
        // 如果是阿拉伯数字，直接转换
        return parseInt(numStr, 10);
    }
    
    // 如果没有匹配到章节格式，返回null
    return null;
}

// 中文数字转阿拉伯数字
function chineseToNumber(chineseNum) {
    const chineseNumMap = {
        '零': 0,
        '一': 1,
        '二': 2,
        '三': 3,
        '四': 4,
        '五': 5,
        '六': 6,
        '七': 7,
        '八': 8,
        '九': 9,
        '十': 10,
        '百': 100,
        '千': 1000,
        '万': 10000
    };
    
    let result = 0;
    let temp = 0;
    let prev = 0;
    
    for (let i = 0; i < chineseNum.length; i++) {
        const char = chineseNum[i];
        const num = chineseNumMap[char];
        
        if (num === undefined) {
            return null; // 包含非数字字符
        }
        
        if (num < 10) {
            temp = num;
        } else if (num === 10) {
            result += (temp === 0 ? 1 : temp) * num;
            temp = 0;
        } else {
            temp = temp === 0 ? num : temp * num;
            result += temp;
            temp = 0;
        }
    }
    
    return result + temp;
}

// 渲染人物设定列表
function renderCharacterList(files) {
    const characterList = document.getElementById('characterList');
    if (!characterList) return;
    
    characterList.innerHTML = ''; // 清空现有内容
    
    characterFiles = files
        .filter(file => file.name.endsWith('.txt'))
        .sort((a, b) => a.name.localeCompare(b.name));
    
    characterFiles.forEach((file, index) => {
        const characterItem = document.createElement('div');
        characterItem.className = 'character-item';
        characterItem.textContent = file.name.replace('.txt', '');
        
        characterItem.addEventListener('click', () => {
            isCharacterChapter = true;
            loadCharacter(file.path, index);
        });
        
        characterList.appendChild(characterItem);
    });
    
    updateChapterProgress();
}

// 加载章节内容
async function loadChapter(path, index = -1) {
    try {
        showSkeletonLoader();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        const cacheKey = `chapter_${path.replace(/\//g, '_')}`;
        const cachedContent = localStorage.getItem(cacheKey);
        
        if (cachedContent) {
            displayChapterContent(path, cachedContent, index);
            return;
        }
        
        const errorBoundary = document.getElementById('errorBoundary');
        if (errorBoundary) errorBoundary.style.display = 'none';
        
        // 添加超时机制
        const content = await Promise.race([
            fetchTextWithRetry(`https://raw.githubusercontent.com/LYC-gh/lyc-gh.github.io/main/${path}`),
            new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), 10000)) // 10秒超时
        ]);
        
        if (!content || content.trim() === '') {
            throw new Error('获取的内容为空');
        }
        
        localStorage.setItem(cacheKey, content);
        displayChapterContent(path, content, index);
        preloadAdjacentChapters(index);
        
    } catch (error) {
        console.error('加载章节内容失败:', error);
        const currentContent = document.getElementById('chapterContent').innerHTML;
        const hasContent = currentContent && currentContent.trim() !== '';
        showError('章节加载失败: ' + error.message, !hasContent);
    } finally {
        hideSkeletonLoader();
    }
}


// 加载人物设定内容
async function loadCharacter(path, index = -1) {
    try {
        showSkeletonLoader();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        const cacheKey = `character_${path.replace(/\//g, '_')}`;
        const cachedContent = localStorage.getItem(cacheKey);
        
        if (cachedContent) {
            displayCharacterContent(path, cachedContent, index);
            return;
        }
        
        // 添加超时机制
        const content = await Promise.race([
            fetchTextWithRetry(`https://raw.githubusercontent.com/LYC-gh/lyc-gh.github.io/main/${path}`),
            new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), 10000)) // 10秒超时
        ]);
        
        localStorage.setItem(cacheKey, content);
        displayCharacterContent(path, content, index);
    } catch (error) {
        console.error('加载人物设定内容失败:', error);
        showError('人物设定加载失败: ' + error.message);
    } finally {
        hideSkeletonLoader();
    }
}

// 显示章节内容
function displayChapterContent(path, content, index) {
    try {
        const contentArea = document.getElementById('chapterContent');
        if (!contentArea) return;

        // 章节名称
        const chapterName = path.split('/').pop().replace('.txt', '');
        document.getElementById('chapterTitle').textContent = chapterName;

        // 格式化内容
        let formattedContent = formatContent(content, chapterName);

        contentArea.innerHTML = formattedContent;
        
        // 更新当前章节索引并保存书签
        if (index >= 0) {
            currentChapterIndex = index;
            isCharacterChapter = false;
            updateChapterProgress();
            saveBookmark(); // 这里调用保存书签
        }

        // 恢复滚动位置
        setTimeout(() => {
            const savedPosition = localStorage.getItem('scrollPosition');
            if (savedPosition) {
                window.scrollTo(0, parseInt(savedPosition));
                localStorage.removeItem('scrollPosition');
            }
        }, 100);

    } catch (error) {
        console.error('显示章节内容失败:', error);
        showError('格式化内容时出错: ' + error.message);
    }
}

function formatContent(rawContent, chapterName) {
    // 1. 清理Markdown加粗语法
    const cleanContent = rawContent
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1');

    // 2. 统一换行符并分割段落
    const paragraphs = cleanContent
        .replace(/\r\n/g, '\n')
        .replace(/\n+/g, '\n')
        .split('\n')
        .filter(line => line.trim());

    // 3. 包裹每个段落
    const processedParagraphs = paragraphs.map(line => 
        `<p class="content-paragraph">${line}</p>`
    );

    // 4. 返回完整HTML
    return `
        <h2 class="chapter-title">${chapterName}</h2>
        ${processedParagraphs.join('')}
    `;
}

// 显示人物设定内容
function displayCharacterContent(path, content, index) {
    const characterName = path.split('/').pop().replace('.txt', '');
    document.getElementById('chapterTitle').textContent = characterName;
    
    // 格式化人物设定内容
    const formattedContent = formatCharacterContent(content);
    document.getElementById('chapterContent').innerHTML = formattedContent;
    
    currentCharacterIndex = index >= 0 ? index : characterFiles.findIndex(file => file.path === path);
    isCharacterChapter = true;
    
    updateNavigationButtons();
    updateChapterProgress();
    saveBookmark();
    
    hideSkeletonLoader();
}

function formatCharacterContent(rawContent) {
    // 1. 按行分割并过滤空行
    const lines = rawContent
        .replace(/\r\n/g, '\n')  // 统一换行符
        .split('\n')
        .filter(line => line.trim());
    
    // 2. 处理每行内容
    const formattedLines = lines.map(line => {
        // 处理键值对格式 (如 "性别：男")
        if (line.includes('：')) {
            const [key, value] = line.split('：', 2);
            return `<div class="character-line"><strong>${key}：</strong>${value || '无'}</div>`;
        }
        // 处理普通文本
        return `<div class="character-line">${line}</div>`;
    });
    
    // 3. 组合成完整HTML
    return formattedLines.join('');
}

// 预加载相邻章节
function preloadAdjacentChapters(currentIndex) {
    if (preloading || isCharacterChapter) return;
    
    // 预加载下一章
    if (currentIndex < chapterFiles.length - 1) {
        const nextPath = chapterFiles[currentIndex + 1].path;
        preloadContent(nextPath, `chapter_${nextPath.replace(/\//g, '_')}`);
    }
    
    // 预加载上一章
    if (currentIndex > 0) {
        const prevPath = chapterFiles[currentIndex - 1].path;
        preloadContent(prevPath, `chapter_${prevPath.replace(/\//g, '_')}`);
    }
}

// 通用预加载函数
async function preloadContent(path, cacheKey) {
    if (localStorage.getItem(cacheKey)) return;
    
    preloading = true;
    showPreloadNotice();
    
    try {
        const content = await fetchTextWithRetry(`https://raw.githubusercontent.com/LYC-gh/lyc-gh.github.io/main/${path}`);
        localStorage.setItem(cacheKey, content);
    } catch (error) {
        console.error('预加载内容失败:', error);
    } finally {
        preloading = false;
    }
}

// 章节导航功能
function initChapterNavigation() {
    const prevBtn = document.getElementById('prevChapter');
    const nextBtn = document.getElementById('nextChapter');
    
    if (!prevBtn || !nextBtn) return;
    
    prevBtn.addEventListener('click', navigateToPrevious);
    nextBtn.addEventListener('click', navigateToNext);
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') prevBtn.click();
        if (e.key === 'ArrowRight') nextBtn.click();
    });
    
    // 滚动预加载
    window.addEventListener('scroll', handleScrollForPreload);
}

function navigateToPrevious() {
    showSkeletonLoader();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (isCharacterChapter) {
        if (currentCharacterIndex > 0) {
            loadCharacter(characterFiles[currentCharacterIndex - 1].path, currentCharacterIndex - 1);
        }
    } else {
        if (currentChapterIndex > 0) {
            loadChapter(chapterFiles[currentChapterIndex - 1].path, currentChapterIndex - 1);
        }
    }
}

function navigateToNext() {
    showSkeletonLoader();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (isCharacterChapter) {
        if (currentCharacterIndex < characterFiles.length - 1) {
            loadCharacter(characterFiles[currentCharacterIndex + 1].path, currentCharacterIndex + 1);
        }
    } else {
        if (currentChapterIndex < chapterFiles.length - 1) {
            loadChapter(chapterFiles[currentChapterIndex + 1].path, currentChapterIndex + 1);
        }
    }
}

function handleScrollForPreload() {
    if (isCharacterChapter) return;
    
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    if (scrollPosition > documentHeight * 0.7) {
        preloadNextChapter();
    }
}

// 更新导航按钮状态
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevChapter');
    const nextBtn = document.getElementById('nextChapter');
    
    if (!prevBtn || !nextBtn) return;
    
    if (isCharacterChapter) {
        prevBtn.disabled = currentCharacterIndex <= 0;
        nextBtn.disabled = currentCharacterIndex >= characterFiles.length - 1;
    } else {
        prevBtn.disabled = currentChapterIndex <= 0;
        nextBtn.disabled = currentChapterIndex >= chapterFiles.length - 1;
    }
}

// 更新进度显示
function updateChapterProgress() {
    const progressElement = document.getElementById('chapterProgress');
    if (!progressElement) return;
    
    if (isCharacterChapter) {
        progressElement.textContent = `人物设定 ${currentCharacterIndex + 1}/${characterFiles.length}`;
    } else {
        progressElement.textContent = `第 ${currentChapterIndex + 1} 章 / 共 ${chapterFiles.length} 章`;
    }
}

// 书签功能
function initBookmark() {
    const saveBookmarkBtn = document.getElementById('saveBookmark');
    const loadBookmarkBtn = document.getElementById('loadBookmark');
    
    if (!saveBookmarkBtn || !loadBookmarkBtn) return;
    
    saveBookmarkBtn.addEventListener('click', saveReadingProgress);
    loadBookmarkBtn.addEventListener('click', loadReadingProgress);
    
    // 自动加载上次阅读进度
    loadLastReadingProgress();
}

function saveReadingProgress() {
    const chapterPath = localStorage.getItem('lastChapter');
    if (!chapterPath) {
        alert('没有正在阅读的章节！');
        return;
    }
    
    const bookmark = {
        chapter: chapterPath,
        position: window.scrollY,
        chapterIndex: currentChapterIndex,
        characterIndex: currentCharacterIndex,
        isCharacterChapter: isCharacterChapter
    };
    
    localStorage.setItem('bookmark', JSON.stringify(bookmark));
    alert('阅读进度已保存！');
}

function loadReadingProgress() {
    const bookmark = localStorage.getItem('bookmark');
    if (!bookmark) {
        alert('没有找到保存的阅读进度！');
        return;
    }
    
    try {
        const { chapter, position, chapterIndex, characterIndex, isCharacterChapter: isCharacter } = JSON.parse(bookmark);
        isCharacterChapter = isCharacter || false;
        
        if (isCharacterChapter) {
            loadCharacter(chapter, characterIndex);
        } else {
            loadChapter(chapter, chapterIndex);
        }
        
        setTimeout(() => window.scrollTo(0, position), 500);
    } catch (e) {
        console.error('读取书签失败:', e);
        alert('读取书签失败！');
    }
}

function loadLastReadingProgress() {
    const lastChapter = localStorage.getItem('lastChapter');
    if (!lastChapter) return;
    
    const lastIsCharacterChapter = localStorage.getItem('isCharacterChapter') === 'true';
    
    if (lastIsCharacterChapter) {
        const lastCharacterIndex = parseInt(localStorage.getItem('lastCharacterIndex')) || 0;
        loadCharacter(lastChapter, lastCharacterIndex);
    } else {
        const lastChapterIndex = parseInt(localStorage.getItem('lastChapterIndex')) || 0;
        loadChapter(lastChapter, lastChapterIndex);
    }
}

// 错误显示函数
function showError(message, isFatal = false) {
	// 延迟显示错误，避免在加载过程中过早显示
    setTimeout(() => {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        const contentArea = document.getElementById('chapterContent');
        if (contentArea) {
            if (isFatal) {
                contentArea.innerHTML = '';
            }
            contentArea.appendChild(errorElement);
        }
        
        if (isFatal) {
            const errorBoundary = document.getElementById('errorBoundary');
            if (errorBoundary) errorBoundary.style.display = 'block';
        }
        
        hideSkeletonLoader();
    }, 500); // 延迟500ms显示
}

document.getElementById('clearCacheBtn').addEventListener('click', () => {
  if (confirm('确定要清除所有缓存吗？这将重新加载页面。')) {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
  }
});

localStorage.setItem('chapterListCache', JSON.stringify({
    data: files,
    timestamp: Date.now()
}));

// 检查时验证是否过期（7天过期）
function getCacheWithExpiry(key) {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    const { data, timestamp } = JSON.parse(item);
    if (Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key);
        return null;
    }
    return data;
}