# NestJS–Drizzle Starter ile Next.js Görev ve Anlık Bildirim Uygulaması

## 1. Görevin amacı

GitHub'dan alınan `nest-drizzle-starter` projesinin mimarisini öğrenmek ve bu altyapıyı
kullanarak gerçek bir görev takip modülü geliştirmek amaçlanmaktadır. Backend tarafında
NestJS ve Drizzle ORM, frontend tarafında Next.js kullanılacaktır. Görev zamanı geldiğinde
bildirim veritabanına kaydedilecek ve WebSocket aracılığıyla kullanıcıya sayfa
yenilenmeden iletilecektir.

Uygulamanın ana ekranları şunlardır:

1. Görev oluşturma ve görevleri listeleme sayfası
2. Görev detay sayfası
3. Bildirimler sayfası

Header alanında okunmamış bildirim sayısını gösteren bir çan ikonu bulunacaktır.
Bir bildirime tıklandığında yalnızca ilgili bildirim okundu olarak işaretlenecek ve
kullanıcı bağlı görevin detay sayfasına yönlendirilecektir. Ayrıca bildirimler sayfasında
tüm bildirimleri okundu olarak işaretleyen ayrı bir düğme bulunacaktır. Çan ikonundaki
sayı okunmamış bildirim sayısını gösterecektir.

## 2. Mevcut projenin durumu

Bu depo bir **pnpm monorepo** yapısındadır. Yani backend, frontend ve iki tarafın ortak
kullanacağı kodlar tek Git deposunda, ayrı paketler halinde tutulur.

```text
nest-drizzle-starter/
├── apps/
│   ├── api/              # NestJS backend uygulaması
│   └── web/              # Next.js frontend uygulaması
├── packages/
│   └── shared/           # Ortak tipler, sabitler ve API istemcisi
├── docker-compose.dev.yml # Geliştirme PostgreSQL servisi
├── package.json           # Monorepo genel komutları
└── pnpm-workspace.yaml    # Workspace paketlerinin tanımı
```

### Hazır gelen backend özellikleri

- NestJS 11 tabanlı REST API
- PostgreSQL ve Drizzle ORM bağlantısı
- JWT tabanlı kimlik doğrulama
- Web için `httpOnly` cookie ile güvenli oturum yönetimi
- Access ve refresh token yenileme sistemi
- DTO doğrulaması ve Swagger dokümantasyonu
- Kimlik doğrulamalı ham WebSocket altyapısı
- Standart başarılı/hatalı API cevap formatı
- Loglama, dosya yükleme ve rol kontrolü altyapısı

### Frontend'in mevcut durumu

`apps/web` altında Next.js projesi oluşturulmuştur. Mevcut ekranlar görevleri tarayıcının
`localStorage` alanında saklayan bir prototip olarak çalışmaktadır. Bu yöntem yalnızca
arayüzü denemek için uygundur:

- Veriler backend'e veya PostgreSQL'e gitmez.
- Veriler başka tarayıcıda ve başka kullanıcıda görünmez.
- Bildirim, gerçek bir sunucu olayı değildir.
- Tarayıcı verisi silindiğinde görevler de silinir.

Bu görevde `apps/web/src/lib/task-store.ts` ile sağlanan geçici `localStorage` mantığı,
NestJS API ve PostgreSQL entegrasyonuyla değiştirilecektir.

## 3. Starter projenin çalışma mantığı

### 3.1. Bir isteğin izlediği yol

Uygulamadaki temel veri akışı şöyledir:

```text
Next.js sayfası
    ↓
packages/shared içindeki API istemcisi
    ↓ HTTP isteği
NestJS Controller
    ↓ doğrulanmış DTO
NestJS Service
    ↓ Drizzle sorgusu
PostgreSQL
    ↓ sonuç
Service → Controller → standart API cevabı → Next.js
```

- **Controller**, URL'yi ve HTTP metodunu tanımlar; isteği alır ve servisi çağır.
- **DTO**, kullanıcıdan gelen verinin tipini ve kurallarını kontrol eder.
- **Service**, iş kurallarını uygular ve veritabanıyla konuşan tek katmandır.
- **Drizzle schema**, PostgreSQL tablosunun TypeScript karşılığıdır.
- **Migration**, schema değişikliğini gerçek veritabanına uygular.
- **Shared paket**, backend ile frontend'in aynı tip ve sabitleri kullanmasını sağlar.

