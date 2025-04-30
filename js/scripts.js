// 获取DOM元素
const chapterList = document.getElementById('chapter-list');
const chapterContent = document.getElementById('chapter-content');
const currentChapterTitle = document.getElementById('current-chapter');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

// 存储章节数据
let chapters = [];
let currentChapterIndex = 0;

// 初始化函数
async function init() {
    // 1. 获取章节列表
    await fetchChapterList();
    
    // 2. 渲染章节列表
    renderChapterList();
    
    // 3. 加载第一章
    if (chapters.length > 0) {
        loadChapter(0);
    }
    
    // 4. 检查是否有书签
    checkBookmark();
}

// 获取章节列表
async function fetchChapterList() {
    try {
        // 这里我们假设有一个API端点可以获取novels目录下的文件列表
        // 由于GitHub Pages是静态网站，我们需要在构建时生成这个列表
        // 在实际部署时，可以使用GitHub Actions自动生成这个文件
        
        // 我们创建一个简单的chapters.json文件来存储章节信息
        const response = await fetch('chapters.json');
        const data = await response.json();
        chapters = data.chapters;
    } catch (error) {
        console.error('获取章节列表失败:', error);
        // 如果chapters.json不存在，我们手动创建一个默认列表
        chapters = [
            { name: '第一章', file: 'novels/chapter1.txt' },
            { name: '第二章', file: 'novels/chapter2.txt' },
            { name: '人物设定', file: 'novels/characters.txt' }
        ];
    }
}

// 渲染章节列表
function renderChapterList() {
    chapterList.innerHTML = '';
    
    chapters.forEach((chapter, index) => {
        const li = document.createElement('li');
        li.textContent = chapter.name;
        li.dataset.index = index;
        
        li.addEventListener('click', () => {
            loadChapter(index);
        });
        
        chapterList.appendChild(li);
    });
}

// 加载章节内容
async function loadChapter(index) {
    if (index < 0 || index >= chapters.length) return;
    
    currentChapterIndex = index;
    
    try {
        const response = await fetch(chapters[index].file);
        const text = await response.text();
        
        // 更新UI
        currentChapterTitle.textContent = chapters[index].name;
        chapterContent.textContent = text;
        
        // 更新按钮状态
        updateNavButtons();
        
        // 保存书签
        saveBookmark();
        
        // 高亮当前章节
        highlightCurrentChapter();
    } catch (error) {
        console.error('加载章节失败:', error);
        chapterContent.textContent = '加载章节内容失败，请稍后再试。';
    }
}

// 更新导航按钮状态
function updateNavButtons() {
    prevBtn.disabled = currentChapterIndex === 0;
    nextBtn.disabled = currentChapterIndex === chapters.length - 1;
}

// 高亮当前章节
function highlightCurrentChapter() {
    const items = chapterList.querySelectorAll('li');
    items.forEach((item, index) => {
        if (index === currentChapterIndex) {
            item.style.color = '#4285f4';
            item.style.fontWeight = 'bold';
        } else {
            item.style.color = '';
            item.style.fontWeight = '';
        }
    });
}

// 保存阅读进度
function saveBookmark() {
    localStorage.setItem('novelBookmark', currentChapterIndex);
}

// 检查书签
function checkBookmark() {
    const bookmark = localStorage.getItem('novelBookmark');
    if (bookmark !== null) {
        const index = parseInt(bookmark);
        if (!isNaN(index) && index >= 0 && index < chapters.length) {
            loadChapter(index);
        }
    }
}

// 搜索功能
function searchChapters() {
    const keyword = searchInput.value.trim().toLowerCase();
    if (!keyword) return;
    
    // 搜索章节标题
    const foundInTitles = chapters.filter(chapter => 
        chapter.name.toLowerCase().includes(keyword)
    );
    
    // 搜索章节内容（需要加载内容，性能较差）
    // 这里我们只搜索标题，实际应用中可以实现更复杂的搜索
    
    if (foundInTitles.length > 0) {
        // 跳转到第一个匹配的章节
        const index = chapters.findIndex(ch => ch === foundInTitles[0]);
        loadChapter(index);
    } else {
        alert('没有找到匹配的章节或人物设定');
    }
}

// 事件监听
prevBtn.addEventListener('click', () => {
    loadChapter(currentChapterIndex - 1);
});

nextBtn.addEventListener('click', () => {
    loadChapter(currentChapterIndex + 1);
});

searchBtn.addEventListener('click', searchChapters);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchChapters();
    }
});

// 初始化应用
document.addEventListener('DOMContentLoaded', init);
