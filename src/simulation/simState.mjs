import { evaluateChartConstraints } from './chartConstraints.mjs';
const clone = value => JSON.parse(JSON.stringify(value));
const requireValue = (ok, message) => { if (!ok) throw new Error(message); };
export function createSimulation({agents, world = {}, successConditions = []}) {
  requireValue(Array.isArray(agents) && agents.length > 0, 'At least one agent is required');
  requireValue(Array.isArray(successConditions), 'Success conditions must be an array');
  const ids = new Set();
  for (const a of agents) {
    requireValue(a?.id && !ids.has(a.id), 'Each agent needs a unique id');
    requireValue(Array.isArray(a.charts) && a.charts.length === 4, 'Each agent needs four charts');
    ids.add(a.id);
  }
  return clone({version:1,tick:0,agents:agents.map(a=>({id:a.id,charts:a.charts,goals:a.goals??[],position:a.position??null,memory:a.memory??[],state:a.state??{}})),world,successConditions,history:[]});
}
export function perceive(state, agentId) {
  const agent=state.agents.find(a=>a.id===agentId);
  requireValue(agent,'Unknown agent');
  return clone({tick:state.tick,position:agent.position,world:state.world,self:agent.state});
}
export function transition(state,{agentId,action,rules,context={}}) {
  const next=clone(state);
  const agent=next.agents.find(a=>a.id===agentId);
  requireValue(agent,'Unknown agent');
  requireValue(action?.id,'Action id required');
  const decision=evaluateChartConstraints({charts:agent.charts,action,rules,context});
  if(decision.status!=='allowed') return {state:next,decision,applied:false};
  requireValue(action.effects && typeof action.effects==='object' && !Array.isArray(action.effects),'Allowed actions require declared effects');
  const effects=action.effects;
  if(effects.agentState) {
    requireValue(typeof effects.agentState==='object' && !Array.isArray(effects.agentState),'Invalid agent state effects');
    Object.assign(agent.state,clone(effects.agentState));
  }
  if(Object.hasOwn(effects,'position')) agent.position=clone(effects.position);
  if(effects.world) {
    requireValue(typeof effects.world==='object' && !Array.isArray(effects.world),'Invalid world effects');
    Object.assign(next.world,clone(effects.world));
  }
  next.tick++;
  const record={tick:next.tick,agentId,actionId:action.id,effects:clone(effects),trace:decision.trace};
  agent.memory.push(record);
  next.history.push(record);
  return {state:next,decision,applied:true};
}
export function evaluateSuccess(state) {
  return state.successConditions.map(c=>{
    requireValue(c?.id && c.scope && c.key && Object.hasOwn(c,'equals'),'Invalid success condition');
    const subject=c.scope==='world'?state.world:c.scope==='agent'?state.agents.find(a=>a.id===c.agentId)?.state:undefined;
    requireValue(subject!==undefined,'Unknown success condition scope or agent');
    return {id:c.id,met:subject[c.key]===c.equals};
  });
}
export function serializeSimulation(state){return JSON.stringify(state);}
export function restoreSimulation(serialized){
  const state=JSON.parse(serialized);
  requireValue(state?.version===1 && Array.isArray(state.agents) && Array.isArray(state.history),'Unsupported simulation snapshot');
  return state;
}
