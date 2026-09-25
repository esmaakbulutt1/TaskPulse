# nest-drizzle-starter (NestJS) — Sıfırdan "Notlar" REST API'si

> Karşılaştırmalı okuma için: `notlar-api-schub-express.md` (aynı API, Express'te)
> Mimari farkların gerekçeleri: `schub-vs-nest-karsilastirma.md`

**Hedef endpoint'ler**

```
GET    /api/v1/notes          (sayfalı liste, kendi notların)
POST   /api/v1/notes
GET    /api/v1/notes/:id
PATCH  /api/v1/notes/:id
DELETE /api/v1/notes/:id      (soft delete)
```

**Toplam: 13 yeni dosya, 3 dosyada düzenleme, 15 adım.**

**Sıra neden bu:** İçeriden dışarıya — sözleşme (shared) → tablo → migration → **DTO'lar** →
servis → controller → module → app.module. schub'dan iki fark: shared'de zod yerine **iki dosya**
(sabitler + tipler) yazıyorsun, ve API tarafında **DTO'lar servisten önce** geliyor çünkü servis
DTO tiplerini parametre olarak alıyor.

**Referans modül:** `apps/api/src/modules/example/` — bu rehberdeki her dosya oradaki karşılığına
bakılarak yazıldı. Takıldığın yerde o klasörü aç.

> **Başlamadan:** kökte `pnpm dev` çalışıyor olsun (shared `tsc --watch` + api `nest start --watch`).
> shared'e dosya eklediğinde API'nin görebilmesi için shared'in derlenmiş olması gerekir; watch
> açıksa otomatik, değilse `pnpm --filter shared build`.

---

## Adım 1 — `packages/shared/src/constants/note.ts`

**Ne işe yarar:** Hem API'nin (pgEnum + `@IsEnum`) hem frontend'in (renk seçici) ihtiyacı olan
liste ve sınır değerler. **Runtime kod içeren tek shared dosyası** — geri kalanı tip.

**Referans:** `constants/example.ts`, `constants/auth.ts`

```ts
// The colour list is declared here because BOTH ends need it: the API builds its pgEnum and its
// class-validator rules from it, the frontend renders it. One source, no drift.
export const NOTE_COLORS = ["default", "yellow", "green", "blue", "pink"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

// Length bounds live here too — the browser can reject a too-long note before spending a round
// trip, and the API enforces exactly the same numbers.
export const NOTE_TITLE_MAX_LENGTH = 200;
export const NOTE_CONTENT_MAX_LENGTH = 20000;
```

**schub'dan fark:** Orada bu bilgi zod şemasının **içinde** yaşıyor (`z.string().max(200)`). Burada
sabit olarak ayrı duruyor, çünkü DTO'daki `@MaxLength()` onu import edecek. Kural iki yerde ama
sayı tek yerde.

---

## Adım 2 — `packages/shared/src/types/note.ts`

**Ne işe yarar:** API'nin döndürdüğü ve aldığı şekiller. **Sadece tip** — derlemede silinir,
browser'a hiçbir şey gitmez.

**Referans:** `types/example.ts`

```ts
import type { NoteColor } from "../constants/note";
import type { PaginationQuery } from "./api";

export interface Note {
    id: string;
    userId: string;
    title: string;
    content: string | null;
    color: NoteColor;
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface NoteCreateInput {
    title: string;
    content?: string;
    color?: NoteColor;
    isPinned?: boolean;
}

/** Every field optional, but at least one must be present — an empty PATCH is a client bug. */
export interface NoteUpdateInput {
    title?: string;
    content?: string | null;
    color?: NoteColor;
    isPinned?: boolean;
}

export interface NoteListQuery extends PaginationQuery {
    color?: NoteColor;
    pinnedOnly?: boolean;
    /** Free-text search over title + content. */
    q?: string;
}
```

`PaginationQuery`'yi `types/api.ts`'ten miras alman `page`/`perPage`'i yeniden yazmanı önlüyor —
`ExampleListQuery` de aynısını yapıyor.

**Not:** `NoteList` diye bir tip **yok**. schub'da vardı çünkü orada pagination gövdenin içinde
dönüyor. Burada zarf var: `data: Note[]` + `meta: PaginationMeta`, ikisi de `types/api.ts`'te tanımlı.

---

## Adım 3 — `packages/shared/src/index.ts`'e ekle

```ts
export * from "./constants/auth";
export * from "./constants/example";
export * from "./constants/note";       // ← ekle
export * from "./constants/upload";
export * from "./types/api";
export * from "./types/auth";
export * from "./types/example";
export * from "./types/note";           // ← ekle
export * from "./types/upload";
export * from "./api-client/index";
```

> **Uzantı yok** — nest tarafı CommonJS/`node16`. schub'daki `.js` uzantısını buraya yazarsan
> derlenmez. İki projeyi paralel geliştirirken en sık yapılan hata bu.

---

## Adım 4 — `packages/shared/src/api-client/note.service.ts`

**Ne işe yarar:** Frontend fonksiyonları. schub'dan farkı: `Requester`'dan `request` **ve**
`envelope` alıyor — liste endpoint'inin `meta`'sını (pagination toplamları) açmak için.

**Referans:** `api-client/example.service.ts`

```ts
import type { PaginationMeta } from "../types/api";
import type { Note, NoteCreateInput, NoteListQuery, NoteUpdateInput } from "../types/note";
import type { Requester } from "./http";

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) search.set(key, String(value));
    }
    const qs = search.toString();
    return qs ? `?${qs}` : "";
}

export function createNoteService({ request, envelope }: Requester) {
    return {
        /** Returns the rows AND the pagination totals — the only place `meta` is unwrapped. */
        list: async (query: NoteListQuery = {}) => {
            const res = await envelope<Note[]>(`/api/v1/notes${toQuery({ ...query })}`);
            return { items: res.data ?? [], meta: res.meta as unknown as PaginationMeta };
        },
        get: (id: string) => request<Note>(`/api/v1/notes/${id}`),
        create: (input: NoteCreateInput) =>
            request<Note>("/api/v1/notes", { method: "POST", body: JSON.stringify(input) }),
        update: (id: string, input: NoteUpdateInput) =>
            request<Note>(`/api/v1/notes/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
        /** Soft delete — the row stays, `is_active` flips to false. */
        remove: (id: string) => request<null>(`/api/v1/notes/${id}`, { method: "DELETE" }),
    };
}
```

**`request` vs `envelope`:**
- `request` → zarfı açar, sadece `data`'yı verir. Neredeyse her yerde bunu kullanırsın.
- `envelope` → tüm `ApiResponse`'u verir. Sadece `meta`'ya ihtiyacın olduğunda (pagination).

**Bedavaya gelen:** Bu servisin çağırdığı `request`, `http.ts`'teki otomatik refresh + single-flight
kilidini kullanıyor. Yani bir not listeleme isteği 401 alırsa, client kendi kendine `/auth/refresh`
çağırıp isteği tekrarlıyor — senin bu dosyada hiçbir şey yapmana gerek yok.

---

## Adım 5 — `packages/shared/src/api-client/index.ts`'e bağla

```ts
import { createAuthService } from "./auth.service";
import { createExampleService } from "./example.service";
import { createNoteService } from "./note.service";              // ← ekle
import { type ApiClientOptions, createRequester } from "./http";
import { createUploadsService } from "./uploads.service";

