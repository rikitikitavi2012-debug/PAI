# PWA для строительных компаний: offline-first синхронизация с Google Sheets

**Mode:** Standard Research (2 agents: ClaudeResearcher + GeminiResearcher)
**Date:** 2026-02-27
**Status:** Complete

## Executive Summary

PWA с offline-first архитектурой — оптимальное решение для строительных компаний. Паттерн проверен в здравоохранении, логистике и ритейле. Google Sheets как backend работает для малого масштаба через API v4 с IndexedDB кэшем.

## Ключевой стек (рекомендация)

TypeScript + Next.js (или Vue3/Vite) + Workbox (workbox-background-sync) + IndexedDB (Dexie.js) + Google Sheets API v4

## Архитектура

```
[Строительное PWA]
        |
   [Service Worker + Workbox]
        |
   [IndexedDB / Dexie.js]  <-- локальная копия
        |
   [Sync Queue]  <-- очередь offline-изменений
        |
   [Background Sync]
        |
   [Google Sheets API v4]  <-- бэкенд
```

## Стратегии синхронизации по типу данных

| Тип данных | Паттерн | Причина |
|-----------|---------|---------|
| Ежедневные отчёты | Last-Write-Wins | Некритичные, одиночные |
| Учёт материалов | Server-Log (append-only) | Аудируемость |
| Акты скрытых работ | Hybrid (с участием) | Критичность данных |
| Фото с объектов | Queue-based | Большие файлы |

## Ограничения Google Sheets

- 500 запросов / 100 секунд на проект
- 10 млн ячеек на файл
- При масштабировании → миграция на Supabase/Firebase с Sheets как витрина

## Кросс-индустриальные паттерны

- **Здравоохранение:** Hybrid conflict resolution для критичных данных
- **Логистика:** Queue-based sync — идентичен чеклистам прораба
- **Ритейл POS:** LWW + operation logs для складского учёта

## Тренды 2025-2026

- SQLite через WebAssembly — полная SQL БД на клиенте
- Библиотеки: Dexie.js, PouchDB, RxDB, ElectricSQL, CushionDB
- Реальный пример: Construction Viz (React PWA для строительства)

## Подводные камни

- Safari iOS: ограниченная поддержка Background Sync → нужен fallback
- Квоты хранилища: строительные фото могут исчерпать лимит
- Sync health indicators — прораб должен видеть статус синхронизации

## Быстрый старт (без кода)

- Google AppSheet: нативный offline + sync из Google Sheets
- Glide: no-code PWA из Sheets

## Рекомендации

1. Прототип: Vue3/Vite + Dexie.js + Google Sheets API v4 (одна форма — отчёт прораба)
2. Тест Background Sync на целевых устройствах (особенно iOS Safari)
3. Структура Sheets с учётом append-only паттерна
