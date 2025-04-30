// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 加载章节和人物设定列表
    loadChapterList();
    loadCharacterList();
    
    // 初始化书签功能
    initBookmark();
});

// 加载章节列表
function loadChapterList() {
    // 使用GitHub API获取chapters目录下的文件列表
    fetch('https://api.github.com/repos/你的用户名/你的用户名.github.io/contents/chapters')
        .then(response => response.json())
        .then(files => {
            const chapterList = document.getElementById('chapterList');
            
            // 按文件名排序
            files.sort((a, b) => a.name.localeCompare(b.name));
            
            files.forEach(file => {
                if (file.name.endsWith('.txt')) {
                    const chapterItem = document.createElement('div');
                    chapterItem.className = 'chapter-item';
                    chapterItem.textContent = file.name.replace('.txt', '');
                    
                    // 点击章节加载内容
                    chapterItem.addEventListener('click', () => {
                        loadChapter(file.path);
                    });
                    
                    chapterList.appendChild(chapterItem);
                }
            });
        })
        .catch(error => console.error('加载章节列表失败:', error));
}

// 加载人物设定列表
function loadCharacterList() {
    // 使用GitHub API获取characters目录下的文件列表
    fetch('https://api.github.com/repos/你的用户名/你的用户名.github.io/contents/characters')
        .then(response => response.json())
        .then(files => {
            const characterList = document.getElementById('characterList');
            
            // 按文件名排序
            files.sort((a, b) => a.name.localeCompare(b.name));
            
            files.forEach(file => {
                if (file.name.endsWith('.txt')) {
                    const characterItem = document.createElement('div');
                    characterItem.className = 'character-item';
                    characterItem.textContent = file.name.replace('.txt', '');
                    
                    // 点击人物设定加载内容
                    characterItem.addEventListener('click', () => {
                        loadChapter(file.path);
                    });
                    
                    characterList.appendChild(characterItem);
                }
            });
        })
        .catch(error => console.error('加载人物设定列表失败:', error));
}

// 加载章节或人物设定内容
function loadChapter(path) {
    // 使用GitHub raw content获取文件内容
    fetch(`https://raw.githubusercontent.com/你的用户名/你的用户名.github.io/main/${path}`)
        .then(response => response.text())
        .then(content => {
            // 更新页面显示
            document.getElementById('chapterTitle').textContent = path.split('/').pop().replace('.txt', '');
            document.getElementById('chapterContent').textContent = content;
            
            // 保存当前阅读章节到书签
            localStorage.setItem('lastChapter', path);
        })
        .catch(error => console.error('加载章节内容失败:', error));
}

// 初始化书签功能
function initBookmark() {
    const saveBookmarkBtn = document.getElementById('saveBookmark');
    const loadBookmarkBtn = document.getElementById('loadBookmark');
    
    // 保存阅读位置
    saveBookmarkBtn.addEventListener('click', function() {
        const chapterPath = localStorage.getItem('lastChapter');
        if (chapterPath) {
            const scrollPosition = window.scrollY;
            localStorage.setItem('bookmark', JSON.stringify({
                chapter: chapterPath,
                position: scrollPosition
            }));
            alert('阅读进度已保存！');
        } else {
            alert('没有正在阅读的章节！');
        }
    });
    
    // 加载阅读位置
    loadBookmarkBtn.addEventListener('click', function() {
        const bookmark = localStorage.getItem('bookmark');
        if (bookmark) {
            try {
                const { chapter, position } = JSON.parse(bookmark);
                loadChapter(chapter);
                
                // 等待内容加载完成后滚动到保存的位置
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
    if (lastChapter) {
        loadChapter(lastChapter);
    }
}