`apps/api/src/modules/example` klasörü bu akışı öğrenmek için hazırlanmış örnek
modüldür. `tasks` modülü geliştirilirken bu klasörün yapısı örnek alınmalı, ancak
`example` adları doğrudan ürün kodunda kullanılmamalıdır.

### 3.2. NestJS modül yapısı

Yeni görev özelliği aşağıdaki yapıda geliştirilmelidir:

```text
apps/api/src/modules/tasks/
├── dto/
│   ├── create-task.dto.ts
│   ├── update-task.dto.ts
│   └── task-response.dto.ts
├── tasks.controller.ts
├── tasks.service.ts
├── tasks.module.ts
└── index.ts
```

Modül oluşturulduktan sonra `apps/api/src/app.module.ts` içindeki `imports` listesine
`TasksModule` eklenir. Bu dosya uygulamada hangi modüllerin aktif olduğunu gösteren ana
haritadır.

Bu depoda uyulması gereken iki temel mimari kural vardır:

1. Bir modül, başka bir modüle yalnızca o modülün `index.ts` dosyası üzerinden ulaşır.
2. `core` klasörü belirli bir ürün modülüne bağlı olamaz. Genel altyapı `core` içinde,
   görevle ilgili iş kuralları `modules/tasks` içinde bulunur.

### 3.3. Drizzle ORM mantığı

Drizzle, TypeScript ile PostgreSQL tablolarını tanımlamayı ve tip güvenli sorgular yazmayı
sağlar. Tablo dosyaları `apps/api/src/core/db/schema` altındadır.

Yeni bir tablo ekleme sırası:

1. `schema/tasks.ts` veya `schema/notifications.ts` dosyası yazılır.
2. Yeni schema, `schema/index.ts` dosyasından export edilir.
3. `pnpm --filter api db:generate` ile migration üretilir.
4. Üretilen SQL dosyası veri kaybı riski için okunur.
5. `pnpm --filter api db:migrate` ile migration uygulanır.

SQL dosyası elle yazılmamalı ve daha önce uygulanmış migration değiştirilmemelidir. Bir
hata varsa onu düzelten yeni bir migration oluşturulmalıdır.

Service içinde veritabanı bağlantısı şu kalıpla kullanılır:

```ts
constructor(
  @Inject(DRIZZLE) private readonly db: Database,
) {}
```

Controller içinde Drizzle sorgusu yazılmamalıdır. Bütün `select`, `insert`, `update` ve
transaction işlemleri service katmanında kalmalıdır.

### 3.4. Shared paketinin mantığı

`packages/shared`, iki uygulama arasındaki sözleşmedir. Örneğin görev durumları yalnızca
backend'de string olarak yazılırsa frontend ile farklılaşabilir. Bunun yerine görev durumu
ve bildirim türü gibi sabit listeler shared paketinde bir kez tanımlanmalıdır.

Buraya eklenecek temel parçalar:

```text
packages/shared/src/
├── constants/task.ts
├── types/task.ts
├── types/notification.ts
├── api-client/task.service.ts
└── api-client/notification.service.ts
```

Yeni servisler `packages/shared/src/api-client/index.ts` içindeki `createApiClient` sonucuna
eklenmelidir. Böylece frontend ham `fetch` isteklerini her sayfada tekrar yazmak yerine
`api.tasks.create(...)` ve `api.notifications.list(...)` gibi tip güvenli metotlar kullanır.

Shared paketi API tarafından derlenmiş `dist` üzerinden kullanıldığı için ilk çalıştırmada
şu komut gereklidir:

```bash
pnpm --filter shared build
```

Frontend'in de bu paketi kullanabilmesi için `apps/web/package.json` dosyasına
`"shared": "workspace:*"` bağımlılığı eklenmelidir.

## 4. Geliştirilecek backend yapısı

### 4.1. Tasks tablosu

`tasks` tablosu en az aşağıdaki alanları içermelidir:

| Alan                      | Amaç                                         |
| ------------------------- | -------------------------------------------- |
| `id`                      | Görevin UUID kimliği                         |
| `userId`                  | Görevin sahibi                               |
| `title`                   | Görev başlığı                                |
| `description`             | Yapılacak işlerin açıklaması                 |
| `dueAt`                   | Bildirimin oluşacağı son zaman               |
| `status`                  | `pending`, `in_progress` veya `completed`    |
| `reminderSentAt`          | Son tarih bildiriminin üretilip üretilmediği |
| `isDeleted`               | Soft delete kontrolü                         |
| `createdAt` / `updatedAt` | Kayıt zamanları                              |

Veritabanında ve API'de Türkçe metin yerine sabit kodlar (`pending` gibi)
kullanılmalıdır. Türkçe karşılıkları frontend'de gösterilir. Bu yaklaşım daha
sonra farklı dil desteği eklemeyi kolaylaştırır.

Her görev sorgusunda `userId` filtresi bulunmalıdır. Bir kullanıcı URL'deki UUID'yi
değiştirerek başka kullanıcının görevine erişememelidir. Başkasına ait kayıt için
bilgi sızdırmamak adına `403` yerine `404` dönülmelidir.

### 4.2. Notifications tablosu

Bildirim yalnızca WebSocket mesajı olarak tutulmamalıdır. Kullanıcı o anda çevrimdışıysa
mesajı kaçırır. Bu nedenle önce kalıcı olarak PostgreSQL'e yazılmalı, WebSocket sadece
anlık haber verme kanalı olmalıdır.

`notifications` tablosunda en az şu alanlar bulunmalıdır:

| Alan                | Amaç                                      |
| ------------------- | ----------------------------------------- |
| `id`                | Bildirim UUID'si                          |
| `userId`            | Bildirimin sahibi                         |
| `taskId`            | Bildirimin bağlı olduğu görev             |
| `type`              | Örneğin `task_due`                        |
| `title` / `message` | Kullanıcıya gösterilecek içerik           |
| `readAt`            | `null` ise okunmamış, tarih varsa okunmuş |
| `createdAt`         | Bildirimin oluşma zamanı                  |

Aynı görev için aynı son tarih bildiriminin birden fazla oluşmasını engellemek amacıyla
uygun bir unique index ve/veya `tasks.reminderSentAt` kontrolü kullanılmalıdır.

### 4.3. REST endpoint'leri

Temel endpoint'ler şu şekilde planlanmalıdır:

```text
POST  /api/v1/tasks                       Görev oluştur
GET   /api/v1/tasks                       Kullanıcının görevlerini listele
GET   /api/v1/tasks/:id                   Görev detayını getir
PATCH /api/v1/tasks/:id                   Görev durumunu/bilgilerini güncelle

GET   /api/v1/notifications               Bildirimleri listele
GET   /api/v1/notifications/unread-count  Okunmamış bildirim sayısını getir
PATCH /api/v1/notifications/:id/read      Bir bildirimi okundu yap
PATCH /api/v1/notifications/read-all      Tüm bildirimleri okundu yap
```

Bu endpoint'ler `JwtGuard` ile korunmalıdır. Controller, kullanıcı kimliğini
`@GetUser('id')` ile token'dan almalıdır; body içinden gelen bir `userId` değerine
güvenilmemelidir.

### 4.4. Görev zamanının kontrol edilmesi

Görev zamanının gelmesi tarayıcıda `setTimeout` ile takip edilmemelidir. Tarayıcı kapalı
olabilir veya sayfa yenilenebilir. Kontrol backend tarafında yapılmalıdır.

Önerilen akış:

1. NestJS zamanlayıcı servisi belirli aralıklarla, örneğin her dakika çalışır.
2. `dueAt <= now`, `status != completed`, `isDeleted = false` ve `reminderSentAt IS NULL`
   koşullarına uyan görevler bulunur.
3. Transaction içinde bildirim kaydı oluşturulur ve görevin `reminderSentAt` alanı
   güncellenir.
4. Transaction başarıyla tamamlandıktan sonra `EventsGateway.sendToUser(...)` çağrılır.
5. Kullanıcı çevrimdışıysa WebSocket mesajı ulaşmaz; ancak bildirim veritabanında
   kaldığı için sonraki girişinde görülür.

