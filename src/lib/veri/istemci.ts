import 'server-only'

import { cache } from 'react'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

/**
 * Payload istemcisi.
 *
 * `cache()` ile sarılı: aynı istek içinde birden fazla veri fonksiyonu
 * çağrılsa da tek bir örnek kullanılır.
 */
export const payloadGetir = cache(async (): Promise<Payload> => getPayload({ config }))

/**
 * Ziyaretçi gözüyle sorgulama ayarları.
 *
 * `overrideAccess: false` + `user: null`, koleksiyonun `access.read`
 * kuralını devreye sokar. Sorgularda ayrıca `where` ile de filtreliyoruz;
 * ikisi birden olmasının sebebi, birinin unutulması halinde diğerinin
 * taslak/yayından kalkmış kaydı dışarı sızdırmaması.
 */
export const ZIYARETCI = { overrideAccess: false, user: null } as const