export { ApiError, type ApiClientOptions, type Requester } from "./http";

export function createApiClient(options: ApiClientOptions) {
    const requester = createRequester(options);

    return {
        auth: createAuthService(requester),
        examples: createExampleService(requester),
        notes: createNoteService(requester),                      // ← ekle
        uploads: createUploadsService(requester),
    };
}

export type ApiClient = ReturnType<typeof createApiClient>;
```

Frontend'de kullanımı:

```ts
const api = createApiClient({ baseUrl: "", onSessionExpired: () => goto("/login") });
const { items, meta } = await api.notes.list({ page: 1, pinnedOnly: true });
// meta.totalPages ile sayfalama çiz
```

---

## Adım 6 — `apps/api/src/core/db/schema/notes.ts`

**Ne işe yarar:** Tablo tanımı. Drizzle bu dosyadan hem SQL migration'ı hem TS tipini üretiyor.

**Referans:** `core/db/schema/examples.ts`

```ts
import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { NOTE_COLORS } from 'shared';
import { users } from './users';

// The colour list is declared in shared (frontends need it too) and reused here, so the enum
// and the client-side type can never drift apart.
export const noteColor = pgEnum('note_color', NOTE_COLORS);

export const notes = pgTable(
	'notes',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		content: text('content'),
		color: noteColor('color').notNull().default('default'),
		isPinned: boolean('is_pinned').notNull().default(false),
		// Deactivate instead of delete: history survives.
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	// Every list query filters by owner + is_active and sorts by created_at.
	(table) => [index('notes_user_id_created_at_idx').on(table.userId, table.createdAt)],
);

