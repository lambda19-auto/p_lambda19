import { Agent, MemorySession, run } from '@openai/agents';
import { uuidv7 } from 'uuidv7';

import { consultAgent } from './consult.js';
import { goodbyeHardAgent } from './goodbye-hard.js';
import { goodbyeSoftAgent } from './goodbye-soft.js';

const MAX_SESSIONS = 1000;
const sessions = new Map<string, MemorySession>();

export const INSTRUCTION = `
# Роль

Ты сотрудник отдела маршрутизации обращений клиентов.

Твоя задача — внимательно прочитать сообщение клиента и определить, к какому агенту оно относится.

Ты не ведёшь диалог с клиентом.
Ты не отвечаешь на вопросы клиента.
Ты не объясняешь своё решение.

---

# Доступные интенты

## consult

Выбирай этот агент, если клиент:

* интересуется продуктом или услугой;
* задаёт вопросы;
* уточняет стоимость;
* уточняет сроки;
* уточняет условия сотрудничества;
* интересуется автоматизацией;
* интересуется возможностями продукта;
* интересуется кейсами;
* продолжает обсуждение;
* просит дополнительную информацию.

Примеры:

* Сколько стоит?
* Расскажите подробнее.
* Какие есть тарифы?
* А это можно интегрировать с CRM?
* Покажите примеры работ.
* Мне интересно узнать подробнее.

---

## goodbye_soft

Выбирай этот агент, если клиент вежливо завершает общение.

Обычно клиент:

* благодарит;
* сообщает, что получил нужную информацию;
* прощается;
* завершает разговор.

Примеры:

* Спасибо, всё понятно.
* Благодарю за консультацию.
* Хорошо, спасибо.
* Всего доброго.
* Спасибо, я подумаю.

---

## goodbye_hard

Выбирай этот агент, если клиент оскорбляет или не хочет продолжать общение.

Сюда относятся:

* оскорбления;
* агрессия;
* грубость;
* токсичность;
* угрозы;
* унижения;
* обвинения;
* отказ от услуг;
* отказ от общения;
* просьба больше не писать;
* нежелание продолжать разговор;
* спор ради спора;
* попытка конфликтовать.

Примеры:

* Не интересует.
* Больше не пишите.
* Мне ваши услуги не нужны.
* Отстаньте.
* Вы мошенники.
* Идите к чёрту.
* Хватит мне писать.

---
`.trim();

export const routerAgent = new Agent({
  name: 'router',
  instructions: INSTRUCTION,
  model: 'gpt-5.4-nano-2026-03-17',
  modelSettings: {
    reasoning: { effort: 'none' },
    text: { verbosity: 'low' },
  },
  tools: [
    consultAgent.asTool({
      toolName: 'consult',
      toolDescription: 'Ответы на вопросы клиента и консультация по услугам.',
    }),
    goodbyeSoftAgent.asTool({
      toolName: 'goodbye_soft',
      toolDescription: 'Клиент вежливо завершает общение.',
    }),
    goodbyeHardAgent.asTool({
      toolName: 'goodbye_hard',
      toolDescription: 'Клиент оскорбляет или не хочет продолжать общение.',
    }),
  ],
  toolUseBehavior: 'stop_on_first_tool',
});

function getSession(sessionId: string) {
  const existingSession = sessions.get(sessionId);
  if (existingSession) return existingSession;

  if (sessions.size >= MAX_SESSIONS) {
    const oldestSessionId = sessions.keys().next().value;
    if (oldestSessionId) sessions.delete(oldestSessionId);
  }

  const session = new MemorySession({ sessionId });
  sessions.set(sessionId, session);
  return session;
}

export async function runRouterOnce(input: string, requestedSessionId?: string) {
  const sessionId = requestedSessionId?.trim() || uuidv7();
  const result = await run(routerAgent, input, { session: getSession(sessionId) });

  return {
    response: String(result.finalOutput ?? ''),
    sessionId,
  };
}
