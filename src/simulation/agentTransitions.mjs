import { evaluateChartConstraints } from './chartConstraints.mjs';

// Pure transition: caller owns persistence and supplies source-verified chart rules.
export function transitionAgent({agent, action, charts, rules, context = {}, successConditions = []}) {
  if (!agent || typeof agent.id !== 'string' || !agent.id) throw new Error('Agent id required');
  if (!Number.isInteger(agent.revision) || agent.revision < 0) throw new Error('Nonnegative revision required');
  if (!Array.isArray(agent.memory)) throw new Error('Agent memory array required');
  if (!action || typeof action.id !== 'string' || !action.id) throw new Error('Action id required');
  const decision = evaluateChartConstraints({charts, action, rules, context});
  if (decision.status !== 'allowed') return {agent, decision, applied: false, success: false};
  // Effects are supplied by the world engine, never derived from chart symbolism.
  const effects = action.effects ?? {};
  if (effects.position !== undefined && (!Array.isArray(effects.position) || effects.position.length !== 3 || !effects.position.every(Number.isFinite))) throw new Error('Position must contain three finite coordinates');
  if (effects.state !== undefined && (typeof effects.state !== 'object' || effects.state === null || Array.isArray(effects.state))) throw new Error('State effect must be an object');
  if (!Array.isArray(successConditions) || successConditions.some(c => !c || typeof c.key !== 'string' || !Object.hasOwn(c,'equals'))) throw new Error('Success conditions require key and equals');
  const state = {...(agent.state ?? {}), ...(effects.state ?? {})};
  const next = {
    ...agent,
    revision: agent.revision + 1,
    state,
    position: effects.position ? [...effects.position] : agent.position,
    memory: [...agent.memory, {revision:agent.revision + 1, actionId:action.id, context:structuredClone(context), trace:decision.trace}]
  };
  return {agent:next, decision, applied:true, success:successConditions.length > 0 && successConditions.every(c => Object.is(state[c.key],c.equals))};
}
