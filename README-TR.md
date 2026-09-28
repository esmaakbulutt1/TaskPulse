# TaskPulse

> 🇬🇧 English: [README.md](README.md)

**TaskPulse**, NestJS 11 ve Next.js 16 (React 19) üzerine kurulu; Drizzle ORM (PostgreSQL), gerçek zamanlı WebSocket bildirimleri ve otomatik arka plan zamanlayıcısı (Scheduler) ile donatılmış modern, tam teşekküllü (full-stack) bir görev takip ve bildirim platformudur. Proje bir **pnpm monorepo** olarak yapılandırılmıştır.

---

## 🚀 Öne Çıkan Özellikler

- **Full-Stack Monorepo**: Tek çatı altında `apps/api` (NestJS REST & WebSocket API), `apps/web` (Next.js 16 App Router frontend) ve `packages/shared` (ortak tipler, sabitler ve tip güvenli API istemcisi).
- **Gerçek Zamanlı Bildirimler & Scheduler**:
  - `@nestjs/schedule` ile çalışan Cron zamanlayıcı (`NotificationsScheduler`), süresi gelen görevleri arka planda tespit eder.
  - PostgreSQL transaction ve benzersiz anahtarlar (`(taskId, type)`) ile mükerrer bildirim ve yarış koşulları (race conditions) engellenir.
  - Saf WebSocket (`ws://.../ws`) altyapısı ile anlık `task.due` push bildirimleri gönderilir.
  - Frontend tarafında tarayıcı sesli alarmı (`alarm-sound`), açılır modal pencere (`DueAlertModal`) ve çan ikonu (`NotificationBell`) üzerinde dinamik okunmamış bildirim sayacı.
- **Görev Yönetimi (Tasks CRUD)**:
  - Görev oluşturma, listeleme, filtreleme, sayfalama ve detay görüntüleme.
  - Durum takibi (`pending`, `in_progress`, `completed`) ve yumuşak silme (`is_deleted`).
- **Gelişmiş Çift Taşımalı JWT Auth**:
  - **Web için**: XSS açıklarına karşı korumalı `httpOnly` cookie'ler (access token 15 dk, refresh token 30 gün).
  - **Mobil / Harici API için**: HTTP header'ında taşınan `Bearer` token desteği (`/api/v1/auth/mobile/*`).
  - Veritabanı kayıtlı token rotasyonu (rotation), token çalınma tespiti (reuse detection) ve 10 saniyelik grace window.
  - Rol tabanlı yetkilendirme (RBAC: `admin`, `user`).
- **Modern & Zengin Kullanıcı Deneyimi (Next.js 16)**:
  - Görevler, Görev Detay, Bildirimler ve Profil sayfaları.
  - Next.js `middleware.ts` ile otomatik oturum kontrolü ve rota koruma.
  - Çoklu dil (i18n) desteği: Türkçe (`TR`) ve İngilizce (`EN`) arayüz çevirileri (`LanguageContext`).
- **Medya & Avatar Yükleme**: Sharp kütüphanesi ile otomatik WebP optimizasyonu ve EXIF (konum/cihaz) verilerinin temizlenmesi.
- **Gözlemlenebilirlik & Loglama**: Winston ile günlük döndürülen ve sıkıştırılan dosya logları (`app-%DATE%.log`, `error-%DATE%.log`).
- **Standart API Mimarisi**: Global yanıt dönüştürücü interceptor (`ResponseTransformInterceptor`), global hata yakalayıcı (`AllExceptionsFilter`) ve Swagger (`/api/docs`).

---

## ⚡ Hızlı Başlangıç

### Gereksinimler

- **Node.js** >= 22
- **pnpm** >= 11 (tercihen v11.9.0)
- **Docker** & **Docker Compose**

### 1. Kurulum Adımları

```bash
# 1. Ortam değişkenlerini hazırla
cp .env.example .env

# 2. Bağımlılıkları kur
pnpm install

# 3. Geliştirme veritabanını başlat (sadece PostgreSQL)
docker compose -f docker-compose.dev.yml up -d

# 4. Shared paketini derle (API ve Web shared paketinin dist çıktısını kullanır)
pnpm --filter shared build

# 5. Veritabanı tablolarını ve migration'ları uygula
pnpm --filter api db:migrate

# 6. Geliştirme sunucularını başlat (API :3000 ve Web :3001 paralel çalışır)
pnpm dev
```

### 2. İlk Kullanıcıyı Oluşturma