export type NoteRow = typeof notes.$inferSelect;
export type NewNoteRow = typeof notes.$inferInsert;
```

**`NoteRow` ismine dikkat** — shared'de zaten `Note` interface'i var, çakışmasın diye bu projedeki
konvansiyon `*Row`: `UserRow`, `ExampleRow`, `RefreshTokenRow`. (schub'da ikisi de `Note` çünkü
oradaki servis shared tipini import etmiyor.)

---

## Adım 7 — `apps/api/src/core/db/schema/index.ts`'e ekle

**Ne işe yarar:** drizzle-kit'in giriş noktası. **Buraya yazmazsan tablo yok sayılır** —
`db:generate` onu görmez, boş migration üretir ve hata da vermez.

```ts
export * from './examples';
export * from './notes';           // ← ekle
export * from './refresh-tokens';
export * from './users';
```

`drizzle.config.ts` doğrudan bu dosyayı gösteriyor:
`schema: './src/core/db/schema/index.ts'`.

---

## Adım 8 — Migration üret ve uygula

```powershell
pnpm --filter api db:generate
pnpm --filter api db:migrate
```

- `db:generate` → `src/core/db/migrations/0001_xxx.sql` + `meta/` güncellemesi.
  **Üretilen SQL'i aç ve oku** — özellikle enum ekleyen migration'larda.
- `db:migrate` → `tsx src/core/db/migrate.ts`. Bu script Nest'in **dışında** çalışıyor (DI yok,
  HTTP yok), o yüzden deploy'un ilk adımı olabiliyor.

Kontrol: `pnpm --filter api db:studio`.

---

## Adım 9 — DTO'lar: `apps/api/src/modules/notes/dto/`

**Ne işe yarar:** Girdi validasyonu + dönüşümü + Swagger dokümantasyonu — üçü tek dosyada.
`main.ts`'teki global `ValidationPipe` (`whitelist: true`) bunları otomatik uyguluyor:
**DTO'da tanımlanmayan alanlar silinir**, yani client `{ userId: "başkası" }` gönderse bile servise
ulaşmaz.

schub'da bu adımın karşılığı yok — orada şema zaten Adım 1'de yazıldı.

### 9a — `dto/create-note.dto.ts`

**Referans:** `modules/example/dto/create-example.dto.ts`

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NOTE_COLORS, NOTE_CONTENT_MAX_LENGTH, NOTE_TITLE_MAX_LENGTH, type NoteColor } from 'shared';
import { trim } from '../../../core/http/transforms';

export class CreateNoteDto {
	@ApiProperty({ maxLength: NOTE_TITLE_MAX_LENGTH })
	@IsString()
	@MinLength(1)
	@MaxLength(NOTE_TITLE_MAX_LENGTH)
	@Transform(trim)
	title: string;

	@ApiPropertyOptional({ maxLength: NOTE_CONTENT_MAX_LENGTH })
	@IsOptional()
	@IsString()
	@MaxLength(NOTE_CONTENT_MAX_LENGTH)
	@Transform(trim)
	content?: string;

	@ApiPropertyOptional({ enum: NOTE_COLORS, default: 'default' })
	@IsOptional()
	@IsEnum(NOTE_COLORS)
	color?: NoteColor = 'default';

	@ApiPropertyOptional({ default: false })
	@IsOptional()
	@IsBoolean()
	isPinned?: boolean = false;
}
```

`trim` fonksiyonu `core/http/transforms.ts`'ten geliyor — aynı normalizasyonu her DTO'da yeniden
yazmamak için orada duruyor. E-posta alanların olursa `trimLowercase` de var.

### 9b — `dto/update-note.dto.ts`

**Referans:** `modules/example/dto/update-example.dto.ts`

