# 🛡️ แผนแม่บทสถาปัตยกรรม Cloudflare Integration (Smart MSO & Synology NAS)

> **เวอร์ชัน:** v1.0.0 (Enterprise Cloudflare Integration Suite)  
> **เป้าหมาย:** ปกป้องระบบ Virtual Office ด้วยเครือข่ายระดับโลกของ Cloudflare, เชื่อมต่อ On-Premise Synology NAS ผ่าน Zero Trust Tunnel โดยไม่ต้องเปิด Port Forwarding และป้องกันการโจมตี/บอทด้วย WAF Geo-blocking และ Cloudflare Turnstile

---

## 📐 1. แผนผังภาพรวมสถาปัตยกรรม (System Architecture)

```mermaid
graph TD
    User["🌐 ผู้ใช้งานทั่วไป / ข้าราชการ พมจ."] --> CF_Edge["Cloudflare Edge Network (Global Anycast DNS)"]
    
    subgraph Cloudflare Protection Layer
        CF_Edge --> WAF["Cloudflare WAF (Geo-blocking: TH Only + DDoS Shield)"]
        WAF --> Turnstile["Cloudflare Turnstile (Smart Bot Defense on Login)"]
        Turnstile --> CDN["Edge Cache (Static Assets & Cached NAS Media)"]
    end
    
    CDN -->|www.smso.site (CNAME)| Vercel["Vercel Cloud Platform (Next.js 16 Web App)"]
    Vercel --> Supabase["Supabase Cloud Database & GoTrue Auth"]
    
    Vercel -->|REST API via https://nas.smso.site| CF_Edge
    CDN -->|nas.smso.site (Tunnel)| Tunnel_NAS["Cloudflare Tunnel (cloudflared daemon)"]
    
    subgraph On-Premise Office LAN (192.168.162.x)
        Tunnel_NAS --> Synology["Synology NAS DSM 7+ (192.168.162.26:5000)"]
    end
```

---

## 🔑 2. มติข้อสรุปจากการออกแบบร่วม (Grill-Me Alignment Summary)

| มิติ (Dimension) | ทางเลือกที่กำหนด | คำอธิบายและเหตุผลทางสถาปัตยกรรม |
|---|---|---|
| **สถาปัตยกรรมการโฮสต์** | **Vercel (Global Edge) + Cloudflare Proxy** | Web App รันบน Vercel 100% พร้อม CDN และ Auto-scaling โดยมี Cloudflare คลุมหน้า |
| **Cloudflare Tunnel** | **Dedicated NAS Ingress** | รัน `cloudflared` บน Synology NAS เพื่อให้ Vercel และผู้ใช้ภายนอกเข้าถึง DMS/Photos อย่างปลอดภัย |
| **โครงสร้างโดเมน** | **แยก Subdomain ชัดเจน** | `www.smso.site` (Vercel CNAME) และ `nas.smso.site` (Cloudflare Tunnel) |
| **Bot Protection** | **Cloudflare Turnstile** | ฝัง Turnstile Widget บนหน้า Login (ทั้งแบบ Synology Auth และ Supabase Auth) |
| **WAF & Security** | **Geo-blocking (TH Only)** | อนุญาตทราฟฟิกหลักจากประเทศไทย (TH) และสกัดกั้นกลุ่ม IP อันตรายจากต่างประเทศ |
| **การจัดเก็บไฟล์** | **Synology NAS + Edge Cache** | จัดเก็บไฟล์ลงเครื่อง NAS ที่สำนักงานเหมือนเดิม โดย Vercel เรียกผ่าน `https://nas.smso.site` |

---

## 🚀 3. ขั้นตอนการติดตั้งและตั้งค่าระบบ (Step-by-Step Implementation)

