import { Agent, MemorySession, run } from '@openai/agents';
import { uuidv7 } from 'uuidv7';

import { consultAgent } from './consult.js';
import { goodbyeHardAgent } from './goodbye-hard.js';
import { goodbyeSoftAgent } from './goodbye-soft.js';

const MAX_SESSIONS = 1000;
const sessions = new Map<string, MemorySession>();

export const INSTRUCTION = `
# Роль

Ты сотрудник отдела маршрутизации обращений клиентов. Определи подходящего агента и обязательно передай ему сообщение клиента. Сам клиенту не отвечай и решение не объясняй.

## consult
Вопросы о продукте, стоимости, сроках, условиях, автоматизации, возможностях, кейсах и продолжение консультации.

## goodbye_soft
Благодарность, вежливое прощание или нормальное завершение разговора.

## goodbye_hard
Оскорбления, агрессия, угрозы, отказ от услуг или общения, просьба больше не писать.
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
