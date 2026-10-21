# 🛡️ แผนแม่บทสถาปัตยกรรม Cloudflare Integration (Smart MSO & Synology NAS)

> **เวอร์ชัน:** v2.0.0 (Updated Interface & Direct NAS Upload CORS Architecture)  
> **เป้าหมาย:** ปกป้องระบบ Virtual Office ด้วยเครือข่ายระดับโลกของ Cloudflare, เชื่อมต่อ On-Premise Synology NAS ผ่าน Zero Trust Tunnel โดยไม่ต้องเปิด Port Forwarding, รองรับการอัปโหลดไฟล์ขนาดใหญ่ตรงสู่ NAS (สูงสุด 100 MB) และป้องกันการโจมตี/บอทด้วย WAF Geo-blocking และ Cloudflare Turnstile

---

## 📐 1. แผนผังภาพรวมสถาปัตยกรรม (System Architecture)

```mermaid
graph TD
    User["🌐 ผู้ใช้งานทั่วไป / ข้าราชการ พมจ."] --> CF_Edge["Cloudflare Edge Network (Global Anycast DNS)"]
    
    subgraph Cloudflare Protection & Routing Layer
        CF_Edge --> WAF["Cloudflare WAF (Custom Rules: Geo-blocking TH Only + DDoS Shield)"]
        WAF --> Turnstile["Cloudflare Turnstile (Smart Bot Defense on Login)"]
        Turnstile --> Transform["Transform Rules (CORS Header Injection for nas.smso.site)"]
        Transform --> CDN["Cache Rules (Edge Cache for Static Assets & Cached NAS Media)"]
    end
    
    CDN -->|www.smso.site (CNAME)| Vercel["Vercel Cloud Platform (Next.js 16 Web App)"]
    Vercel --> Supabase["Supabase Cloud Database & GoTrue Auth"]
    
    User -.->|Direct Upload > 4.5MB up to 100MB| CF_Edge
    CDN -->|nas.smso.site (Tunnel / Ingress)| Tunnel_NAS["Cloudflare Tunnel (cloudflared daemon)"]
    
    subgraph On-Premise Office LAN (192.168.162.x)
        Tunnel_NAS --> Synology["Synology NAS DSM 7+ (192.168.162.26:5000)"]
    end
```

---

## 🔑 2. มติข้อสรุปจากการออกแบบร่วม (Architecture Alignment Summary)

| มิติ (Dimension) | ทางเลือกที่กำหนด | คำอธิบายและเหตุผลทางสถาปัตยกรรม |
|---|---|---|
| **สถาปัตยกรรมการโฮสต์** | **Vercel (Global Edge) + Cloudflare Proxy** | Web App รันบน Vercel 100% พร้อม CDN และ Auto-scaling โดยมี Cloudflare คลุมหน้า |
| **Cloudflare Tunnel** | **Dedicated NAS Ingress** | รัน `cloudflared` บน Synology NAS เพื่อให้ Vercel และผู้ใช้ภายนอกเข้าถึง DMS/Photos อย่างปลอดภัย |
| **โครงสร้างโดเมน** | **แยก Subdomain ชัดเจน** | `smso.site` / `www.smso.site` (Vercel CNAME) และ `nas.smso.site` (Cloudflare Tunnel) |
| **Direct Client-to-NAS Upload** | **Bypass Vercel 4.5MB Payload Limit** | ไฟล์ขนาดใหญ่ (> 4.5 MB ถึง 100 MB เช่น วิดีโอ/ภาพดิบ) ส่งตรงจากเบราว์เซอร์สู่ `https://nas.smso.site` โดยเปิด CORS ผ่าน Cloudflare Transform Rules |
| **Bot Protection** | **Cloudflare Turnstile** | ฝัง Turnstile Widget บนหน้า Login (ทั้งแบบ Synology Auth และ Supabase Auth) |
| **WAF & Security** | **Geo-blocking (TH Only)** | อนุญาตทราฟฟิกหลักจากประเทศไทย (TH) และสกัดกั้นกลุ่ม IP อันตรายจากต่างประเทศ |
| **การจัดเก็บไฟล์** | **Synology NAS + Edge Cache** | จัดเก็บไฟล์ลงเครื่อง NAS ที่สำนักงานเหมือนเดิม โดย Vercel เรียกผ่าน `https://nas.smso.site` |

---

## 🗺️ 3. แผนที่เมนู Cloudflare Interface (Dashboard Sitemap ปัจจุบัน)