### 📌 ขั้นตอนที่ 1: การตั้งค่า DNS & Cloudflare Zone
1. สมัคร/ล็อกอินเข้าสู่ [Cloudflare Dashboard](https://dash.cloudflare.com)
2. เพิ่มโดเมนหลักของหน่วยงาน (เช่น `m-society-kpp.go.th` หรือ `yourdomain.com`)
3. เปลี่ยน Name Servers ที่ Registrar (ผู้ให้บริการจดทะเบียนโดเมน) ให้ชี้มายัง Cloudflare Name Servers
4. เปิดสถานะ **Proxy Status: Proxied (สีส้ม ☁️)** สำหรับทุกเรคคอร์ด

---

### 📌 ขั้นตอนที่ 2: ติดตั้ง Cloudflare Tunnel บน Synology NAS หรือ Server วง LAN
คุณสามารถติดตั้ง `cloudflared` ได้ 2 วิธี:

#### วิธีที่ 2.1 (แนะนำที่สุด): รันผ่าน Docker บน Synology Container Manager
1. ไปที่ Cloudflare Dashboard > **Zero Trust** > **Networks** > **Tunnels**
2. กด **Create a Tunnel** > เลือกชื่อเช่น `smartmso-lan-tunnel`
3. เลือกสภาพแวดล้อมเป็น **Docker** และคัดลอกคำสั่งที่มี `token`
4. SSH เข้า Synology NAS (`ssh admin@192.168.162.26`) แล้วรันสคริปต์ที่เตรียมไว้ให้:
   ```bash
   chmod +x cloudflare/synology-cloudflared-setup.sh
   ./cloudflare/synology-cloudflared-setup.sh <YOUR_CLOUDFLARE_TUNNEL_TOKEN>
   ```
5. หรือใช้ [docker-compose.tunnel.yml](file:///c:/Users/GuitarDev/virtual-office/cloudflare/docker-compose.tunnel.yml):
   ```bash
   CLOUDFLARE_TUNNEL_TOKEN="your_token_here" docker compose -f cloudflare/docker-compose.tunnel.yml up -d
   ```

#### วิธีที่ 2.2: กำหนด Public Hostname ใน Zero Trust Dashboard
- **Service 1 (Web App):**
  - Subdomain: `www` (หรือ `@`)
  - Domain: `smso.site`
  - Type: `HTTP`
  - URL: `localhost:3000` (หรือ IP เครื่องเซิร์ฟเวอร์ที่รัน Next.js)
- **Service 2 (Synology DSM):**
  - Subdomain: `nas`
  - Domain: `smso.site`
  - Type: `HTTP`
  - URL: `192.168.162.26:5000`
  - Additional settings > HTTP Settings > เปิด **No TLS Verify** (หากใช้ HTTPS:5001)

---

### 📌 ขั้นตอนที่ 3: เปิดใช้งาน Cloudflare Turnstile
1. ไปที่ Cloudflare Dashboard > **Turnstile** > **Add Site**
2. ตั้งชื่อ Site Name: `Smart MSO Login Guard`
3. ใส่ Domain: `www.smso.site` (และ `localhost` สำหรับการทดสอบในเครื่อง)
4. เลือกโหมด: **Managed** (ตรวจจับอัตโนมัติ ไม่รบกวนผู้ใช้งาน)
5. รับค่า Site Key และ Secret Key แล้วนำมากำหนดใน `.env.local` หรือ Vercel Environment Variables:
   ```env
   NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=0x4AAAAAAA...
   CLOUDFLARE_TURNSTILE_SECRET_KEY=0x4AAAAAAA...
   ```

*(หมายเหตุ: โค้ดของระบบมี Default Test Key ที่ผ่านฉลุยสำหรับการทดสอบในโหมด Dev เรียบร้อยแล้ว)*

---

### 📌 ขั้นตอนที่ 4: ตั้งค่านโยบายความปลอดภัย WAF (Geo-blocking & DDoS Protection)
1. ไปที่ Cloudflare Dashboard > โดเมนของคุณ > **Security** > **WAF** > **Custom Rules**
2. กด **Create Rule**:
   - **Rule Name:** `Enforce Thai Traffic & Block Malicious Foreign Requests`
   - **Expression:**
     ```text
     (ip.geoip.country ne "TH" and not cf.client.bot)
     ```
   - **Action:** เลือก `Managed Challenge` (ผู้ใช้ต่างชาติที่ถูกกฎหมายยังสามารถผ่านได้ด้วยการแก้ Challenge สั้นๆ แต่บอทต่างชาติจะถูกสกัดกั้นทันที)
3. สำหรับ Route ที่สำคัญเช่น `/api/nas/*` และ `/api/auth/*`:
   - ไปที่ **Security** > **WAF** > **Rate Limiting Rules**
   - ตั้งค่าจำกัดคำขอไม่เกิน 30 requests ต่อ 1 นาที ต่อ 1 IP เพื่อป้องกันการ Brute-force รหัสผ่าน

---

### 📌 ขั้นตอนที่ 5: ตั้งค่า Caching Rules สำหรับคลังภาพและเอกสารแนบ Synology
1. ไปที่ Cloudflare Dashboard > **Caching** > **Cache Rules**
2. กด **Create Cache Rule**:
   - **Rule Name:** `Cache Synology Media & Chat Attachments`
   - **Expression:**
     ```text
     (http.host eq "www.smso.site" and starts_with(http.request.uri.path, "/api/nas/photos")) or
     (http.host eq "nas.smso.site" and starts_with(http.request.uri.path, "/webapi/entry.cgi"))
     ```
   - **Edge TTL:** `Override origin` -> กำหนด `7 Days`
   - **Browser TTL:** `4 Hours`
3. **ผลลัพธ์:** เมื่อเจ้าหน้าที่หลายคนเปิดดูรูปถ่ายกิจกรรมหรือดาวน์โหลดเอกสารเดียวกัน Cloudflare จะส่งไฟล์จาก Edge Data Center ท้องถิ่นทันที โดยไม่ต้องดึงซ้ำจากฮาร์ดดิสก์ของ Synology NAS ที่สำนักงาน ช่วยลดภาระอินเทอร์เน็ตของหน่วยงานได้อย่างมหาศาล

---

## 📦 4. รายการไฟล์ที่สร้างและพร้อมใช้งานทันทีในโปรเจ็ค

1. [components/auth/TurnstileWidget.tsx](file:///c:/Users/GuitarDev/virtual-office/components/auth/TurnstileWidget.tsx): คอมโพเนนต์ Turnstile แบบ Interactive พร้อมระบบโหลดสคริปต์อัตโนมัติและ Auto-fallback
2. [app/api/auth/turnstile/verify/route.ts](file:///c:/Users/GuitarDev/virtual-office/app/api/auth/turnstile/verify/route.ts): API Route ฝั่งเซิร์ฟเวอร์สำหรับตรวจสอบความถูกต้องของ Token กับ Cloudflare Siteverify API
3. [components/auth/LoginPage.tsx](file:///c:/Users/GuitarDev/virtual-office/components/auth/LoginPage.tsx): ผสาน Turnstile Widget และระบบตรวจสอบความปลอดภัยเข้ากับฟอร์มล็อกอิน Synology NAS และ Supabase
4. [cloudflare/config.yml](file:///c:/Users/GuitarDev/virtual-office/cloudflare/config.yml): ไฟล์คอนฟิก Ingress Rules สำหรับ Cloudflare Tunnel
5. [cloudflare/docker-compose.tunnel.yml](file:///c:/Users/GuitarDev/virtual-office/cloudflare/docker-compose.tunnel.yml): Docker Compose สำหรับรัน `cloudflared` daemon
6. [cloudflare/synology-cloudflared-setup.sh](file:///c:/Users/GuitarDev/virtual-office/cloudflare/synology-cloudflared-setup.sh): สคริปต์คำสั่งเดียวสำหรับรัน Cloudflare Tunnel บน Synology DSM 7+
7. [.env.example](file:///c:/Users/GuitarDev/virtual-office/.env.example): อัปเดตตัวแปรสภาพแวดล้อมที่จำเป็นสำหรับ Cloudflare Suite
