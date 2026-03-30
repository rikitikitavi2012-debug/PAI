# Research aiogram streaming patterns

**Agent:** CodexResearcher
**Captured:** 2026-03-18T20:41:26+03:00
**Tool Use ID:** toolu_01T3GTLb6UqJooDB9cvTbqns
**Tokens:** 43642
**Duration:** 270s
**Source:** PostToolUse hook capture

---

SUMMARY: Comprehensive research on aiogram 3.x streaming capabilities, Telegram Bot API rate limits, and sendMessageDraft -- the game-changing new streaming method.

ANALYSIS:

## 1. Aiogram Latest Version & Recent Releases

**Current: aiogram 3.26.0** (released March 2, 2026)

| Version | Release Date | Bot API | Key Feature |
|---------|-------------|---------|-------------|
| **3.26.0** | 2026-03-02 | **9.5** | `sendMessageDraft` available to ALL bots |
| 3.25.0 | 2026-02-10 | 9.4 | Custom emoji for Premium bots, forum topics in private chats |
| 3.24.0 | 2026-01-02 | 9.3 | **`sendMessageDraft` introduced** (limited bots initially) |
| 3.23.0 | 2025-12-06 | -- | Bug fixes |
| 3.22.0 | 2025-08-17 | 9.2 | -- |
| 3.21.0 | 2025-07-05 | 9.1 | -- |
| 3.20.0 | 2025-04-14 | 9.0 | Pydantic 2.11 (reduced memory/startup), business accounts |

Requirements: Python >= 3.10, < 3.15. Built on asyncio + aiohttp.

---

## 2. The Two Approaches to "Streaming" Text in Telegram

### Approach A: editMessageText Loop (Traditional, Pre-9.3)

Pattern: send initial message, then repeatedly call `editMessageText` as LLM tokens arrive.

```python
from aiogram import Bot, Router
from aiogram.types import Message
import asyncio

router = Router()

@router.message()
async def handle_message(message: Message, bot: Bot):
    # Send initial placeholder
    sent = await message.answer("...")
    
    accumulated = ""
    last_update = 0
    
    async for chunk in stream_llm_response(message.text):
        accumulated += chunk
        now = asyncio.get_event_loop().time()
        
        # Throttle: update at most once per second
        if now - last_update >= 1.0:
            try:
                await bot.edit_message_text(
                    text=accumulated,
                    chat_id=message.chat.id,
                    message_id=sent.message_id,
                    parse_mode=None,  # IMPORTANT: no parse_mode during streaming
                )
                last_update = now
            except Exception:
                pass  # Handle TelegramBadRequest for identical content
    
    # Final update with formatting
    await bot.edit_message_text(
        text=format_final_markdown(accumulated),
        chat_id=message.chat.id,
        message_id=sent.message_id,
        parse_mode="HTML",  # HTML is safer than MarkdownV2
    )
```

**Drawbacks**: limited to ~1 update/second, flickers on client, 429 risk, markdown parsing errors mid-stream.

### Approach B: sendMessageDraft (NEW -- Bot API 9.3+, aiogram 3.24+)

This is the game-changer. Purpose-built for streaming. Available to ALL bots since Bot API 9.5 / aiogram 3.26.0.

```python
from aiogram import Bot, Router
from aiogram.types import Message
from aiogram.methods import SendMessageDraft

router = Router()

@router.message()
async def handle_message(message: Message, bot: Bot):
    draft_id = message.message_id  # Use any non-zero unique int
    accumulated = ""
    
    async for chunk in stream_llm_response(message.text):
        accumulated += chunk
        
        # Send draft update -- designed for high-frequency updates
        await bot(SendMessageDraft(
            chat_id=message.chat.id,
            draft_id=draft_id,
            text=accumulated,
        ))
    
    # Finalize: send real message (draft disappears)
    await message.answer(
        text=format_final_markdown(accumulated),
        parse_mode="HTML",
    )
```

**Key properties of sendMessageDraft:**
- `chat_id` (int, required) -- target private chat
- `draft_id` (int, required, non-zero) -- same ID = animated transitions
- `text` (str, required) -- 1-4096 chars after entity parsing
- `message_thread_id` (optional) -- for forum topics
- `parse_mode` (optional) -- entity parsing mode
- `entities` (optional) -- pre-parsed entities
- Returns `True` on success