Cloudflare แบ่งหน้าต่างการจัดการออกเป็น **2 แพลตฟอร์มหลัก** ซึ่งมีเมนูและตำแหน่งที่แตกต่างกันอย่างสิ้นเชิง:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Cloudflare Main Dashboard (https://dash.cloudflare.com)             │
│    └─ smso.site (เลือกโดเมน)                                           │
│       ├─ DNS (Records: CNAME nas, www, @)                              │
│       ├─ SSL/TLS (Edge Certificates, Overview: Full/Flexible)          │
│       ├─ Security > WAF > Custom Rules (Geo-blocking TH)               │
│       ├─ Rules > Transform Rules > Modify Response Header ⭐ (CORS)     │
│       └─ Caching > Cache Rules (Edge Media Caching)                    │
│    └─ Account-level Menu (แถบซ้ายนอกสุด)                                │
│       ├─ Turnstile (สร้าง Site Key & Secret Key)                       │
│       └─ Zero Trust (ปุ่มลัดข้ามไปยัง Zero Trust Dashboard)            │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Cloudflare Zero Trust Dashboard (https://one.dash.cloudflare.com)   │
│    ├─ Networks > Tunnels (จัดการ Cloudflare Tunnel & cloudflared)       │
│    ├─ Access > Applications (Self-hosted apps protection)              │
│    └─ Settings > WARP Client                                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 4. ขั้นตอนการติดตั้งและตั้งค่าระบบ (Step-by-Step Implementation)

### 📌 ขั้นตอนที่ 1: การตั้งค่า DNS & Cloudflare Zone
1. เข้าสู่ **[Cloudflare Dashboard](https://dash.cloudflare.com)**
2. คลิกเลือกโดเมน **`smso.site`**
3. ไปที่เมนู **DNS** > **Records**:
   - `nas.smso.site` ➔ CNAME ชี้ไปยัง `<TUNNEL_ID>.cfargotunnel.com` (เปิด **Proxy status: Proxied ☁️ สีส้ม**)
   - `smso.site` ➔ CNAME ชี้ไปยัง Vercel (`cname.vercel-dns.com` หรือรหัส Vercel)
   - `www.smso.site` ➔ CNAME ชี้ไปยัง Vercel

---

### ⭐ ขั้นตอนที่ 2 (สำคัญมาก): การเปิด CORS Header เพื่อรองรับ Direct Client-to-NAS Upload (สูงสุด 100 MB)

> ⚠️ **ปัญหาที่พบหากไม่ตั้งค่านี้:** เบราว์เซอร์จะบล็อกการอัปโหลดไฟล์วิดีโอหรือไฟล์เอกสารขนาดใหญ่ (> 4.5 MB) ด้วยข้อผิดพลาด `CORS Policy: No 'Access-Control-Allow-Origin' header is present on the requested resource` เนื่องจาก `nas.smso.site` เป็นคนละ Origin กับเว็บหลัก `smso.site`

**วิธีตั้งค่าผ่าน Transform Rules (ทำได้ทันทีบน Main Dashboard ไม่ต้องยุ่งกับ Zero Trust):**
1. เข้า **[Cloudflare Dashboard](https://dash.cloudflare.com)** ➔ เลือกโดเมน **`smso.site`**
2. ที่แถบเมนูซ้ายมือ เลือก **Rules (กฎ)** ➔ **Transform Rules**
3. ที่แท็บด้านบน เลือกแท็บ **Modify Response Header** *(ปรับเปลี่ยนส่วนหัวการตอบกลับ)*
4. คลิกปุ่มสีฟ้า **Create rule**
5. ตั้งชื่อกฎ:
   ```text
   Allow CORS for Synology NAS
   ```
6. ที่หัวข้อ **When incoming requests match...** ให้คลิกลิงก์สีฟ้า **Edit expression** แล้ววางโค้ดนี้:
   ```text
   http.host eq "nas.smso.site"
   ```
7. ที่หัวข้อ **Modify response headers** ด้านล่าง คลิก **+ Add** เพื่อเพิ่ม 3 รายการ:

   | Type | Header name | Value |
   | :--- | :--- | :--- |
   | **Set static** | `Access-Control-Allow-Origin` | `*` |
   | **Set static** | `Access-Control-Allow-Methods` | `GET, POST, PUT, DELETE, OPTIONS, HEAD` |
   | **Set static** | `Access-Control-Allow-Headers` | `*` |

8. เลื่อนลงไปล่างสุด คลิกปุ่ม **Deploy**

---

### 📌 ขั้นตอนที่ 3: ติดตั้งและตั้งค่า Cloudflare Tunnel บน Synology NAS

#### ความเข้าใจเรื่องประเภทของ Tunnel:
- **Cloudflare-managed Tunnel (สร้างผ่าน Web UI):** มีแท็บ *Public Hostname* อยู่ในหน้า Zero Trust Dashboard (Networks > Tunnels)
- **Locally-managed Tunnel (สร้างผ่าน CLI / `config.yml`):** **จะไม่มีแท็บ Public Hostname** บนหน้าเว็บ เพราะการ Map เส้นทางถูกเขียนไว้ในไฟล์ `config.yml` บนเครื่องเรียบร้อยแล้ว (การตั้งค่า CORS ให้ใช้ขั้นตอนที่ 2 ด้านบน ซึ่งครอบคลุมทุกกรณี)

#### วิธีการรัน Tunnel บน Synology NAS (Container Manager / Docker):
1. ไปที่ **Cloudflare Zero Trust** (`one.dash.cloudflare.com`) > **Networks** > **Tunnels**
2. กด **Create a Tunnel** > เลือกชื่อเช่น `smartmso-nas-tunnel`
3. เลือกรูปแบบ **Docker** แล้วคัดลอกคำสั่ง Token
4. รันผ่านไฟล์สคริปต์ [cloudflare/synology-cloudflared-setup.sh](file:///c:/Users/GuitarDev/virtual-office/cloudflare/synology-cloudflared-setup.sh):
   ```bash
   ./cloudflare/synology-cloudflared-setup.sh <YOUR_CLOUDFLARE_TUNNEL_TOKEN>
   ```
5. หรือใช้ [cloudflare/docker-compose.tunnel.yml](file:///c:/Users/GuitarDev/virtual-office/cloudflare/docker-compose.tunnel.yml):
   ```bash
   CLOUDFLARE_TUNNEL_TOKEN="your_token_here" docker compose -f cloudflare/docker-compose.tunnel.yml up -d
   ```

---

### 📌 ขั้นตอนที่ 4: เปิดใช้งาน Cloudflare Turnstile (ระบบป้องกันบอทอัจฉริยะ)
1. เข้า **Cloudflare Dashboard** ➔ เมนูนอกสุดด้านซ้ายมือเลือก **Turnstile** ➔ **Add Site**
2. ตั้งชื่อ Site Name: `Smart MSO Login Guard`
3. Domain: `smso.site`, `www.smso.site`, และ `localhost`
4. Widget Mode: **Managed**
5. รับค่า Site Key และ Secret Key มาใส่ใน `.env.local` หรือ Vercel Environment Variables:
   ```env
   NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=0x4AAAAAAA...
   CLOUDFLARE_TURNSTILE_SECRET_KEY=0x4AAAAAAA...
   ```

---

### 📌 ขั้นตอนที่ 5: ตั้งค่านโยบายความปลอดภัย WAF (Geo-blocking: TH Only)
1. ไปที่ **Cloudflare Dashboard** > โดเมน **`smso.site`** > **Security** > **WAF** > **Custom Rules**
2. กด **Create Rule**:
   - **Rule Name:** `Allow Thai Traffic & Managed Challenge Foreign Requests`
   - **Expression (Edit expression):**
     ```text
     (ip.geoip.country ne "TH" and not cf.client.bot)
     ```
   - **Action:** เลือก `Managed Challenge`
3. บันทึกและ Deploy

---

### 📌 ขั้นตอนที่ 6: ตั้งค่า Caching Rules สำหรับคลังภาพและเอกสารแนบ Synology
1. ไปที่ **Cloudflare Dashboard** > โดเมน **`smso.site`** > **Caching** > **Cache Rules**
2. กด **Create Cache Rule**:
   - **Rule Name:** `Cache Synology Media & Chat Attachments`
   - **Expression:**
     ```text
     (http.host eq "nas.smso.site" and starts_with(http.request.uri.path, "/webapi/entry.cgi")) or
     (http.host eq "smso.site" and starts_with(http.request.uri.path, "/api/nas/photos"))
     ```
   - **Edge TTL:** `Override origin` -> `7 Days`
   - **Browser TTL:** `4 Hours`
3. **ประโยชน์:** ลดการดึงข้อมูลซ้ำจากฮาร์ดดิสก์ของ Synology NAS ช่วยให้อินเทอร์เน็ตที่สำนักงานเร็วขึ้น และผู้ใช้เปิดดูภาพถ่าย/วิดีโอได้อย่างรวดเร็วผ่าน Cloudflare Edge Cache ในประเทศไทย

---

## 📦 5. รายการไฟล์และโค้ดที่เกี่ยวข้องในโปรเจ็ค

1. [docs/cloudflare-master-plan.md](file:///c:/Users/GuitarDev/virtual-office/docs/cloudflare-master-plan.md): เอกสารแผนแม่บทและคู่มืออ้างอิง Cloudflare Integration
2. [cloudflare/config.yml](file:///c:/Users/GuitarDev/virtual-office/cloudflare/config.yml): ไฟล์คอนฟิก Ingress Rules สำหรับ `cloudflared` บน NAS
3. [cloudflare/docker-compose.tunnel.yml](file:///c:/Users/GuitarDev/virtual-office/cloudflare/docker-compose.tunnel.yml): Docker Compose สำหรับรัน Tunnel Daemon
4. [cloudflare/synology-cloudflared-setup.sh](file:///c:/Users/GuitarDev/virtual-office/cloudflare/synology-cloudflared-setup.sh): สคริปต์ติดตั้ง Tunnel บน Synology DSM 7+
5. [components/auth/TurnstileWidget.tsx](file:///c:/Users/GuitarDev/virtual-office/components/auth/TurnstileWidget.tsx): คอมโพเนนต์ Turnstile แบบ Interactive พร้อมระบบโหลดสคริปต์อัตโนมัติ
6. [app/api/auth/turnstile/verify/route.ts](file:///c:/Users/GuitarDev/virtual-office/app/api/auth/turnstile/verify/route.ts): API Route ตรวจสอบความถูกต้องของ Token กับ Cloudflare Siteverify API
7. [lib/synology.ts](file:///c:/Users/GuitarDev/virtual-office/lib/synology.ts): ระบบ Direct Client-to-NAS Upload และ Fallback Proxy พร้อมระบบตรวจจับ CORS อัจฉริยะ

