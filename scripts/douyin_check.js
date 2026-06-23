/**
 * Douyin Live Status Checker for GitHub Actions
 * Fetches live.douyin.com page and extracts room info from SSR data.
 * 
 * Usage: node douyin_check.js [web_rid]
 * Output: JSON to stdout
 * 
 * Status codes:
 *   4 = live streaming
 *   2 = preparing
 *   0/other = offline
 */

const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.2',
        'Referer': 'https://live.douyin.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 20000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  const webRid = process.argv[2] || '239837195621';
  const html = await fetch('https://live.douyin.com/' + webRid);
  
  const result = {
    isLive: false,
    status: 0,
    title: '',
    nickname: '',
    userCount: '0',
    roomId: '',
    coverUrl: '',
    streamId: '',
    checkedAt: new Date().toISOString()
  };
  
  // Find the LAST roomStore occurrence (contains real room data)
  const lastIdx = html.lastIndexOf('roomStore');
  if (lastIdx < 0) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  
  const chunk = html.substring(lastIdx, Math.min(html.length, lastIdx + 20000));
  
  // Data is double-escaped in __pace_f: \"key\":\"value\"
  // Regex matches literal backslash+quote in the raw HTML
  
  const statusMatch = chunk.match(/status\\":(\d+)/);
  if (statusMatch) {
    result.status = parseInt(statusMatch[1]);
    result.isLive = result.status === 4;
  }
  
  const titleMatch = chunk.match(/title\\":\\"([^\\]+)\\"/);
  if (titleMatch) result.title = titleMatch[1];
  
  const idMatch = chunk.match(/id_str\\":\\"(\d+)\\"/);
  if (idMatch) result.roomId = idMatch[1];
  
  const countMatch = chunk.match(/user_count_str\\":\\"([^\\]*)\\"/);
  if (countMatch) result.userCount = countMatch[1];
  
  const nickMatch = chunk.match(/nickname\\":\\"([^\\]+)\\"/);
  if (nickMatch) result.nickname = nickMatch[1];
  
  const coverMatch = chunk.match(/cover_url\\":\{[^}]*url_list\\":\[\\"([^\\]+)\\"/);
  if (coverMatch) result.coverUrl = coverMatch[1];
  
  const streamMatch = chunk.match(/stream_id\\":\\"([^\\]+)\\"/);
  if (streamMatch) result.streamId = streamMatch[1];
  
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.log(JSON.stringify({
    isLive: false, status: 0, title: '', nickname: '',
    userCount: '0', roomId: '', coverUrl: '', streamId: '',
    checkedAt: new Date().toISOString(), error: err.message
  }, null, 2));
});
