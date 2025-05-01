// 全局变量
let chapterFiles = [];
let characterFiles = [];
let currentChapterIndex = -1;
let currentCharacterIndex = -1;
let isCharacterChapter = false;
let isSidebarCollapsed = false;

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 加载章节和人物设定列表
    loadChapterList();
    loadCharacterList();
    
    // 初始化书签功能
    initBookmark();
    
    // 初始化章节导航按钮
    initChapterNavigation();
    
    // 初始化侧边栏切换按钮
    initSidebarToggle();
});

// 初始化侧边栏切换按钮
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
        
        // 保存侧边栏状态
        localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
    });
    
    // 检查本地存储中的侧边栏状态
    const savedSidebarState = localStorage.getItem('sidebarCollapsed');
    if (savedSidebarState === 'true') {
        isSidebarCollapsed = true;
        sidebar.classList.add('collapsed');
        container.classList.add('with-collapsed-sidebar');
        toggleBtn.textContent = '显示';
    }
}

// 加载章节列表
function loadChapterList() {
    fetch('https://api.github.com/repos/LYC-gh/lyc-gh.github.io/contents/chapters')
        .then(response => response.json())
        .then(files => {
            const chapterList = document.getElementById('chapterList');
            if (!chapterList) return;
            
            // 过滤并排序章节文件
            chapterFiles = files
                .filter(file => file.name.endsWith('.txt'))
                .sort((a, b) => a.name.localeCompare(b.name));
            
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
            
            // 更新章节进度显示
            updateChapterProgress();
        })
        .catch(error => console.error('加载章节列表失败:', error));
}

// 加载人物设定列表
function loadCharacterList() {
    fetch('https://api.github.com/repos/LYC-gh/lyc-gh.github.io/contents/characters')
        .then(response => response.json())
        .then(files => {
            const characterList = document.getElementById('characterList');
            if (!characterList) return;
            
            // 过滤并排序人物设定文件
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
        })
        .catch(error => console.error('加载人物设定列表失败:', error));
}

// 加载章节内容
function loadChapter(path, index = -1) {
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    fetch(`https://raw.githubusercontent.com/LYC-gh/lyc-gh.github.io/main/${path}`)
        .then(response => response.text())
        .then(content => {
            const chapterName = path.split('/').pop().replace('.txt', '');
            document.getElementById('chapterTitle').textContent = chapterName;
            document.getElementById('chapterContent').textContent = content;
            
            currentChapterIndex = index >= 0 ? index : chapterFiles.findIndex(file => file.path === path);
            isCharacterChapter = false;
            
            updateNavigationButtons();
            updateChapterProgress();
            
            localStorage.setItem('lastChapter', path);
            localStorage.setItem('lastChapterIndex', currentChapterIndex);
            localStorage.setItem('isCharacterChapter', false);
        })
        .catch(error => console.error('加载章节内容失败:', error));
}

// 加载人物设定内容
function loadCharacter(path, index = -1) {
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    fetch(`https://raw.githubusercontent.com/LYC-gh/lyc-gh.github.io/main/${path}`)
        .then(response => response.text())
        .then(content => {
            const characterName = path.split('/').pop().replace('.txt', '');
            document.getElementById('chapterTitle').textContent = characterName;
            document.getElementById('chapterContent').textContent = content;
            
            currentCharacterIndex = index >= 0 ? index : characterFiles.findIndex(file => file.path === path);
            isCharacterChapter = true;
            
            updateNavigationButtons();
            updateChapterProgress();
            
            localStorage.setItem('lastChapter', path);
            localStorage.setItem('lastCharacterIndex', currentCharacterIndex);
            localStorage.setItem('isCharacterChapter', true);
        })
        .catch(error => console.error('加载人物设定内容失败:', error));
}

