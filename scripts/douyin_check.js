/**
 * Douyin Live Status Checker v2 - Uses webcast API instead of page parsing
 * GitHub Actions compatible, outputs JSON to stdout
 * 
 * Usage: node douyin_check.js [web_rid]
 * 
 * Flow:
 *   1. GET live.douyin.com/ → get ttwid cookie
 *   2. GET webcast/room/web/enter/ → get room status
 * 
 * Status: 4 = live, 2 = preparing, 0/other = offline
 */

const https = require('https');

function httpGet(url, headers, timeout) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: headers || {},
      timeout: timeout || 20000
    }, (res) => {
      const cookies = res.headers['set-cookie'] || [];
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        body: Buffer.concat(chunks).toString('utf8'),
        cookies: cookies,
        statusCode: res.statusCode
      }));
    });
    req.on('error', reject);
    req.on('timeout', function() { this.destroy(); reject(new Error('HTTP timeout')); });
  });
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function main() {
  const webRid = process.argv[2] || '239837195621';
  
  const result = {
    isLive: false,
    status: 0,
    title: '',
    nickname: '',
    userCount: '0',
    roomId: '',
    coverUrl: '',
    streamId: '',
    checkedAt: new Date().toISOString(),
    method: 'api'
  };

  try {
    // Step 1: Get ttwid cookie
    const init = await httpGet('https://live.douyin.com/', { 'User-Agent': UA });
    let ttwid = '';
    for (const c of init.cookies) {
      const m = c.match(/ttwid=([^;]+)/);
      if (m) { ttwid = m[1]; break; }
    }
    
    if (!ttwid) {
      // Fallback: try extracting from HTML
      const m = init.body.match(/ttwid=([^;"\s]+)/);
      if (m) ttwid = m[1];
    }

    // Step 2: Call webcast API
    const params = new URLSearchParams({
      aid: '6383',
      app_name: 'douyin_web',
      live_id: '1',
      device_platform: 'web',
      browser_language: 'zh-CN',
      browser_platform: 'Win32',
      browser_name: 'Chrome',
      browser_version: '131.0.0.0',
      web_rid: webRid,
      enter_source: 'web_live_page',
      cookie_enabled: 'true',
      screen_width: '1920',
      screen_height: '1080'
    }).toString();

    const apiRes = await httpGet(
      'https://live.douyin.com/webcast/room/web/enter/?' + params,
      {
        'User-Agent': UA,
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://live.douyin.com/' + webRid,
        'Cookie': ttwid ? 'ttwid=' + ttwid : ''
      }
    );

    if (apiRes.body.length < 10) {
      // API returned empty, fallback to page parsing
      return fallbackPageParse(webRid, result);
    }

    const json = JSON.parse(apiRes.body);
    
    if (json.status_code !== 0 || !json.data || !json.data.data || !json.data.data[0]) {
      // API error, fallback to page parsing
      return fallbackPageParse(webRid, result);
    }

    const room = json.data.data[0];
    result.status = parseInt(room.status) || 0;
    result.isLive = result.status === 4;
    result.title = room.title || room.title_str || '';
    result.roomId = room.id_str || '';
    result.userCount = room.user_count_str || '0';
    result.nickname = room.owner ? (room.owner.nickname || '') : '';
    
    if (room.cover) {
      const urls = room.cover.url_list || [];
      if (urls.length > 0) result.coverUrl = urls[0];
    }
    if (room.stream_url) {
      const flv = room.stream_url.flv_pull_url || {};
      const keys = Object.keys(flv);
      if (keys.length > 0) result.streamId = keys[0];
    }

  } catch(e) {
    // Any error, try page parsing fallback
    try {
      return await fallbackPageParse(webRid, result);
    } catch(e2) {
      result.error = e.message;
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

// Fallback: parse SSR page (original method)
async function fallbackPageParse(webRid, result) {
  result.method = 'page';
  try {
    const html = await httpGet('https://live.douyin.com/' + webRid, {
      'User-Agent': UA,
      'Accept-Language': 'zh-CN,zh;q=0.8',
      'Referer': 'https://live.douyin.com/'
    });
    
    const lastIdx = html.body.lastIndexOf('roomStore');
    if (lastIdx < 0) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    
    const chunk = html.body.substring(lastIdx, Math.min(html.body.length, lastIdx + 20000));
    
    const statusMatch = chunk.match(/status\\":(\d+)/);
    if (statusMatch) {
      result.status = parseInt(statusMatch[1]);
      result.isLive = result.status === 4;
    }
    const titleMatch = chunk.match(/title\\":\\"([^\\]+)\\"/);
    if (titleMatch) result.title = titleMatch[1];
    const nickMatch = chunk.match(/nickname\\":\\"([^\\]+)\\"/);
    if (nickMatch) result.nickname = nickMatch[1];
    const idMatch = chunk.match(/id_str\\":\\"(\d+)\\"/);
    if (idMatch) result.roomId = idMatch[1];
    const countMatch = chunk.match(/user_count_str\\":\\"([^\\]*)\\"/);
    if (countMatch) result.userCount = countMatch[1];
  } catch(e) {
    result.error = e.message;
  }
  console.log(JSON.stringify(result, null, 2));
}

main();
