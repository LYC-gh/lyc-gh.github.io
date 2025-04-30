const fs = require('fs');
const path = require('path');

// 扫描novels目录下的TXT文件
const novelsDir = path.join(__dirname, 'novels');
const files = fs.readdirSync(novelsDir);

// 过滤出TXT文件并按名称排序
const txtFiles = files
    .filter(file => file.endsWith('.txt'))
    .sort((a, b) => {
        // 简单的排序逻辑：按数字排序
        const numA = parseInt(a.match(/\d+/)?.[0] || 0);
        const numB = parseInt(b.match(/\d+/)?.[0] || 0);
        return numA - numB;
    });

// 生成章节数据
const chapters = txtFiles.map(file => {
    // 从文件名生成章节名（去掉.txt后缀）
    let name = file.replace('.txt', '');
    
    // 如果是纯数字文件名，添加"第X章"前缀
    if (/^\d+$/.test(name)) {
        name = `第${name}章`;
    }
    
    return {
        name,
        file: `novels/${file}`
    };
});

// 写入chapters.json
const output = {
    chapters
};

fs.writeFileSync(
    path.join(__dirname, 'chapters.json'),
    JSON.stringify(output, null, 2)
);

console.log('章节列表已更新！');