// 初始化章节导航功能
function initChapterNavigation() {
    const prevBtn = document.getElementById('prevChapter');
    const nextBtn = document.getElementById('nextChapter');
    
    if (!prevBtn || !nextBtn) return;
    
    prevBtn.addEventListener('click', () => {
        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        if (isCharacterChapter) {
            // 人物设定章节的上一页
            if (currentCharacterIndex > 0) {
                loadCharacter(characterFiles[currentCharacterIndex - 1].path, currentCharacterIndex - 1);
            }
        } else {
            // 普通章节的上一页
            if (currentChapterIndex > 0) {
                loadChapter(chapterFiles[currentChapterIndex - 1].path, currentChapterIndex - 1);
            }
        }
    });
    
    nextBtn.addEventListener('click', () => {
        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        if (isCharacterChapter) {
            // 人物设定章节的下一页
            if (currentCharacterIndex < characterFiles.length - 1) {
                loadCharacter(characterFiles[currentCharacterIndex + 1].path, currentCharacterIndex + 1);
            }
        } else {
            // 普通章节的下一页
            if (currentChapterIndex < chapterFiles.length - 1) {
                loadChapter(chapterFiles[currentChapterIndex + 1].path, currentChapterIndex + 1);
            }
        }
    });
    
    // 键盘快捷键支持
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prevBtn.click();
        } else if (e.key === 'ArrowRight') {
            nextBtn.click();
        }
    });
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

// 更新章节进度显示
function updateChapterProgress() {
    const progressElement = document.getElementById('chapterProgress');
    if (!progressElement) return;
    
    if (isCharacterChapter) {
        progressElement.textContent = `人物设定 ${currentCharacterIndex + 1}/${characterFiles.length}`;
    } else {
        progressElement.textContent = `第 ${currentChapterIndex + 1} 章 / 共 ${chapterFiles.length} 章`;
    }
}

// 初始化书签功能
function initBookmark() {
    const saveBookmarkBtn = document.getElementById('saveBookmark');
    const loadBookmarkBtn = document.getElementById('loadBookmark');
    
    if (!saveBookmarkBtn || !loadBookmarkBtn) return;
    
    saveBookmarkBtn.addEventListener('click', function() {
        const chapterPath = localStorage.getItem('lastChapter');
        if (chapterPath) {
            const scrollPosition = window.scrollY;
            localStorage.setItem('bookmark', JSON.stringify({
                chapter: chapterPath,
                position: scrollPosition,
                chapterIndex: currentChapterIndex,
                characterIndex: currentCharacterIndex,
                isCharacterChapter: isCharacterChapter
            }));
            alert('阅读进度已保存！');
        } else {
            alert('没有正在阅读的章节！');
        }
    });
    
    loadBookmarkBtn.addEventListener('click', function() {
        const bookmark = localStorage.getItem('bookmark');
        if (bookmark) {
            try {
                const { chapter, position, chapterIndex, characterIndex, isCharacterChapter: isCharacter } = JSON.parse(bookmark);
                isCharacterChapter = isCharacter || false;
                
                if (isCharacterChapter) {
                    loadCharacter(chapter, characterIndex);
                } else {
                    loadChapter(chapter, chapterIndex);
                }
                
                setTimeout(() => {
                    window.scrollTo(0, position);
                }, 500);
            } catch (e) {
                console.error('读取书签失败:', e);
                alert('读取书签失败！');
            }
        } else {
            alert('没有找到保存的阅读进度！');
        }
    });
    
    // 检查是否有上次阅读的章节，自动加载
    const lastChapter = localStorage.getItem('lastChapter');
    const lastChapterIndex = localStorage.getItem('lastChapterIndex');
    const lastCharacterIndex = localStorage.getItem('lastCharacterIndex');
    const lastIsCharacterChapter = localStorage.getItem('isCharacterChapter') === 'true';
    
    if (lastChapter) {
        if (lastIsCharacterChapter) {
            loadCharacter(lastChapter, parseInt(lastCharacterIndex) || 0);
        } else {
            loadChapter(lastChapter, parseInt(lastChapterIndex) || 0);
        }
    }
}