Zamanlayıcı için `@nestjs/schedule` kullanılabilir. Gerekli schedule modülü uygulamaya
yalnızca bir kez kaydedilmelidir.

### 4.5. WebSocket akışı

Starter projede `apps/api/src/core/realtime/events.gateway.ts` hazırdır. Bağlantı adresi:

```text
ws://localhost:3000/ws
```

Tarayıcıdaki `httpOnly` access token cookie'si WebSocket bağlantısında otomatik gönderilir.
Frontend kullanıcı kimliğini WebSocket mesajıyla bildirmemelidir; backend kimliği doğrulanmış
token'dan çıkarır.

Görev zamanı geldiğinde örnek olay formatı:

```json
{
	"type": "task.due",
	"data": {
		"notificationId": "uuid",
		"taskId": "uuid",
		"title": "Görev zamanı geldi"
	}
}
```

Frontend bu olayı aldığında:

- çan ikonundaki sayıyı günceller veya unread-count endpoint'ini tekrar çağır,
- isteğe bağlı olarak ekranda toast gösterir,
- bildirim detayının kaynağı olarak yine API'deki kalıcı kaydı kullanır.

WebSocket burada verinin kendisi değil, **yeni veri oluştuğunu bildiren kanal** olarak
düşünülmelidir.

Mevcut gateway bağlantıları uygulama belleğinde tutar ve tek API instance varsayar. Proje
ileride birden fazla backend instance ile çalıştırılacaksa Redis pub/sub gibi ortak bir
mesajlaşma katmanı eklenmelidir. Bu, mevcut görevin kapsamı dışındadır.

## 5. Geliştirilecek Next.js yapısı

### 5.1. Sayfalar

#### `/` — Görev oluşturma ve listeleme

- Başlık, açıklama, son tarih ve durum alanları bulunur.
- Zorunlu alanlar hem frontend'de hem backend DTO'sunda doğrulanır.
- Form gönderildiğinde `POST /api/v1/tasks` çağrılır.
- Başarılı cevaptan dönen UUID ile `/tasks/{id}` sayfasına yönlendirilir.
- Görev listesi `GET /api/v1/tasks` sonucundan gösterilir.

#### `/tasks/[id]` — Görev detayı

- UUID, Next.js dinamik route parametresinden alınır.
- `GET /api/v1/tasks/:id` ile gerçek veri getirilir.
- Başlık, açıklama, durum, son tarih ve oluşturulma tarihi gösterilir.
- Kayıt yoksa anlaşılır bir `404` durumu gösterilir.

#### `/notifications` — Bildirimler

- Bildirimler API'den en yeniden eskiye doğru listelenir.
- Bir bildirime tıklandığında `PATCH /api/v1/notifications/:id/read` çağrılır.
- Okunan bildirimden sonra çan ikonundaki okunmamış sayı yeniden alınır.
- Tümünü okundu işaretle düğmesi `PATCH /api/v1/notifications/read-all` çağrısını yapar.
- Her bildirime tıklandığında ilgili `/tasks/[id]` detay sayfasına gidilir.
- Bildirim kayıtları okununca silinmez; yalnızca `readAt` alanı güncellenir.

### 5.2. Header ve bildirim state'i

Header `layout.tsx` seviyesinde ortak kullanılmalıdır. Okunmamış bildirim sayısının
farklı sayfalarda tutarlı kalması için ortak TopBar client component'i API ve WebSocket
bağlantısını yönetir. Bildirim sayfasıyla `notification-count-changed` tarayıcı olayı üzerinden
haberleşir.

TopBar'ın sorumlulukları:

1. Oturum açıldığında unread-count endpoint'inden ilk sayıyı almak.
2. WebSocket bağlantısını kurmak.
3. `task.due` olayı geldiğinde sayıyı güncellemek.
4. Bağlantı koparsa kontrollü olarak yeniden bağlanmak.
5. Tekli veya toplu okundu işlemi tamamlandığında sayıyı API'den yeniden almak.

### 5.3. Tarih ve saat yönetimi

Formdaki `datetime-local` değeri kullanıcının yerel saatidir. API'ye gönderilmeden önce
`new Date(value).toISOString()` ile UTC ISO formatına çevrilmelidir. PostgreSQL alanı timezone
destekli timestamp olmalıdır. Gösterim sırasında tarih kullanıcının yerel saatine ve
`tr-TR` formatına dönüştürülmelidir.

