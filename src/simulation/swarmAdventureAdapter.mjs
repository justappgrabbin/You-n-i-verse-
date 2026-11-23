/** Adapter for the original Synthia v25 LivingSwarm; no reimplementation of its physics. */
export function connectLivingSwarm({swarm, bridge, bindings, scale = {x: 1, y: 1}}) {
  if (!swarm || !Array.isArray(swarm.units) || typeof swarm.step !== 'function') throw Error('Existing LivingSwarm required');
  if (!bridge || typeof bridge.choose !== 'function' || typeof bridge.snapshot !== 'function') throw Error('Adventure bridge required');
  if (!Array.isArray(bindings) || !bindings.length) throw Error('Agent-to-unit bindings required');
  const assigned = new Map();
  const occupied = new Set();
  for (const {agentId, unitId} of bindings) {
    if (!agentId || !Number.isInteger(unitId) || assigned.has(agentId) || occupied.has(unitId)) throw Error('Invalid or duplicate binding');
    if (!swarm.units.some(u => u.id === unitId && !u.broken)) throw Error('Binding references missing or broken unit');
    if (!bridge.snapshot().state.agents.some(a => a.id === agentId)) throw Error('Binding references unknown Sim');
    assigned.set(agentId, unitId); occupied.add(unitId);
  }
  if (![scale.x, scale.y].every(n => Number.isFinite(n) && n > 0)) throw Error('Positive finite coordinate scale required');
  const changes = [];
  function choose(args) {
    const unitId = assigned.get(args.agentId);
    if (unitId === undefined) throw Error('Unbound Sim');
    const outcome = bridge.choose(args);
    if (!outcome.applied) return outcome;
    const position = outcome.snapshot.state.agents.find(a => a.id === args.agentId)?.position;
    if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
      const unit = swarm.units.find(u => u.id === unitId);
      unit.target = {x: position.x / scale.x, y: position.y / scale.y};
    }
    changes.push({tick: outcome.snapshot.state.tick, agentId: args.agentId, unitId, scene: outcome.snapshot.currentScene});
    return outcome;
  }
  function step(dt = 1) { swarm.step(dt); return swarm; }
  function syncRestored() {
    const snapshot = bridge.snapshot();
    for (const [agentId, unitId] of assigned) {
      const position = snapshot.state.agents.find(a => a.id === agentId)?.position;
      const unit = swarm.units.find(u => u.id === unitId);
      if (position && Number.isFinite(position.x) && Number.isFinite(position.y) && unit && !unit.broken) unit.target = {x:position.x / scale.x,y:position.y / scale.y};
    }
  }
  return {choose,step,syncRestored,changes,swarm,bridge};
}