**Draft lifecycle**: `sendMessageDraft` -> `sendMessageDraft` -> ... -> `sendMessage` (finalizes, replaces draft)

**Critical advantage**: Designed for high-frequency updates. No documented rate limit equivalent to editMessageText's ~1/sec practical limit. Updates with the same `draft_id` are natively animated on the Telegram client -- no flicker.

---

## 3. Telegram Bot API Rate Limits

**Official (from [Bots FAQ](https://core.telegram.org/bots/faq)):**

| Scope | Limit |
|-------|-------|
| Same chat | ~1 message/second (short bursts allowed, then 429) |
| Different chats (broadcast) | ~30 messages/second |
| Group chat | ~20 messages/minute |
| Paid broadcast | Up to 1000/sec (0.1 Stars/msg) |

**Critical details for editMessageText:**
- Shares the same rate limit bucket as sendMessage, sendPhoto, etc.
- editMessageText and editMessageCaption share one bucket
- Community consensus: safe to call ~1/sec per chat for continuous streaming
- Exceeding triggers HTTP 429 with `retry_after` field (seconds to wait); during this time ALL bot API calls are blocked
- Telegram does NOT officially publish exact numbers; limits are dynamic based on bot age, history, request type

**sendMessageDraft rate limits:**
- No documented rate limit risk per community testing
- Designed for high-frequency partial updates
- Still advisable to buffer/throttle somewhat (exact ceiling unknown, needs testing)
- Recommended approach: test with 200-500ms intervals, adjust based on 429 responses

---

## 4. Best Practices for Streaming LLM Responses

### Chunking Strategies

| Strategy | When to Use |
|----------|-------------|
| **Time-based (every 0.5-1s)** | editMessageText approach -- safest for rate limits |
| **Character-count (every 50-100 chars)** | sendMessageDraft -- can be more aggressive |
| **Word-boundary** | Best UX -- buffer until complete words form |
| **Sentence-boundary** | Best for markdown safety -- sentences are formatting-complete |
| **Hybrid (time + min chars)** | Production recommendation -- update every 0.5s OR every 100 chars, whichever comes later |

The grammyjs/stream plugin (TypeScript reference implementation) uses configurable `minChars`/`maxChars` with modes: `"partial"` (continuous) and `"block"` (chunked).

### Markdown Handling During Streaming

This is the #1 pain point. Telegram validates markdown on EVERY update. Incomplete formatting (unmatched `*`, `` ` ``, `_`) causes `400 Bad Request`.

**Solutions (ranked by reliability):**

1. **Stream with `parse_mode=None`**, apply formatting only on final message -- simplest, most reliable
2. **Use HTML instead of MarkdownV2** -- HTML is inherently safer (unclosed tags less likely to error)
3. **Buffer-and-validate** -- count opening/closing pairs of formatting chars, only update when balanced
4. **Sentence-boundary updates** -- sentences are more likely to have balanced formatting
5. **Fallback chain** -- try HTML, on error retry with `parse_mode=None`

```python
async def safe_edit(bot, chat_id, message_id, text):
    """Fallback chain for safe message editing during streaming."""
    try:
        await bot.edit_message_text(
            text=text, chat_id=chat_id,
            message_id=message_id, parse_mode="HTML"
        )
    except TelegramBadRequest:
        try:
            await bot.edit_message_text(
                text=text, chat_id=chat_id,
                message_id=message_id, parse_mode=None
            )
        except TelegramBadRequest:
            pass  # Content unchanged or other issue
```

### Typing Indicator (sendChatAction)

aiogram has a built-in `ChatActionSender` utility -- a context manager that auto-sends "typing..." every 5 seconds:

```python
from aiogram.utils.chat_action import ChatActionSender

@router.message()
async def handle(message: Message, bot: Bot):
    async with ChatActionSender.typing(bot=bot, chat_id=message.chat.id):
        # Typing indicator shows automatically every 5 seconds
        # until this context manager exits
        response = await generate_llm_response(message.text)
        await message.answer(response)
```

Configuration: `ChatActionSender(bot, chat_id, action='typing', interval=5.0, initial_sleep=0.0)`

There's also `ChatActionMiddleware` for auto-applying to all handlers:
```python
router.message.middleware(ChatActionMiddleware())
```

**Note**: Typing indicator disappears when the bot sends a message. For streaming, you'd use typing BEFORE the first draft/message, then drafts handle the visual feedback.

### Error Handling During Streaming

```python
from aiogram.exceptions import TelegramBadRequest, TelegramRetryAfter

async def stream_with_resilience(bot, chat_id, llm_stream):
    draft_id = 1
    accumulated = ""
    
    try:
        async for chunk in llm_stream:
            accumulated += chunk
            try:
                await bot(SendMessageDraft(
                    chat_id=chat_id, draft_id=draft_id,
                    text=accumulated[-4096:],  # Respect 4096 char limit
                ))
            except TelegramRetryAfter as e:
                await asyncio.sleep(e.retry_after)
            except TelegramBadRequest:
                pass  # Skip this update, try next
    except Exception as e:
        # LLM stream failed -- send what we have
        if accumulated:
            await bot.send_message(chat_id=chat_id, text=accumulated or "Error generating response.")
        return
    
    # Finalize
    await bot.send_message(chat_id=chat_id, text=accumulated, parse_mode="HTML")
```

---

## 5. Aiogram Middleware / Patterns for Streaming

Aiogram does NOT have a built-in streaming middleware (unlike grammyjs which has `@grammyjs/stream`). You need to build it yourself. Suggested pattern:

```python
from aiogram import BaseMiddleware
from aiogram.types import Message
import asyncio

class StreamingMiddleware(BaseMiddleware):
    """Middleware that provides streaming helpers to handlers."""
    
    async def __call__(self, handler, event: Message, data: dict):
        data["stream_reply"] = StreamReply(event, data["bot"])
        return await handler(event, data)

class StreamReply:
    def __init__(self, message: Message, bot):
        self.message = message
        self.bot = bot
        self.draft_id = message.message_id
    
    async def stream(self, async_generator):
        accumulated = ""
        async for chunk in async_generator:
            accumulated += chunk
            await self.bot(SendMessageDraft(
                chat_id=self.message.chat.id,
                draft_id=self.draft_id,
                text=accumulated[-4096:],
            ))
        # Finalize
        await self.message.answer(accumulated, parse_mode="HTML")
```

---

## 6. python-socketio AsyncClient + aiogram Compatibility

**python-socketio 5.16.1** (Feb 6, 2026) -- fully supports asyncio.

**Yes, they can share the same event loop.** Both are asyncio-native:

```python
import asyncio
import socketio
from aiogram import Bot, Dispatcher

sio = socketio.AsyncClient()
bot = Bot(token="TOKEN")
dp = Dispatcher()

@sio.on('llm_chunk')
async def on_chunk(data):
    # Process streaming chunk from Socket.IO server
    pass

async def main():
    # Both run in the same asyncio event loop
    await sio.connect('http://localhost:3000')
    
    # Run aiogram polling and socketio concurrently
    await asyncio.gather(
        dp.start_polling(bot),
        sio.wait(),  # Keeps socketio connection alive
    )

asyncio.run(main())
```

**Key considerations:**
- Install with `pip install python-socketio[asyncio_client]` for the async extra
- Use `socketio.AsyncClient()` or `socketio.AsyncSimpleClient()` -- not the sync versions
- Event handlers can be coroutines (native async/await)
- `start_background_task()` method launches async functions without blocking
- Multiple `AsyncClient` instances work in the same loop via `asyncio.gather()`
- Do NOT call `sio.wait()` in a handler -- it blocks; use it only at the top-level gather

---

## 7. New Aiogram Features for Streaming

| Feature | Version | Impact |
|---------|---------|--------|
| **`SendMessageDraft`** | 3.24.0+ (Bot API 9.3) | Purpose-built streaming method |
| **All bots allowed** | 3.26.0 (Bot API 9.5) | No more restrictions on sendMessageDraft |
| **`ChatActionSender`** | Long-standing | Auto typing indicator |
| **`ChatActionMiddleware`** | Long-standing | Typing as middleware |
| **Pydantic 2.11** | 3.20.0 | Lower memory, faster startup |
| **Bot API 9.5** | 3.26.0 | Full streaming support for all bots |

No SSE support in aiogram itself (it's a Telegram bot framework, not a web server). For SSE/webhook improvements, aiogram uses aiohttp webhooks as before -- no changes there specific to streaming.

---

ACTIONS:
- Searched 6 parallel web queries across PyPI, Telegram Bot API docs, aiogram changelog, GitHub issues
- Fetched 10+ pages for deep extraction: aiogram changelog, Bot API docs, sendMessageDraft API, grammy stream plugin, python-socketio docs, openclaw implementation discussions, rate limit guides
- Cross-referenced community-discovered rate limits with official Telegram FAQ

RESULTS: Complete picture of both legacy (editMessageText) and modern (sendMessageDraft) streaming approaches, with specific version numbers, rate limits, code patterns, and integration details.

STATUS: Research complete. aiogram 3.26.0 supports sendMessageDraft natively. python-socketio 5.16.1 is asyncio-compatible.

CAPTURE:
- sendMessageDraft is THE method to use (Bot API 9.3+, aiogram 3.24+, unrestricted since 3.26.0/9.5)
- editMessageText: ~1/sec safe, shares bucket with all send methods
- sendMessageDraft: high-frequency, no documented rate limit ceiling yet
- Draft lifecycle: draft -> draft -> ... -> sendMessage (finalizes)
- Markdown during streaming: use parse_mode=None, apply HTML on final
- ChatActionSender: built-in typing indicator context manager
- python-socketio AsyncClient shares event loop with aiogram via asyncio.gather

NEXT:
1. Upgrade to aiogram 3.26.0 to get sendMessageDraft for all bots
2. Implement sendMessageDraft-based streaming with fallback to editMessageText for older API
3. Use parse_mode=None during streaming, HTML on finalization
4. Build a StreamReply helper / middleware for reuse
5. Integrate python-socketio AsyncClient alongside aiogram via asyncio.gather

STORY EXPLANATION:
1. aiogram 3.26.0 is the latest release (March 2, 2026), supporting Bot API 9.5 with full sendMessageDraft access for all bots
2. sendMessageDraft (Bot API 9.3, Dec 2025) is purpose-built for streaming -- replaces the old editMessageText hack entirely
3. The draft lifecycle is: send drafts with same draft_id (animated transitions) then finalize with sendMessage which replaces the draft
4. editMessageText rate limit is ~1/sec per chat (shared bucket with all message methods); sendMessageDraft has no documented ceiling but should still be buffered
5. Markdown during streaming is the biggest pain point -- Telegram validates on every update, so stream with parse_mode=None and apply formatting only on the final message
6. aiogram's ChatActionSender provides automatic "typing..." indicator every 5 seconds as a context manager -- use before first draft, then drafts provide visual feedback
7. python-socketio 5.16.1 is fully asyncio-native and coexists with aiogram in the same event loop via asyncio.gather()
8. No built-in aiogram streaming middleware exists -- build a custom StreamReply helper that wraps the sendMessageDraft lifecycle with error handling and throttling

COMPLETED: aiogram 3.26 streaming research complete -- sendMessageDraft is the key method.

Sources:
- [aiogram PyPI](https://pypi.org/project/aiogram/)
- [aiogram 3.26.0 Documentation](https://docs.aiogram.dev/)
- [aiogram Changelog](https://docs.aiogram.dev/en/latest/changelog.html)
- [aiogram GitHub Releases](https://github.com/aiogram/aiogram/releases)
- [SendMessageDraft API Docs](https://docs.aiogram.dev/en/dev-3.x/api/methods/send_message_draft.html)
- [ChatActionSender Docs](https://docs.aiogram.dev/en/latest/utils/chat_action.html)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Bot API Changelog](https://core.telegram.org/bots/api-changelog)
- [Telegram Bots FAQ (Rate Limits)](https://core.telegram.org/bots/faq)
- [GramIO Rate Limits Guide](https://gramio.dev/rate-limits)
- [grammyjs/stream Plugin](https://github.com/grammyjs/stream)
- [OpenClaw sendMessageDraft Issue #31061](https://github.com/openclaw/openclaw/issues/31061)
- [OpenClaw Streaming Issue #32180](https://github.com/openclaw/openclaw/issues/32180)
- [python-socketio Client Docs](https://python-socketio.readthedocs.io/en/latest/client.html)
- [python-socketio PyPI](https://pypi.org/project/python-socketio/)
- [Streaming Markdown Errors Discussion](https://community.latenode.com/t/how-to-handle-streaming-responses-from-google-ai-in-telegram-bot-without-markdown-parsing-errors/21646)