Bu ayrım yapılmazsa farklı saat dilimlerinde görev bildirimi yanlış zamanda oluşabilir.

### 5.4. API ve port ayarı

API varsayılan olarak `3000` portunda çalışır. Next.js de varsayılan olarak aynı portu
kullandığı için mevcut haliyle iki uygulama aynı anda başlatıldığında port çakışması
oluşur. Frontend'in geliştirme portu `3001` olarak ayarlanmalıdır:

```json
{
	"scripts": {
		"dev": "next dev -p 3001"
	}
}
```

Kök `.env` içindeki izin verilen origin de buna uygun olmalıdır:

```env
CORS_ORIGIN=http://localhost:3001
```

Frontend için `apps/web/.env.local` dosyasında public adresler tanımlanabilir:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws
```

API isteklerinde cookie oturumunun gönderilmesi gerekir. Starter içindeki shared API client
bunu `credentials: "include"` ile zaten yapar. Ayrı sayfalarda yeniden auth/fetch mekanizması
yazılmamalıdır.

## 6. Kimlik doğrulama notu

Tasks ve notifications endpoint'leri kullanıcıya özel olduğu için oturum gerektirir. Starter
projede gerekli register, login, refresh, logout ve profile endpoint'leri hazırdır.

Bu görevin ana teslimi üç görev/bildirim sayfasıdır. Bu sayfalar açılmadan önce
kullanıcının oturum açtığı kabul edilebilir. Ancak uygulama bağımsız olarak sunulacaksa
mevcut auth servisini kullanan basit bir login ekranı teknik ön koşul olarak eklenmelidir.
Token frontend JavaScript kodunda saklanmamalıdır; backend'in ayarladığı `httpOnly`
cookie kullanılmalıdır.

## 7. Projeyi yerelde çalıştırma

Komutlar depo kökünde çalıştırılmalıdır.

### 7.1. Ortam dosyasını hazırlama

PowerShell:

```powershell
Copy-Item .env.example .env
```

`.env` içindeki access ve refresh secret değerleri birbirinden farklı ve en az 16 karakter
olmalıdır. Gerçek secret değerleri Git'e eklenmemelidir.

### 7.2. Bağımlılıkları kurma

```bash
pnpm install
pnpm --filter shared build
```

### 7.3. PostgreSQL'i başlatma ve migration uygulama

```bash
docker compose -f docker-compose.dev.yml up -d
pnpm --filter api db:migrate
```

Yeni schema yazıldıktan sonraki akış:

```bash
pnpm --filter api db:generate
pnpm --filter api db:migrate
```

### 7.4. Geliştirme kullanıcısı oluşturma

```bash
pnpm --filter api user:create admin@example.com secret123 "Admin" admin
```

### 7.5. Uygulamaları başlatma

Port ayarı yapıldıktan sonra:

```bash
pnpm dev
```

- Next.js: `http://localhost:3001`
- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- WebSocket: `ws://localhost:3000/ws`

Swagger yalnızca development ortamında açıktır. Endpoint'leri frontend'e bağlamadan önce
Swagger üzerinden denemek, backend ile frontend hatalarını birbirinden ayırmayı kolaylaştırır.

## 8. Uygulama sırası

Kod geliştirme aşağıdaki sırayla yapılmalıdır:

1. Repo yapısı, `example` modülü, Drizzle schema ve shared API client incelenir.
2. Task ve notification sabitleri/tipleri `packages/shared` içinde tanımlanır.
3. `tasks` ve `notifications` Drizzle schema dosyaları yazılır.
4. Migration üretilir, SQL kontrol edilir ve PostgreSQL'e uygulanır.
5. Tasks DTO, service, controller ve module dosyaları geliştirilir.
6. Notifications DTO, service, controller ve module dosyaları geliştirilir.
7. Son tarihi gelen görevleri bulan zamanlayıcı ve WebSocket olayı eklenir.
8. Shared API client'a task ve notification servisleri eklenir.
9. Next.js `localStorage` prototipi gerçek API entegrasyonuyla değiştirilir.
10. Ortak header ve WebSocket notification provider tamamlanır.
11. Fonksiyonel, yetkilendirme, tarih/saat ve tekrar bildirim testleri yapılır.

