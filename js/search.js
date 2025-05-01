document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchResults = document.getElementById('searchResults');
    const chapterTitle = document.getElementById('chapterTitle');
    const chapterContent = document.getElementById('chapterContent');
    
    // 存储搜索缓存
    let searchCache = [];
    let isLoading = false;
    
    // 事件监听器
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
    
    // 预加载搜索数据
    preloadSearchData();
    
    // 预加载函数
    function preloadSearchData() {
        if (isLoading) return;
        isLoading = true;
        
        console.log('开始预加载搜索数据...');
        
        Promise.all([
            fetch('https://api.github.com/repos/LYC-gh/lyc-gh.github.io/contents/chapters'),
            fetch('https://api.github.com/repos/LYC-gh/lyc-gh.github.io/contents/characters')
        ])
        .then(responses => Promise.all(responses.map(res => {
            if (!res.ok) throw new Error('网络响应不正常');
            return res.json();
        })))
        .then(([chapters, characters]) => {
            // 处理章节数据
            const chapterItems = chapters
                .filter(file => file.name.endsWith('.txt'))
                .map(file => ({
                    name: file.name.replace('.txt', ''),
                    path: file.path,
                    type: '章节'
                }));
            
            // 处理人物数据
            const characterItems = characters
                .filter(file => file.name.endsWith('.txt'))
                .map(file => ({
                    name: file.name.replace('.txt', ''),
                    path: file.path,
                    type: '人物设定'
                }));
            
            // 合并数据
            searchCache = [...chapterItems, ...characterItems];
            console.log('搜索数据加载完成，共加载:', searchCache.length, '个项目');
        })
        .catch(error => {
            console.error('加载搜索数据失败:', error);
            alert('加载搜索数据失败，请检查网络连接或稍后再试');
        })
        .finally(() => {
            isLoading = false;
        });
    }
    
    // 执行搜索
    function performSearch() {
        const query = searchInput.value.trim();
        
        if (!query) {
            alert('请输入搜索内容');
            return;
        }
        
        if (isLoading) {
            alert('数据正在加载中，请稍候...');
            return;
        }
        
        if (searchCache.length === 0) {
            alert('搜索数据尚未加载完成，请稍后再试');
            return;
        }
        
        console.log('正在搜索:', query);
        
        const lowerQuery = query.toLowerCase();
        const results = searchCache.filter(item => 
            item.name.toLowerCase().includes(lowerQuery) || 
            item.type.toLowerCase().includes(lowerQuery)
        );
        
        displayResults(results);
    }
    
    // 显示结果
    function displayResults(results) {
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            const noResult = document.createElement('div');
            noResult.className = 'search-result-item';
            noResult.textContent = '没有找到匹配的结果';
            searchResults.appendChild(noResult);
        } else {
            results.forEach(item => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                resultItem.innerHTML = `
                    <strong>${item.name}</strong>
                    <span style="float:right;color:#666;">${item.type}</span>
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
    
    // 加载内容 - 修改了滚动逻辑
    function loadContent(path, isChapter) {
        console.log('正在加载:', path);
        
        fetch(`https://raw.githubusercontent.com/LYC-gh/lyc-gh.github.io/main/${path}`)
            .then(response => {
                if (!response.ok) throw new Error('网络响应不正常');
                return response.text();
            })
            .then(content => {
                const title = path.split('/').pop().replace('.txt', '');
                chapterTitle.textContent = title;
                chapterContent.textContent = content;
                
                // 修改后的滚动逻辑 - 添加了元素存在性检查
                const contentArea = document.querySelector('.content-area');
                if (contentArea) {
                    // 添加小延迟确保内容完全渲染
                    setTimeout(() => {
                        contentArea.scrollIntoView({
                            behavior: 'smooth'
                        });
                    }, 100);
                } else {
                    console.warn('未找到.content-area元素');
                }
            })
            .catch(error => {
                console.error('加载内容失败:', error);
                alert('加载内容失败: ' + error.message);
            });
    }
    
    // 点击页面其他区域关闭搜索结果
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            searchResults.style.display = 'none';
        }
    });
});