```ts
import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { NOTE_COLORS, type NoteColor } from 'shared';
import { CreateNoteDto } from './create-note.dto';

/**
 * Every field optional — but `color` and `isPinned` are dropped from the base and redeclared.
 *
 * PartialType() carries CreateNoteDto's `= 'default'` / `= false` defaults along, so a PATCH that
 * only touches the title would reset the colour and unpin the note. A partial-update DTO must
 * never inherit a default.
 */
export class UpdateNoteDto extends PartialType(
	OmitType(CreateNoteDto, ['color', 'isPinned'] as const),
) {
	@ApiPropertyOptional({ enum: NOTE_COLORS })
	@IsOptional()
	@IsEnum(NOTE_COLORS)
	color?: NoteColor;

	@ApiPropertyOptional()
	@IsOptional()
	@IsBoolean()
	isPinned?: boolean;
}
```

**Bu, `UpdateExampleDto`'daki tuzağın birebir aynısı.** `PartialType(CreateNoteDto)` yazıp geçme —
default'lar miras kalır ve sadece başlığı değiştiren bir PATCH notun rengini sıfırlar.

### 9c — `dto/list-notes.dto.ts`

**Referans:** `modules/example/dto/list-examples.dto.ts`

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { NOTE_COLORS, type NoteColor } from 'shared';
import { PaginationDto } from '../../../core/http/dto';
import { trim } from '../../../core/http/transforms';

export class ListNotesDto extends PaginationDto {
	@ApiPropertyOptional({ enum: NOTE_COLORS })
	@IsOptional()
	@IsEnum(NOTE_COLORS)
	color?: NoteColor;

	@ApiPropertyOptional({ description: 'Only pinned notes' })
	@IsOptional()
	// Query strings are text: `?pinnedOnly=true` arrives as the STRING "true".
	@Transform(({ value }) => value === true || value === 'true')
	@IsBoolean()
	pinnedOnly?: boolean;

	@ApiPropertyOptional({ description: 'Free-text search over title + content' })
	@IsOptional()
	@IsString()
	@MaxLength(200)
	@Transform(trim)
	q?: string;
}
```

`PaginationDto`'yu extend etmek `page`, `perPage` **ve** `offset` getter'ını bedava veriyor
(`get offset() { return (this.page - 1) * this.perPage; }`). Ayrıca `perPage` orada `@Max(100)` ile
sınırlı — `?perPage=1000000` bedava DoS olurdu.

### 9d — `dto/note-response.dto.ts`

**Ne işe yarar:** **Sadece Swagger dokümantasyonu.** Servis Drizzle satırını döndürüyor, şekli
uyuyor; bu sınıf hiçbir zaman instantiate edilmiyor.

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NOTE_COLORS, type NoteColor } from 'shared';

/** Swagger documentation only — the service returns the Drizzle row, whose shape matches. */
export class NoteResponseDto {
	@ApiProperty({ format: 'uuid' })
	id: string;

	@ApiProperty({ format: 'uuid' })
	userId: string;

	@ApiProperty()
	title: string;

	@ApiPropertyOptional({ nullable: true })
	content: string | null;

	@ApiProperty({ enum: NOTE_COLORS })
	color: NoteColor;

	@ApiProperty()
	isPinned: boolean;

	@ApiProperty({ type: String, format: 'date-time' })
	createdAt: Date;

	@ApiProperty({ type: String, format: 'date-time' })
	updatedAt: Date;
}
```

### 9e — `dto/index.ts`

```ts
export * from './create-note.dto';
export * from './list-notes.dto';
export * from './note-response.dto';
export * from './update-note.dto';
```

---

## Adım 10 — `apps/api/src/modules/notes/note.service.ts`

**Ne işe yarar:** **Bu modülün DB'ye dokunan tek katmanı.** Controller asla query yazmaz.
schub'dan farkı: `@Injectable()` sınıf, `db` inject ediliyor, ve liste `meta` döndürüyor.

**Referans:** `modules/example/example.service.ts`

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import type { PaginationMeta } from 'shared';
import { DRIZZLE, type Database } from '../../core/db/drizzle.module';
import { notes, type NoteRow } from '../../core/db/schema';
import type { CreateNoteDto, ListNotesDto, UpdateNoteDto } from './dto';

/**
 * The ONLY layer that talks to the database for this module. Controllers never build queries
 * and other modules never reach past index.ts to get here.
 */
@Injectable()
export class NoteService {
	constructor(@Inject(DRIZZLE) private readonly db: Database) {}