Sisteme ilk yönetici veya kullanıcıyı iki farklı yoldan ekleyebilirsiniz:

**Yol A: CLI Scripti ile (Hızlı):**
```bash
pnpm --filter api user:create admin@example.com secret123 "Admin" admin
```

**Yol B: Web Arayüzü ile:**
Tarayıcınızda [http://localhost:3001/register](http://localhost:3001/register) adresine giderek doğrudan yeni bir kullanıcı hesabı oluşturabilirsiniz.

### 3. Erişim Noktaları

| Servis | URL | Açıklama |
| --- | --- | --- |
| 🌐 **Web Uygulaması** | [http://localhost:3001](http://localhost:3001) | Next.js 16 kullanıcı arayüzü |
| 📚 **Swagger API Docs** | [http://localhost:3000/api/docs](http://localhost:3000/api/docs) | Etkileşimli REST API dokümantasyonu |
| 🩺 **Sağlık Kontrolü** | [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health) | Veritabanı bağlantı sağlık kontrolü |
| 🔌 **WebSocket Gateway** | `ws://localhost:3000/ws` | Gerçek zamanlı olay soketi |

---

## 💻 Komutlar

| Komut | Dizin / Kapsam | Açıklama |
| --- | --- | --- |
| `pnpm dev` | Kök | `apps/api` ve `apps/web` servislerini paralel başlatır |
| `pnpm build` | Kök | Tüm paketleri derler (`shared`, `api`, `web`) |
| `pnpm check` | Kök | Tüm monorepo genelinde TypeScript tip kontrolü yapar |
| `pnpm lint` | Kök | ESLint kurallarını çalıştırır |
| `pnpm format` | Kök | Prettier ile tüm kodları formatlar |
| `pnpm --filter shared build` | packages/shared | Shared paketini TypeScript ile derler (`dist/`) |
| `pnpm --filter api db:generate` | apps/api | Şema dosyalarından yeni SQL migration'ı üretir |
| `pnpm --filter api db:migrate` | apps/api | Bekleyen Drizzle migration'larını veritabanına yazar |
| `pnpm --filter api db:studio` | apps/api | Drizzle Studio veritabanı GUI arayüzünü açar |
| `pnpm --filter api user:create <email> <şifre> <ad> [rol]` | apps/api | Terminalden hızlıca kullanıcı oluşturur |

---

## 🏛️ Proje Mimarisi ve Dizin Düzeni

```text
taskPulse/
├── apps/
│   ├── api/                     # NestJS 11 Backend Uygulaması
│   │   ├── src/
│   │   │   ├── main.ts          # Bootstrap: CORS, Cookie, Pipes, Filters, WS Adapter, Swagger
│   │   │   ├── app.module.ts    # Uygulama modül orkestrasyonu
│   │   │   ├── core/            # Uygulama genel altyapı katmanı
│   │   │   │   ├── config/      # Joi ile env validasyonu & Winston konfigürasyonu
│   │   │   │   ├── db/          # Drizzle veritabanı modülü, şemalar ve migration'lar
│   │   │   │   ├── health/      # DB ping sağlık kontrolü endpoint'i
│   │   │   │   ├── http/        # Guard'lar, Decorator'lar, Filter'lar, Interceptor'lar
│   │   │   │   ├── realtime/    # EventsGateway (Saf WebSocket sunucusu)
│   │   │   │   ├── security/    # TokenService (JWT imzalama / doğrulama)
│   │   │   │   ├── storage/     # StorageService (Sharp ile WebP görsel işleme & disk yönetimi)
│   │   │   │   └── utils/       # Yardımcı fonksiyonlar (şifreleme, süre parse etme vb.)
│   │   │   └── modules/         # Ürün / İş mantığı modülleri
│   │   │       ├── auth/        # Oturum açma, kayıt, cookie & bearer token servisleri
│   │   │       ├── tasks/       # Görev CRUD, filtreleme, sayfalama ve durum yönetimi
│   │   │       ├── notifications/# Bildirim yönetimi & NotificationsScheduler (Cron)
│   │   │       ├── uploads/     # Profil/dosya yükleme endpoint'leri
│   │   │       └── example/     # Referans başlangıç modülü
│   │   └── Dockerfile           # API production Docker imajı
│   │
│   └── web/                     # Next.js 16 (React 19) Frontend Uygulaması
│       ├── src/
│       │   ├── app/             # Next.js App Router sayfaları
│       │   │   ├── page.tsx     # Ana sayfa / Görev özeti
│       │   │   ├── register/    # Giriş yap ve Kayıt ol sayfası
│       │   │   ├── tasks/       # Görev listesi ve yeni görev formu
│       │   │   ├── tasks/[id]/  # Görev detay, güncelleme ve silme sayfası
│       │   │   ├── notifications/# Bildirim merkezi ve toplu okundu işaretleme
│       │   │   └── profile/     # Kullanıcı profil bilgileri ve avatar yükleme
│       │   ├── components/      # UI Bileşenleri (Navbar, TopBar, DueAlertModal, NotificationBell)
│       │   ├── context/         # React Context (LanguageContext: TR / EN)
│       │   ├── constants/       # Arayüz sabitleri ve çeviri sözlükleri (ui.ts, ui.en.ts)
│       │   ├── hooks/           # Özel hook'lar (useTaskDueSocket)
│       │   ├── lib/             # API istemcisi, Web Audio alarmı (alarm-sound), formatlayıcılar
│       │   └── middleware.ts    # Sayfa erişim ve oturum kontrolü middleware'i
│       └── .env.local           # Web ortam değişkenleri (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL)
│
├── packages/
│   └── shared/                  # Ortak Sözleşme Kütüphanesi
│       ├── src/
│       │   ├── api-client/      # createApiClient (Web cookie) & createMobileApiClient (Bearer)
│       │   ├── constants/       # TASK_STATUSES, NOTIFICATION_TYPES, USER_ROLES vb.
│       │   └── types/           # Task, Notification, User, ApiResponse arayüzleri
│       └── package.json
│
├── docker-compose.dev.yml       # Geliştirme için PostgreSQL konteyneri
├── docker-compose.yml           # Canlı ortam (Traefik + API + Postgres) konfigürasyonu
└── pnpm-workspace.yaml          # pnpm monorepo tanımı
```

### İki Temel Mimari Kural

1. **Modüller birbirine sadece `index.ts` üzerinden ulaşır**: `modules/tasks/` altından `modules/auth/auth.service` dosya yolu doğrudan import edilmez; `modules/auth` barrel dosyası kullanılır.
2. **`core` hiçbir modüle bağlı değildir**: `core` katmanı iş modüllerinden tamamen bağımsızdır; genel altyapı hizmeti sunar.

---

## 🔔 Görev & Gerçek Zamanlı Bildirim Mekanizması

Uygulamanın kalbini oluşturan görev zamanı takibi ve anlık bildirim akışı şu şekilde işler:

```text
[Kullanıcı] -> Görev Oluşturur (dueAt: Belirlenen Zaman)
                      │
                      ▼ (Her saniye)
       [NotificationsScheduler (Cron)]
                      │
   dueAt <= ŞİMDİ && status != 'completed' && reminderSentAt == null
                      │
                      ▼ (Veritabanı Transaction'ı)
     ┌──────────────────────────────────────────────────────────┐
     │ 1. tasks tablosunda reminderSentAt = NOW güncellenir     │
     │ 2. notifications tablosuna 'task_due' kaydı eklenir      │
     └──────────────────────────────────────────────────────────┘
                      │
                      ▼ (WebSocket)
             [EventsGateway.sendToUser]
                      │
                      ▼ 'task.due' Eventi
       [Next.js Client: useTaskDueSocket]
                      │
     ┌────────────────┴─────────────────────────────────────────┐
     │ 🔊 playAlarmSound() -> Tarayıcıda sesli uyarı çalar      │
     │ 💬 DueAlertModal    -> Ekranda açılır bildirim penceresi │
     │ 🔔 NotificationBell -> Okunmamış sayaç rozeti artar      │
     └──────────────────────────────────────────────────────────┘
                      │
                      ▼ (Bildirime tıklandığında)
     [PATCH /api/v1/notifications/:id/read] -> Görev Detayına Yönlendirme (/tasks/:id)
```

1. **Planlama**: Kullanıcı yeni bir görev oluştururken bir son teslim / hatırlatıcı tarihi (`dueAt`) belirler.
2. **Zamanlayıcı (Scheduler)**: `apps/api/src/modules/notifications/notifications.scheduler.ts` içinde tanımlı `@Cron(CronExpression.EVERY_SECOND)` her saniye arka planda tetiklenir.
3. **Yarış Koşulu Koruması & Atomik Claim**: Aynı göreve mükerrer bildirim gitmesini engellemek için işlem bir PostgreSQL transaction'ı içinde yürütülür; `reminderSentAt` kolonu atanır ve `(taskId, type)` unique kısıtı ile bildirim satırı üretilir.
4. **WebSocket İletimi**: `EventsGateway` üzerinden hedeflenen kullanıcının açık soketine `task.due` tipinde veri fırlatılır.
5. **Arayüz Tepkisi**:
   - `useTaskDueSocket` hook'u gelen veriyi yakalar.
   - Web Audio API ile kullanıcıya sesli bir alarm (`playAlarmSound`) dinletilir.
   - `DueAlertModal` açılarak kullanıcının dikkatine sunulur.
   - Çan ikonundaki rozet (`NotificationBell`) anında güncellenir.
6. **Okundu Durumu**: Kullanıcı bildirime tıkladığında bildirim okundu olarak işaretlenir ve doğrudan ilgili görevin detay sayfasına yönlendirilir.

---

## 🔐 Kimlik Doğrulama & Güvenlik Mimarisi

TaskPulse, iki farklı istemci türü için optimize edilmiş çift taşımalı JWT mimarisi kullanır:

### 1. Web İstemcisi (Tarayıcı Güvenliği)
- **Token'lar response body'sinde ASLA bulunmaz.**
- Tarayıcının JavaScript ile erişemeyeceği `httpOnly`, `SameSite=Lax`, `Secure` cookie'lerde saklanır (`access_token` ve `refresh_token`). Böylece XSS saldırılarında oturum token'ları çalınamaz.
- Access token 15 dakika, refresh token 30 gün geçerlidir.

### 2. Mobil & Harici API İstemcisi
- Cookie desteği olmayan istemciler için `/api/v1/auth/mobile/*` endpoint ailesi mevcuttur.
- Giriş ve refresh isteklerinde token'lar doğrudan JSON yanıt gövdesinde (`{ accessToken, refreshToken }`) döner ve `Authorization: Bearer <token>` başlığıyla taşınır.

### 3. Token Rotasyonu & Yeniden Kullanım Tespiti (Reuse Detection)
- Her token yenileme (`refresh`) isteğinde mevcut refresh token veritabanında yakılır (`used_at`) ve yeni bir çift üretilir.
- Kullanılmış bir refresh token tekrar gönderilirse, sistem çalınma şüphesiyle o token ailesine (`family_id`) ait **bütün oturumları anında iptal eder**.
- Ağ gecikmeleri ve paralel sekmelerden doğabilecek yarış koşullarını tolere etmek için 10 saniyelik bir *grace window* bulunur.

---

## 📡 API Endpoint Özeti

Tüm iş istekleri `/api/v1` ön eki ile servis edilir (statik yüklemeler hariç):

### Kimlik Doğrulama (`/api/v1/auth`)
- `POST /api/v1/auth/register` — Yeni kullanıcı kaydı (Cookie)
- `POST /api/v1/auth/login` — Kullanıcı girişi (Cookie)
- `POST /api/v1/auth/refresh` — Access token yenileme (Cookie rotasyonu)
- `POST /api/v1/auth/logout` — Çıkış yapma ve token ailesini iptal etme
- `GET /api/v1/auth/me` — Giriş yapmış kullanıcının profil bilgileri
- `PATCH /api/v1/auth/me` — Profil güncelleme (ad, soyad, doğum tarihi)
- `POST /api/v1/auth/mobile/*` — Mobil/Bearer tabanlı auth varyantları

### Görevler (`/api/v1/tasks`)
- `GET /api/v1/tasks` — Kendi görevlerini sayfalı ve filtreli listeleme (`page`, `limit`, `status`, `search`)
- `POST /api/v1/tasks` — Yeni görev oluşturma (`title`, `description`, `dueAt`)
- `GET /api/v1/tasks/:id` — Görev detayını getirme
- `PATCH /api/v1/tasks/:id` — Görev güncelleme (başlık, açıklama, durum, tarih)
- `DELETE /api/v1/tasks/:id` — Görevi yumuşak silme (`is_deleted = true`)

### Bildirimler (`/api/v1/notifications`)
- `GET /api/v1/notifications` — Sayfalı bildirim listesi
- `GET /api/v1/notifications/unread-count` — Okunmamış bildirim adedi
- `PATCH /api/v1/notifications/:id/read` — Tekil bildirimi okundu işaretleme
- `PATCH /api/v1/notifications/read-all` — Tüm bildirimleri toplu okundu işaretleme

### Medya Yükleme (`/api/v1/uploads`)
- `POST /api/v1/uploads/image` — Multipart resim yükleme (Sharp ile WebP'ye dönüştürülür)
- Dosyalar `/api/uploads/:userId/:filename` adresinden statik olarak sunulur.

---

## 🗄️ Veritabanı ve Drizzle ORM

Şemalar `apps/api/src/core/db/schema/` altında modüler olarak yer alır:
- `users`: Kullanıcı hesapları, şifre hash'leri, profil bilgileri ve roller.
- `tasks`: Görev bilgileri, durum enum'ı (`pending`, `in_progress`, `completed`), son tarih (`due_at`) ve `reminder_sent_at`.
- `notifications`: Üretilen bildirimler, `task_id` ilişkisi, okunma zamanı (`read_at`) ve tip (`task_due`).
- `refresh_tokens`: Oturum takibi, rotasyon zinciri ve token aileleri (`family_id`).

### Migration Akışı

```bash
# 1. apps/api/src/core/db/schema/ altında bir dosyayı düzenle
# 2. SQL migration dosyasını otomatik üret:
pnpm --filter api db:generate

# 3. Migration'ı veritabanına uygula:
pnpm --filter api db:migrate

# 4. Veritabanını görsel arayüzde incelemek için:
pnpm --filter api db:studio
```

---

## 📦 Shared Paketi ve API İstemcisi

`packages/shared` paketi, Next.js frontend ve NestJS backend arasındaki tip uyuşmazlıklarını sıfıra indirir:
- **Sabitler ve Tipler**: `TASK_STATUSES`, `NOTIFICATION_TYPES`, `USER_ROLES` gibi sabitler her iki tarafta da aynı kaynaktan tüketilir.
- **Tek Merkezli API İstemcisi (`api.ts`)**:
  - `createApiClient`: Next.js tarafında `credentials: 'include'` ile otomatik cookie iletimi yapar.
  - Bir istek `401 Unauthorized` aldığında, kuyruk mantığıyla tek seferlik (*single-flight*) arka plan token yenileme isteği gerçekleştirir ve orijinal isteği otomatik yineler.

---

## 🌐 Çoklu Dil Desteği (i18n)

TaskPulse web arayüzü tam yerelleştirme desteği sunar:
- `apps/web/src/context/language-context.tsx`: Oturum boyunca seçilen dili (`tr` veya `en`) tarayıcıda hatırlar.
- `apps/web/src/constants/ui.ts` & `ui.en.ts`: Butonlardan modal metinlerine, hata mesajlarından bildirim başlıklarına kadar tüm metinler iki dilde eksiksiz tanımlanmıştır.

---

## 🚢 Canlı Ortam (Production) Dağıtımı

Canlı ortam kurulumu `docker-compose.yml` dosyası üzerinden yürütülür. Sistem, önünde çalışan ve `traefik-net` harici ağına sahip bir Traefik reverse proxy varsayımıyla kurgulanmıştır:

```bash
# 1. Gerçek production değişkenlerini ayarla
cp .env.example .env

# 2. Servisleri derle ve arka planda ayağa kaldır
docker compose up -d --build

# 3. Canlı veritabanı migration'larını çalıştır
docker compose exec api node dist/core/db/migrate.js
```

- PostgreSQL veritabanı sadece `internal` ağındadır, dış dünyaya kapalıdır.
- Medya yüklemeleri kalıcı bir Docker volume'ünde (`uploads:/app/uploads`) korunur.
- Canlı ortamda `NODE_ENV=production` olduğunda Swagger arayüzü güvenlik amacıyla otomatik olarak devre dışı bırakılır.

---

## 📝 Commit Standartları

Projeye yapılan katkılarda **Conventional Commits** kuralına uyulur:
`<tip>(<kapsam>): <açıklama>`

- `feat`: Yeni bir özellik, endpoint veya sayfa ekleme
- `fix`: Hata giderme
- `docs`: Dokümantasyon güncellemeleri
- `refactor`: Davranış değiştirmeyen kod iyileştirmeleri
- `style`: Kod formatı, Prettier düzenlemeleri
- `chore`: Paket bağımlılıkları veya konfigürasyon değişiklikleri

*Örnekler:*
```text
feat(tasks): add status filter to list query
feat(notifications): trigger alarm sound on task.due socket event
fix(auth): clear refresh token cookie on proper path
docs: update README with TaskPulse features and scheduler details
```