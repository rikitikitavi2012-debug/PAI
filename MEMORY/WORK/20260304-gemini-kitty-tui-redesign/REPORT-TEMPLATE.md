# Gemini CLI — Kitty TUI Redesign Report

## Summary
<!-- Одно предложение: что сделано -->

## Files Changed
<!-- Список изменённых файлов с кратким описанием -->
| File | Changes |
|------|---------|
| config/kitty/scripts/command-center.sh | ... |
| config/kitty/scripts/telos-dashboard.sh | ... |
| config/kitty/scripts/brigade-watch.sh | ... |
| config/kitty/scripts/events-tail.sh | ... |
| config/kitty/scripts/a0-chat-tail.sh | ... |
| config/kitty/sessions/pai.session | ... |

## What Was Fixed
<!-- Конкретные баги/проблемы которые были исправлены -->
1. ...
2. ...

## What Was NOT Changed
<!-- Что осталось без изменений (data fetching, colors, hotkeys) -->

## Helper Functions
<!-- Если создан единый набор helper-функций — описать -->

## Known Limitations
<!-- Что не удалось исправить или что требует ручной проверки -->

## Testing Notes
<!-- Как проверить что всё работает -->
- [ ] Tab 1 (TELOS): рамки ровные, двухколоночный layout выровнен
- [ ] Tab 2 (Center): box_line правый │ на месте, two_col разделитель ровный
- [ ] Tab 3 (Brigade): header box ровный, секции выровнены
- [ ] Tab 3 (Events): header выровнен
- [ ] Tab 3 (A0 Chat): header выровнен
- [ ] Tab 4-6 (pai.session): inline echo блоки с ровными рамками
- [ ] Emoji не ломают alignment (проверить строки с ✅ ⚡ 🏆 🎯)
- [ ] Ширина 96 символов — ничего не обрезается и не выходит за рамки