	async list(userId: string, query: ListNotesDto): Promise<{ items: NoteRow[]; meta: PaginationMeta }> {
		// Ownership is part of every filter — a row is never reachable by id alone.
		const where = and(
			eq(notes.userId, userId),
			eq(notes.isActive, true),
			...(query.color ? [eq(notes.color, query.color)] : []),
			...(query.pinnedOnly ? [eq(notes.isPinned, true)] : []),
			...(query.q ? [or(ilike(notes.title, `%${query.q}%`), ilike(notes.content, `%${query.q}%`))!] : []),
		);

		const [items, [totals]] = await Promise.all([
			this.db
				.select()
				.from(notes)
				.where(where)
				// Pinned notes first, then newest.
				.orderBy(desc(notes.isPinned), desc(notes.createdAt))
				.limit(query.perPage)
				.offset(query.offset),
			this.db.select({ value: count() }).from(notes).where(where),
		]);

		const total = totals?.value ?? 0;
		return {
			items,
			meta: {
				total,
				page: query.page,
				perPage: query.perPage,
				totalPages: Math.ceil(total / query.perPage),
			},
		};
	}

	async get(userId: string, id: string): Promise<NoteRow> {
		const [row] = await this.db
			.select()
			.from(notes)
			.where(and(eq(notes.id, id), eq(notes.userId, userId), eq(notes.isActive, true)))
			.limit(1);
		// 404 rather than 403 for someone else's row: the answer must not reveal that it exists.
		if (!row) throw new NotFoundException('note_not_found');
		return row;
	}

	async create(userId: string, dto: CreateNoteDto): Promise<NoteRow> {
		const [row] = await this.db
			.insert(notes)
			.values({
				userId,
				title: dto.title,
				content: dto.content ?? null,
				color: dto.color ?? 'default',
				isPinned: dto.isPinned ?? false,
			})
			.returning();
		return row;
	}

	async update(userId: string, id: string, dto: UpdateNoteDto): Promise<NoteRow> {
		// Runs first so a foreign id fails with 404 before anything is written.
		await this.get(userId, id);

		const [row] = await this.db
			.update(notes)
			.set({
				...(dto.title !== undefined ? { title: dto.title } : {}),
				...(dto.content !== undefined ? { content: dto.content } : {}),
				...(dto.color !== undefined ? { color: dto.color } : {}),
				...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
				updatedAt: new Date(),
			})
			.where(eq(notes.id, id))
			.returning();
		return row;
	}

	/** Deactivate instead of delete: history and anything referencing this row survive. */
	async deactivate(userId: string, id: string): Promise<void> {
		await this.get(userId, id);
		await this.db
			.update(notes)
			.set({ isActive: false, updatedAt: new Date() })
			.where(eq(notes.id, id));
	}
}
```

**Dört kural:**

1. `userId` her `where` içinde — bir satır asla sadece id ile erişilebilir olmamalı.
2. Başkasının satırı için **404** (`NotFoundException`), 403 değil.
3. `update` önce `get` çağırıyor — yabancı id yazmadan önce 404 versin.
4. `@Inject(DRIZZLE)` — schub'daki `import { db }` yerine DI. `DRIZZLE` bir `Symbol`,
   `DrizzleModule` `@Global()` olduğu için hiçbir yere import etmen gerekmiyor.

**`NotFoundException('note_not_found')`** — mesaj bir **kod**, cümle değil. `AllExceptionsFilter`
bunu `{ "error": "note_not_found" }` olarak basıyor ve client bu koda göre çeviri yapıyor.

---

## Adım 11 — `apps/api/src/modules/notes/note.controller.ts`

**Ne işe yarar:** HTTP yüzeyi. Guard sınıfın üstünde → kitle tek bakışta okunuyor.
Handler'lar `ServiceResponse` döndürüyor, zarfı `ResponseTransformInterceptor` ekliyor.

**Referans:** `modules/example/example.controller.ts`

```ts
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../core/http/decorators';
import { ParseUuid } from '../../core/http/pipes';
import type { ServiceResponse } from '../../core/http/types';
import { JwtGuard } from '../auth';
import { CreateNoteDto, ListNotesDto, NoteResponseDto, UpdateNoteDto } from './dto';
import { NoteService } from './note.service';

/**
 * The authenticated surface. Guards sit on the controller, so reading the decorators above the
 * class tells you the audience without opening a single handler.
 */
