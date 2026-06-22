const fs = require('fs');
const path = require('path');

const jsonPath = process.argv[2] || 'C:\\Users\\Administrator\\.qclaw\\workspace\\chatlab_nangua.json';
const outputPath = process.argv[3] || 'C:\\Users\\Administrator\\.qclaw\\workspace\\chatlab_parsed.txt';

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const members = {};
data.members.forEach(m => members[m.platformId] = m.accountName);

const lines = [];
lines.push(`# 聊天记录：${data.meta.name}`);
lines.push(`平台：${data.meta.platform}`);
lines.push(`导出时间：${new Date(data.chatlab.exportedAt * 1000).toLocaleString('zh-CN')}`);
lines.push('');
lines.push('---');
lines.push('');

data.messages.forEach(msg => {
  const accountName = msg.accountName || members[msg.sender] || msg.sender;
  const msgTime = new Date(msg.timestamp * 1000).toLocaleString('zh-CN', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false 
  });
  
  let display = msg.content || '';
  if (msg.type === 1) display = '[图片]';
  else if (msg.type === 2) display = '[语音消息]';
  else if (msg.type === 5) display = '[动画表情]';
  else if (msg.type === 80) display = `[系统] ${msg.content}`;
  else if (msg.type === 25) display = `[引用] ${msg.content}`;
  else if (msg.type === 99) display = `[系统] ${msg.content}`;
  
  lines.push(`[${msgTime}] ${accountName}：${display}`);
});

fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
console.log(`✅ 解析完成，共 ${data.messages.length} 条消息`);
console.log(`输出文件：${outputPath}`);