Bu sıra önemlidir: frontend'i API sözleşmesi hazırlanmadan geliştirmek, aynı tipleri ve
veri dönüşümlerini birden fazla yerde yeniden yazmaya neden olur.

## 9. Kabul kriterleri

- Kullanıcı geçerli bilgilerle yeni bir görev oluşturabilmelidir.
- Oluşturulan görev PostgreSQL'e kaydedilmeli ve sayfa yenilendiğinde kaybolmamalıdır.
- Görev oluşturulduktan sonra ilgili dinamik detay sayfasına yönlendirilmelidir.
- Kullanıcı yalnızca kendi görev ve bildirimlerine erişebilmelidir.
- Son tarihi gelen ve tamamlanmamış görev için yalnızca bir bildirim oluşmalıdır.
- Bildirim, kullanıcı çevrimdışı olsa bile veritabanında saklanmalıdır.
- Kullanıcı çevrimiçiyse yeni bildirim WebSocket ile sayfa yenilenmeden iletilmelidir.
- Header'daki çan ikonu okunmamış bildirim sayısını doğru göstermelidir.
- Bildirime tıklandığında yalnızca ilgili bildirim okunmalı, sayaç bir azalmalı ve görev
  detay sayfası açılmalıdır.
- Tümünü okundu işaretle düğmesi bütün okunmamış bildirimleri okumalı ve sayacı `0` yapmalıdır.
- Tarihler API ve veritabanında UTC, arayüzde kullanıcının yerel saatinde gösterilmelidir.
- API validation hataları kullanıcıya anlaşılır biçimde gösterilmelidir.
- `pnpm check` ve `pnpm build` komutları başarıyla tamamlanmalıdır.

## 10. Test senaryoları

1. Gelecek tarihli görev oluştur ve detay sayfasını kontrol et.
2. Sayfayı yenile; görevin veritabanından tekrar geldiğini doğrula.
3. Son tarihi yakın bir görev oluştur; zamanı gelince çan sayısının yenileme olmadan
   arttığını kontrol et.
4. Zamanlayıcıyı birden fazla kez çalıştır; aynı göreve ikinci bildirim oluşmadığını
   doğrula.
5. Tamamlanmış bir görevin son tarihi geçince bildirim oluşmadığını kontrol et.
6. WebSocket kapalıyken görev zamanını geçir; tekrar giriş yapınca bildirimin listede
   olduğunu kontrol et.
7. Okunmamış bir bildirime tıkla; sayacın bir azaldığını ve görev detayının açıldığını
   kontrol et.
8. Tümünü okundu işaretle düğmesine bas; okunmamış sayısının `0` olduğunu kontrol et.
9. İkinci bir kullanıcıyla başkasının task UUID'sine erişmeyi dene ve `404` döndüğünü
   doğrula.
10. Boş başlık, geçersiz status ve hatalı UUID göndererek validation cevaplarını test et.

## 11. Öğrenme hedefi

Bu çalışmanın sonunda aşağıdaki konuların açıklanabiliyor ve uygulanabiliyor olması
beklenmektedir:

- pnpm monorepo içinde birden fazla uygulamanın nasıl birlikte çalıştığı
- NestJS'te module, controller, service ve DTO sorumlulukları
- Drizzle schema, migration ve PostgreSQL ilişkisi
- Backend ile frontend arasında shared tip ve API client kullanımı
- Cookie tabanlı JWT oturumunun frontend'den nasıl kullanıldığı
- Kalıcı bildirim ile WebSocket olayı arasındaki fark
- Next.js App Router'da dinamik sayfa ve ortak layout yapısı
- Kullanıcı bazlı veri sahipliği ve temel API güvenliği
- UTC ile yerel saat arasındaki dönüşüm

Amaç yalnızca ekranları tamamlamak değil; bir görevin frontend'den başlayıp API,
service, Drizzle ve PostgreSQL üzerinden nasıl ilerlediğini ve oluşan bildirimin WebSocket ile
nasıl geri döndüğünü uçtan uca anlayabilmektir.
