// Read-only physical observations from the original LivingSwarm.
export function perceiveSwarm(swarm, unitId, radius = 0.35) {
  if (!Array.isArray(swarm?.units) || !Number.isFinite(radius) || radius < 0) throw Error('Invalid swarm or radius');
  const self = swarm.units.find(u => u.id === unitId && !u.broken);
  if (!self) throw Error('Missing active unit');
  const neighbors = swarm.units.filter(u => u !== self && !u.broken).map(u => ({unitId:u.id, distance:Math.hypot(u.x-self.x,u.y-self.y), kind:u.kind})).filter(u => u.distance <= radius).sort((a,b)=>a.distance-b.distance || a.unitId-b.unitId);
  return {time:swarm.t, position:{x:self.x,y:self.y}, target:self.target ? {...self.target}:null, health:self.health, neighbors};
}
