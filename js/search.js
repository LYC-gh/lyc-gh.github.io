document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    
    // 点击搜索按钮或按回车键触发搜索
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // 存储所有章节和人物设定的缓存
    let searchCache = [];
    
    // 预加载搜索数据
    preloadSearchData();
    
    function preloadSearchData() {
        // 获取所有章节和人物设定文件
        Promise.all([
            fetch('https://api.github.com/repos/你的用户名/你的用户名.github.io/contents/chapters'),
            fetch('https://api.github.com/repos/你的用户名/你的用户名.github.io/contents/characters')
        ])
        .then(responses => Promise.all(responses.map(res => res.json())))
        .then(([chapters, characters]) => {
            // 合并所有文件
            const allFiles = [...chapters, ...characters].filter(file => file.name.endsWith('.txt'));
            
            // 为每个文件创建搜索条目
            searchCache = allFiles.map(file => ({
                name: file.name.replace('.txt', ''),
                path: file.path,
                type: file.path.startsWith('chapters/') ? '章节' : '人物设定'
            }));
        })
        .catch(error => console.error('预加载搜索数据失败:', error));
    }
    
    function performSearch() {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) return;
        
        if (searchCache.length === 0) {
            alert('搜索数据正在加载中，请稍后再试...');
            return;
        }
        
        // 执行搜索
        const results = searchCache.filter(item => 
            item.name.toLowerCase().includes(query) || 
            item.type.toLowerCase().includes(query)
        );
        
        if (results.length === 0) {
            alert('没有找到匹配的结果！');
            return;
        }
        
        // 显示搜索结果（简单实现，可以更复杂）
        if (results.length === 1) {
            // 如果只有一个结果，直接加载
            loadChapter(results[0].path);
        } else {
            // 多个结果，让用户选择
            const resultList = results.map((item, index) => 
                `${index + 1}. [${item.type}] ${item.name}`
            ).join('\n');
            
            const choice = prompt(`找到多个结果:\n${resultList}\n请输入数字选择:`);
            const selectedIndex = parseInt(choice) - 1;
            
            if (selectedIndex >= 0 && selectedIndex < results.length) {
                loadChapter(results[selectedIndex].path);
            }
        }
    }
});