@ApiTags('Notes')
@ApiCookieAuth()
@UseGuards(JwtGuard)
@Controller('notes')
export class NoteController {
	constructor(private readonly noteService: NoteService) {}

	@Get()
	@ApiOperation({ summary: 'List own notes (paginated)' })
	@ApiResponse({ status: 200, type: [NoteResponseDto] })
	async list(
		@GetUser('id') userId: string,
		@Query() query: ListNotesDto,
	): Promise<ServiceResponse<NoteResponseDto[]>> {
		const { items, meta } = await this.noteService.list(userId, query);
		return { message: 'Notes loaded', data: items, meta };
	}

	@Get(':id')
	@ApiOperation({ summary: 'One note' })
	@ApiResponse({ status: 200, type: NoteResponseDto })
	@ApiResponse({ status: 404, description: 'note_not_found' })
	async get(
		@GetUser('id') userId: string,
		// The id reaches a WHERE clause, so it is validated as a UUID before it gets there.
		@Param('id', ParseUuid) id: string,
	): Promise<ServiceResponse<NoteResponseDto>> {
		return { message: 'Note loaded', data: await this.noteService.get(userId, id) };
	}

	@Post()
	@ApiOperation({ summary: 'Create a note' })
	@ApiResponse({ status: 201, type: NoteResponseDto })
	async create(
		@GetUser('id') userId: string,
		@Body() dto: CreateNoteDto,
	): Promise<ServiceResponse<NoteResponseDto>> {
		return { message: 'Note created', data: await this.noteService.create(userId, dto) };
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Update a note' })
	@ApiResponse({ status: 200, type: NoteResponseDto })
	async update(
		@GetUser('id') userId: string,
		@Param('id', ParseUuid) id: string,
		@Body() dto: UpdateNoteDto,
	): Promise<ServiceResponse<NoteResponseDto>> {
		return { message: 'Note updated', data: await this.noteService.update(userId, id, dto) };
	}

	@Delete(':id')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Deactivate a note (soft delete)' })
	async remove(
		@GetUser('id') userId: string,
		@Param('id', ParseUuid) id: string,
	): Promise<ServiceResponse<null>> {
		await this.noteService.deactivate(userId, id);
		return { message: 'Note deleted', data: null };
	}
}
```

**Kullanılan core parçaları:**

- `@GetUser('id')` → `JwtStrategy.validate()`'in `request.user`'a koyduğu `AuthContext`'ten alan çeker
- `ParseUuid` → `ParseUUIDPipe`'ın kod-döndüren hali (`invalid_uuid`), built-in olan cümle döndürüyor
- `ServiceResponse<T>` → `{ message, data?, meta? }`. `success` ve `timestamp`'i interceptor ekliyor

**`@HttpCode(HttpStatus.OK)` DELETE'te neden var:** Nest DELETE için varsayılan 200 veriyor zaten,
ama açıkça yazmak zarfın istisnasız olduğunu belli ediyor. schub'da burası `204 No Content` — zarf
olmadığı için gövdesiz yanıt sorun değil.

**Rate limit gerekmiyor** — `APP_GUARD` olarak kayıtlı `ThrottlerGuard` her endpoint'i zaten
120/dk ile koruyor. Sıkılaştırmak istersen handler'a `@Throttle({ default: { limit: 30, ttl: 60_000 } })`.

---

## Adım 12 — `apps/api/src/modules/notes/note.module.ts`

**Ne işe yarar:** Modülün DI kablolaması. `AuthModule` import'u **zorunlu** — `JwtGuard`'ın
kullandığı `'jwt'` passport stratejisi orada kayıtlı ve `AuthModule` onu `exports: [PassportModule]`
ile dışa açıyor.

**Referans:** `modules/example/example.module.ts`

```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { NoteController } from './note.controller';
import { NoteService } from './note.service';

@Module({
	// For JwtGuard: the 'jwt' passport strategy is registered by AuthModule.
	imports: [AuthModule],
	controllers: [NoteController],
	providers: [NoteService],
})
export class NoteModule {}
```

**Ne import etmene gerek YOK:** `DrizzleModule`, `StorageModule`, `SecurityModule`, `RealtimeModule`
— hepsi `@Global()`. `@Inject(DRIZZLE)` veya `private readonly storage: StorageService` doğrudan
çalışır.

> Başka bir modülün `NoteService`'i kullanmasını istersen buraya `exports: [NoteService]` eklersin.

---

## Adım 13 — `apps/api/src/modules/notes/index.ts`

```ts
// The module's public API. Other modules import from HERE — never from a file inside.
export * from './note.module';
```

`JwtGuard`'ı `../auth` üzerinden import ettiğine dikkat et — `../auth/guard/jwt.guard` değil.
Aynı kural buraya da uygulanıyor.

---

## Adım 14 — `apps/api/src/app.module.ts`'e ekle

**Ne işe yarar:** Modülün uygulamaya dahil olduğu an. Bunu yapmazsan controller hiç kaydedilmez ve
endpoint **404** döner — hata da vermez, sessizce yok olur.

```ts
import { AuthModule } from './modules/auth';
import { ExampleModule } from './modules/example';
import { NoteModule } from './modules/notes';       // ← ekle
import { UploadModule } from './modules/uploads';

@Module({
	imports: [
		ConfigModule.forRoot({ ... }),

		// ---- infrastructure (core) ---------------------------------------------------------
		DrizzleModule,
		SecurityModule,
		StorageModule,
		RealtimeModule,
		HealthModule,

		WinstonModule.forRootAsync({ ... }),
		ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }] }),
		ServeStaticModule.forRootAsync({ ... }),

		// ---- features (modules) ------------------------------------------------------------
		AuthModule,
		ExampleModule,
		NoteModule,                                   // ← ekle
		UploadModule,
	],
	providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule { }
```

**Path burada yok** — `@Controller('notes')` + `main.ts`'teki `setGlobalPrefix('api/v1')` birleşerek
`/api/v1/notes`'u veriyor. schub'daki `router.ts` mount satırının karşılığı bu import, ama
**guard bilgisi burada değil** — o controller dekoratöründe.

---

## Adım 15 — Dene

```powershell
pnpm dev
```

Tarayıcıda **`http://localhost:3000/api/docs`** — "Notes" tag'i altında beş endpoint'i, DTO
alanlarını, enum değerlerini ve örnek gövdeleri hazır görürsün.

Swagger'da test akışı:

1. `POST /api/v1/auth/login` → "Try it out" → e-posta/şifre gönder.
   Cookie tarayıcıya yazılır (`withCredentials: true` ayarlı olduğu için).
2. Notes endpoint'lerini doğrudan dene — cookie otomatik gidiyor, "Authorize" butonuna
   dokunman gerekmez.

Kullanıcın yoksa: `pnpm --filter api user:create`.

**Doğrulanacak davranışlar:**

- `POST /notes` → 201, zarf `{ success, message: "Note created", data: {...}, timestamp }`
- `GET /notes?page=1&pinnedOnly=true` → `data: [...]` + `meta: { total, page, perPage, totalPages }`
- `PATCH /notes/:id` sadece `{ "title": "yeni" }` ile → renk ve pin **değişmemeli**
- `GET /notes/abc` (geçersiz uuid) → 400 `{ "error": "invalid_uuid" }`
- Başkasının not id'si → 404 `{ "error": "note_not_found" }`
- `{ "title": "x", "userId": "başkası" }` gönder → `userId` `whitelist` tarafından **silinir**

**Son kontrol:**

```powershell
pnpm check      # tsc --noEmit
pnpm lint       # eslint --fix
```

---

## Dosya sırası özeti

