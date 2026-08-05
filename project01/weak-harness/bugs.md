# Doc Chat - Bug Report

Reviewed 2026-08-05. App: Electron "Doc Chat" (weak-harness). Two symptoms reported: document cannot display in the center window, and the right-side chat window does not work.

## Bug 1 - Document never renders in the center window

`main.js:139` - the `docs:get` handler returns `{ id, name, text }` with no `chars`:

```js
return d ? { id: d.id, name: d.name, text: d.text } : null;
```

`renderer.js:254` in `selectDoc` dereferences it:

```js
els.previewMeta.innerHTML = `<span>${escapeHtml(doc.name)}</span><span class="ext">${doc.chars.toLocaleString()} chars</span>`;
```

`doc.chars` is `undefined` -> `TypeError` is thrown while building that template literal. The throw happens before `els.preview.innerHTML = mdToHtml(doc.text)`, so the meta bar is un-hidden but the document body never renders. The sidebar still lists the doc because `store.summaries()` (documents.js:92) does include `chars`.

Fix (either):

```js
// main.js:139
return d ? { id: d.id, name: d.name, text: d.text, chars: d.chars } : null;
```

```js
// renderer.js:254 - use text length instead
${doc.text.length.toLocaleString()} chars
```

## Bug 2 - Chat dies on the second question

`state.conversation` only ever receives assistant turns. `renderer.js:400` pushes the assistant answer, but the user's question is only rendered as a DOM bubble by `appendUserMessage` - it is never pushed into `state.conversation`.

On the second `ask()`, `history` (renderer.js:379) is `[{ role: 'assistant', content: ... }]`. `buildMessages` in qa.js sends that as the first message, and the Anthropic Messages API rejects a request whose first message is not `role: 'user'` -> 400 -> error bubble. First question works, everything after fails.

Fix: push the user turn in `ask()` (renderer.js:375):

```js
state.conversation.push({ role: 'user', content: question });
```

## Bug 3 - Chat fails on non-Latin or short questions

`retriever.js` `tokenize` only matches `[a-z0-9]+`. Any non-Latin question (e.g. Chinese) yields `[]`, so `retrieve` returns no passages and main returns "No matching passages found". Stopword-heavy questions ("What is this?") also collapse to an empty token set, because "what"/"is" are in `STOP` and single-char tokens are filtered. Retrieval fails before the LLM is ever called.

## Bug 4 - Token usage display never renders (cosmetic)

`qa.js` reads `usage.input_tokens` from the `message_delta` event, but that event only carries `output_tokens` (`input_tokens` is on `message_start`). So `delta.usage.input` is always `undefined` and the "X in / Y out" line (renderer.js:321) never renders. Does not affect answers.

## Priority

1. Bug 1 + Bug 2 - fix both to resolve the two reported symptoms.
2. Bug 3 - only if questions may be asked in Chinese or with very short phrasing.
3. Bug 4 - only if the token count display matters.
