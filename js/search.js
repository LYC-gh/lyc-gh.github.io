document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchResults = document.getElementById('searchResults');
    const chapterTitle = document.getElementById('chapterTitle');
    const chapterContent = document.getElementById('chapterContent');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    // 搜索状态管理
    const searchState = {
        cache: [],
        isLoading: false,
        lastQuery: '',
        debounceTimer: null,
        retryCount: 0
    };
    
    // 初始化搜索功能
    initSearch();
    
    function initSearch() {
        // 事件监听器
        searchButton.addEventListener('click', handleSearch);
        searchInput.addEventListener('input', handleInput);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleSearch();
        });
        
        // 预加载搜索数据
        preloadSearchData();
    }
    
    // 输入处理（带防抖）
    function handleInput() {
        clearTimeout(searchState.debounceTimer);
        
        // 空输入时不搜索
        if (!searchInput.value.trim()) {
            searchResults.style.display = 'none';
            return;
        }
        
        searchState.debounceTimer = setTimeout(() => {
            handleSearch(true);
        }, 300);
    }
    
    // 搜索处理
    function handleSearch(isFromInput = false) {
        const query = searchInput.value.trim();
        
        if (!query) {
            if (!isFromInput) showMessage('请输入搜索内容');
            return;
        }
        
        // 相同查询不再重复搜索
        if (query === searchState.lastQuery && searchState.cache.length > 0) {
            displayResults(searchState.cache);
            return;
        }
        
        searchState.lastQuery = query;
        
        if (searchState.isLoading) {
            showMessage('数据正在加载中，请稍候...');
            return;
        }
        
        if (searchState.cache.length === 0) {
            showMessage('搜索数据尚未加载完成，请稍后再试');
            return;
        }
        
        performSearch(query);
    }
    
    // 预加载搜索数据
    function preloadSearchData() {
        if (searchState.isLoading) return;
        
        searchState.isLoading = true;
        showLoading(true);
        
        console.log('开始预加载搜索数据...');
        
        const urls = [
            'https://api.github.com/repos/LYC-gh/lyc-gh.github.io/contents/chapters',
            'https://api.github.com/repos/LYC-gh/lyc-gh.github.io/contents/characters'
        ];
        
        Promise.all(urls.map(url => fetchWithRetry(url)))
            .then(responses => Promise.all(responses.map(res => res.json())))
            .then(([chapters, characters]) => {
                // 处理章节数据
                const chapterItems = processFiles(chapters, '章节');
                
                // 处理人物数据
                const characterItems = processFiles(characters, '人物设定');
                
                // 合并数据
                searchState.cache = [...chapterItems, ...characterItems];
                console.log('搜索数据加载完成，共加载:', searchState.cache.length, '个项目');
                
                // 如果有待处理的搜索查询，立即执行
                if (searchState.lastQuery) {
                    performSearch(searchState.lastQuery);
                }
            })
            .catch(error => {
                console.error('加载搜索数据失败:', error);
                showMessage('加载搜索数据失败: ' + error.message, true);
            })
            .finally(() => {
                searchState.isLoading = false;
                showLoading(false);
            });
    }
    
    // 处理文件数据
    function processFiles(files, type) {
        return files
            .filter(file => file.name.endsWith('.txt'))
            .map(file => ({
                name: file.name.replace('.txt', ''),
                path: file.path,
                type: type,
                fullText: '' // 用于全文搜索
            }));
    }
    
    // 带重试的fetch
    async function fetchWithRetry(url, retries = 3) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP错误! 状态: ${response.status}`);
            return response;
        } catch (error) {
            if (retries > 0) {
                console.log(`重试 ${url} (剩余 ${retries} 次)`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
                return fetchWithRetry(url, retries - 1);
            }
            throw error;
        }
    }
    
    // 执行搜索
    function performSearch(query) {
        console.log('正在搜索:', query);
        
        const lowerQuery = query.toLowerCase();
        const results = searchState.cache.filter(item => 
            item.name.toLowerCase().includes(lowerQuery) || 
            item.type.toLowerCase().includes(lowerQuery)
        );
        
        displayResults(results, query);
    }
    
    // 显示结果
    function displayResults(results, query = '') {
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            showMessage('没有找到匹配的结果', false, searchResults);
        } else {
            results.forEach(item => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                
                // 高亮匹配文本
                const highlightedName = highlightText(item.name, query);
                const highlightedType = highlightText(item.type, query);
                
                resultItem.innerHTML = `
                    <strong>${highlightedName}</strong>
                    <span class="result-type">${highlightedType}</span>
                `;
                
                resultItem.addEventListener('click', () => {
                    loadContent(item.path, item.type === '章节');
                    searchResults.style.display = 'none';
                });
                
                searchResults.appendChild(resultItem);
            });
        }
        
        searchResults.style.display = 'block';
    }
    
    // 文本高亮
    function highlightText(text, query) {
        if (!query) return text;
        
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const startIdx = lowerText.indexOf(lowerQuery);
        
        if (startIdx === -1) return text;
        
        const endIdx = startIdx + query.length;
        return [
            text.substring(0, startIdx),
            '<span class="highlight">',
            text.substring(startIdx, endIdx),
            '</span>',
            text.substring(endIdx)
        ].join('');
    }
    
    // 加载内容
    function loadContent(path, isChapter) {
        console.log('正在加载:', path);
        showLoading(true);
        
        fetchWithRetry(`https://raw.githubusercontent.com/LYC-gh/lyc-gh.github.io/main/${path}`)
            .then(response => response.text())
            .then(content => {
                const title = path.split('/').pop().replace('.txt', '');
                chapterTitle.textContent = title;
                chapterContent.innerHTML = formatContent(content);
                
                // 滚动到内容区域
                scrollToContent();
                
                // 更新历史记录
                updateHistory(title, path, isChapter);
            })
            .catch(error => {
                console.error('加载内容失败:', error);
                showMessage('加载内容失败: ' + error.message, true);
            })
            .finally(() => {
                showLoading(false);
            });
    }
    
    // 格式化内容（保留原始换行等格式）
    function formatContent(content) {
        return content.split('\n').map(line => {
            if (line.trim() === '') return '<br>';
            return `<p>${line}</p>`;
        }).join('');
    }
    
    // 滚动到内容区域
    function scrollToContent() {
        const contentArea = document.querySelector('.content');
        if (contentArea) {
            setTimeout(() => {
                contentArea.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);
        }
    }
    
    // 更新浏览历史
    function updateHistory(title, path, isChapter) {
        const state = {
            title: title,
            path: path,
            isChapter: isChapter,
            timestamp: Date.now()
        };
        
        window.history.pushState(state, title, `#${encodeURIComponent(path)}`);
    }
    
    // 显示加载状态
    function showLoading(show) {
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'flex' : 'none';
        }
    }
    
    // 显示消息
    function showMessage(message, isError = false, container = null) {
        const target = container || document.body;
        const msgElement = document.createElement('div');
        msgElement.className = `message ${isError ? 'error' : 'info'}`;
        msgElement.textContent = message;
        
        // 添加到目标容器
        if (container) {
            container.innerHTML = '';
            container.appendChild(msgElement);
        } else {
            // 显示全局消息
            msgElement.style.position = 'fixed';
            msgElement.style.top = '20px';
            msgElement.style.left = '50%';
            msgElement.style.transform = 'translateX(-50%)';
            msgElement.style.padding = '10px 20px';
            msgElement.style.borderRadius = '4px';
            msgElement.style.zIndex = '1000';
            
            document.body.appendChild(msgElement);
            
            // 自动消失
            setTimeout(() => {
                msgElement.remove();
            }, 3000);
        }
    }
    
    // 点击页面其他区域关闭搜索结果
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container') && 
            !e.target.closest('.search-result-item')) {
            searchResults.style.display = 'none';
        }
    });
    
    // 处理浏览器前进/后退
    window.addEventListener('popstate', function(event) {
        if (event.state) {
            loadContent(event.state.path, event.state.isChapter);
        }
    });
});
