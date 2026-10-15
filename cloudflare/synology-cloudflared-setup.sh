#!/bin/sh
# ==============================================================================
# Smart MSO — Synology NAS Cloudflare Tunnel Quick Setup Script
# ==============================================================================
# คำแนะนำการใช้งานบน Synology DSM (DSM 7+ ผ่าน Container Manager หรือ SSH):
# 1. เชื่อมต่อ SSH ไปยังเครื่อง Synology: ssh admin@192.168.162.21
# 2. นำเข้า Token จาก Cloudflare Zero Trust Dashboard (Networks > Tunnels)
# 3. รันคำสั่ง: ./synology-cloudflared-setup.sh YOUR_TUNNEL_TOKEN
# ==============================================================================

TUNNEL_TOKEN=$1

if [ -z "$TUNNEL_TOKEN" ]; then
    echo "⚠️  กรุณาระบุ Cloudflare Tunnel Token!"
    echo "การใช้งาน: $0 <CLOUDFLARE_TUNNEL_TOKEN>"
    exit 1
fi

echo "🚀 กำลังเริ่มต้นติดตั้งและรัน Cloudflare Tunnel สำหรับ Smart MSO บน Synology DSM..."

# ตรวจสอบว่ามี Docker / Container Manager หรือไม่
if command -v docker >/dev/null 2>&1; then
    echo "✅ ตรวจพบ Docker Engine บน Synology DSM"
    
    # หยุด container เดิมหากมีอยู่ (รองรับทั้งชื่อใหม่และชื่อเดิม)
    docker rm -f smartmso-cloudflared omnioffice-cloudflared 2>/dev/null || true
    
    # รัน cloudflared daemon ในโหมด host network
    docker run -d \
      --name smartmso-cloudflared \
      --restart unless-stopped \
      --net host \
      cloudflare/cloudflared:latest tunnel --no-autoupdate run --token "$TUNNEL_TOKEN"
      
    echo "🎉 Cloudflare Tunnel กำลังทำงานอยู่ในเบื้องหลัง!"
    echo "ตรวจสอบสถานะด้วยคำสั่ง: docker logs -f smartmso-cloudflared"
else
    echo "❌ ไม่พบ Docker บนระบบ กรุณาติดตั้งแพ็กเกจ Container Manager จาก Synology Package Center ก่อน"
    exit 1
fi
