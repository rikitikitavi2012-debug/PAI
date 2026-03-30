## Reflections
- readFileSync на symlink читает содержимое целевого файла, не имя ссылки. Для version pointers использовать plain text файлы, не symlinks.
- Worktrees от агентов накапливаются до гигабайтов. Нужен cron или SessionEnd hook для `git worktree prune` + cleanup orphaned dirs.
- При аудите hooks всегда сначала проверять фактическое значение PAI_DIR из settings.json, не предполагать путь.

## Patterns
- **Symlink vs text file для version pointers**: symlinks неоднозначны в контексте readFileSync — plain text файл с версией надёжнее и явнее.
- **Worktree cleanup**: 35 агентских worktrees за несколько дней = 2.2GB. Автоматическая уборка необходима.
- **Template-based generation**: BuildCLAUDE.ts + CLAUDE.md.template — правильная архитектура. Баг был в данных (LATEST symlink), не в коде.

## Actions
- PAI/Algorithm/LATEST: symlink → plain text file
- CLAUDE.md: 52k → 6.6k через пересборку из шаблона
- 35 стухших worktrees удалены (2.2GB)
