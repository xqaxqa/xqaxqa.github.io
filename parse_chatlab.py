#!/usr/bin/env python3
import json
import sys
from datetime import datetime

def parse_chatlab(json_path, output_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    members = {m['platformId']: m['accountName'] for m in data.get('members', [])}
    
    type_map = {
        0: '文本',
        1: '图片',
        2: '语音',
        5: '动画表情',
        25: '引用/特殊',
        80: '系统/红包',
        99: '系统'
    }
    
    lines = []
    lines.append(f"# 聊天记录：{data['meta']['name']}")
    lines.append(f"平台：{data['meta']['platform']}")
    lines.append(f"导出时间：{datetime.fromtimestamp(data['chatlab']['exportedAt']).strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    lines.append("---")
    lines.append("")
    
    for msg in data.get('messages', []):
        sender_id = msg.get('sender', '')
        account_name = msg.get('accountName', members.get(sender_id, sender_id))
        ts = msg.get('timestamp', 0)
        msg_time = datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
        msg_type = msg.get('type', 0)
        content = msg.get('content', '')
        
        # 简化内容显示
        if msg_type == 1:
            display = '[图片]'
        elif msg_type == 2:
            display = '[语音消息]'
        elif msg_type == 5:
            display = '[动画表情]'
        elif msg_type == 80:
            display = f'[系统] {content}'
        elif msg_type == 25:
            display = f'[引用] {content}'
        else:
            display = content
        
        lines.append(f"[{msg_time}] {account_name}：{display}")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    
    print(f"✅ 解析完成，共 {len(data.get('messages', []))} 条消息")
    print(f"输出文件：{output_path}")

if __name__ == '__main__':
    json_path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\Administrator\.qclaw\workspace\chatlab_nangua.json"
    output_path = sys.argv[2] if len(sys.argv) > 2 else r"C:\Users\Administrator\.qclaw\workspace\chatlab_parsed.txt"
    parse_chatlab(json_path, output_path)