| # | Dosya | Ne yapar |
|---|---|---|
| 1 | `packages/shared/src/constants/note.ts` | Renk listesi + sınır değerler (iki uç da kullanır) |
| 2 | `packages/shared/src/types/note.ts` | Tip sözleşmesi (runtime kod yok) |
| 3 | `packages/shared/src/index.ts` | İkisini dışa aç |
| 4 | `packages/shared/src/api-client/note.service.ts` | Frontend fonksiyonları (`envelope` ile meta) |
| 5 | `packages/shared/src/api-client/index.ts` | `api.notes` olarak bağla |
| 6 | `apps/api/src/core/db/schema/notes.ts` | Tablo (`NoteRow` tipi) |
| 7 | `apps/api/src/core/db/schema/index.ts` | Barrel'e ekle (**yoksa migration üretmez**) |
| 8 | — | `db:generate` + `db:migrate` |
| 9 | `modules/notes/dto/create-note.dto.ts` | Girdi validasyonu + Swagger |
| 10 | `modules/notes/dto/update-note.dto.ts` | PATCH — **default miras alma!** |
| 11 | `modules/notes/dto/list-notes.dto.ts` | Query (`PaginationDto`'yu extend eder) |
| 12 | `modules/notes/dto/note-response.dto.ts` | Sadece Swagger |
| 13 | `modules/notes/dto/index.ts` | DTO barrel |
| 14 | `modules/notes/note.service.ts` | Tek DB katmanı + ownership + meta |
| 15 | `modules/notes/note.controller.ts` | HTTP + guard + Swagger dekoratörleri |
| 16 | `modules/notes/note.module.ts` | DI kablolaması (`AuthModule` import şart) |
| 17 | `modules/notes/index.ts` | Modülün public API'si |
| 18 | `apps/api/src/app.module.ts` | `imports`'a ekle (**yoksa 404**) |
| 19 | — | `pnpm dev`, `/api/docs`, `pnpm check && pnpm lint` |

Sonuçta oluşan klasör:

```
apps/api/src/modules/notes/
├── dto/
│   ├── create-note.dto.ts
│   ├── list-notes.dto.ts
│   ├── note-response.dto.ts
│   ├── update-note.dto.ts
│   └── index.ts
├── index.ts               (public API)
├── note.controller.ts     (HTTP + guard + Swagger)
├── note.module.ts         (DI)
└── note.service.ts        (tek DB katmanı)
```

---

## Asla atlamaman gereken 5 şey

1. **Barrel'e ekle** (`core/db/schema/index.ts`) — yoksa drizzle-kit tabloyu görmez, migration boş
   çıkar ve hata vermez.
2. **`app.module.ts`'e ekle** — yoksa endpoint sessizce 404 döner.
3. **`AuthModule`'ü `note.module.ts`'e import et** — yoksa `JwtGuard` çalışmaz
   ("Unknown authentication strategy 'jwt'").
4. **Ownership her `where` içinde** + başkasının satırında **404** dön, 403 değil.
5. **`UpdateNoteDto` default miras almasın** — `PartialType(CreateNoteDto)` DEĞİL,
   `PartialType(OmitType(CreateNoteDto, [...]))` + alanları yeniden tanımla.

---

## Sonraki adımlar

**Anonim uç eklemek** (`GET /api/v1/public/notes`) — `public-example.controller.ts` deseni:

```ts
// modules/notes/public-note.controller.ts
@ApiTags('Notes (public)')
@Controller('public/notes')
export class PublicNoteController {
	constructor(private readonly noteService: NoteService) {}

	@Get()
	@Throttle({ default: { limit: 60, ttl: 60_000 } })
	async listPublic(): Promise<ServiceResponse<PublicNote[]>> { ... }
}
```

Servis ve tablo tek kalır, sadece controller bölünür. `note.module.ts`'in `controllers` dizisine
ekle. Anonim uçta **payload'ı daralt** — shared'de ayrı bir `PublicNote` tipi tanımla
(`types/note.ts`), servis tarafında `.select({ id, title, createdAt })`.

**Admin ucu:**

```ts
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
@Controller('admin/notes')
```

Guard sırası önemli: `RolesGuard` `request.user`'a ihtiyaç duyuyor, onu `JwtGuard` koyuyor.

**Not değişince canlı bildirim:**

```ts
// note.service.ts constructor'ına ekle (RealtimeModule @Global())
constructor(
	@Inject(DRIZZLE) private readonly db: Database,
	private readonly events: EventsGateway,
) {}
// update'in sonunda:
this.events.sendToUser(userId, 'note.updated', row);
```

**Nota resim eklemek:** `notes` tablosuna `imageUrl` kolonu, `CreateNoteDto`/`UpdateNoteDto`'ya
`@IsUrl({ require_host: false, require_tld: false })` alanı, ve servisin `update`'inde eski
dosyanın silinmesi. **`ExampleService.update` bu bağlantıyı hazır içeriyor** — birebir kopyala:

```ts
if (dto.imageUrl !== undefined && current.imageUrl && current.imageUrl !== dto.imageUrl) {
	await this.storage.deleteFile(userId, current.imageUrl);
}
```

`UpdateExampleDto`'daki `@ValidateIf((_, value) => value !== null)` numarasını da al — explicit
`null` göndererek resmi kaldırabilmek için (`IsUrl` null'ı reddediyor).
