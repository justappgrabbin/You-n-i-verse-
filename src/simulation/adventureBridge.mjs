import {transition, evaluateSuccess, serializeSimulation, restoreSimulation} from './simState.mjs';
// Additive boundary for existing renderers (Morph3D/Morphing World) and simulation engine.
// A renderer receives state-derived events; it never authorizes actions or edits state.
const clone = value => JSON.parse(JSON.stringify(value));
export function createAdventureBridge({initialState, rules, scenes, onEvent = () => {}}) {
  if (!initialState?.agents || !Array.isArray(rules) || !Array.isArray(scenes)) throw Error('Simulation, rules and scenes required');
  if (typeof onEvent !== 'function') throw Error('Event handler must be a function');
  const sceneIds = new Set();
  for (const scene of scenes) {
    if (!scene?.id || sceneIds.has(scene.id) || !Array.isArray(scene.choices)) throw Error('Scene needs unique id and choices');
    sceneIds.add(scene.id);
    const choices = new Set();
    for (const choice of scene.choices) {
      if (!choice?.id || !choice?.action?.id || choices.has(choice.id)) throw Error('Choice needs unique id and action');
      choices.add(choice.id);
    }
  }
  let state = restoreSimulation(serializeSimulation(initialState));
  let currentScene = scenes[0]?.id ?? null;
  const getScene = id => scenes.find(scene => scene.id === id);
  function snapshot() { return clone({state, currentScene}); }
  function choose({agentId, choiceId, context = {}}) {
    const scene = getScene(currentScene);
    if (!scene) throw Error('No active scene');
    const choice = scene.choices.find(item => item.id === choiceId);
    if (!choice) throw Error('Unknown choice');
    if (choice.nextScene != null && !getScene(choice.nextScene)) throw Error('Unknown next scene');
    const outcome = transition(state, {agentId, action:choice.action, rules, context});
    if (!outcome.applied) return {applied:false, decision:outcome.decision, snapshot:snapshot()};
    const previousScene = currentScene;
    state = outcome.state;
    if (choice.nextScene != null) currentScene = choice.nextScene;
    const event = clone({type:'simulation-transition',tick:state.tick,agentId,choiceId,previousScene,currentScene,actionId:choice.action.id,position:state.agents.find(a=>a.id===agentId).position,world:state.world,success:evaluateSuccess(state)});
    onEvent(event);
    return {applied:true,decision:outcome.decision,event,snapshot:snapshot()};
  }
  function save() { return JSON.stringify(snapshot()); }
  function load(serialized) {
    const candidate = JSON.parse(serialized);
    const restored = restoreSimulation(JSON.stringify(candidate.state));
    if (candidate.currentScene !== null && !getScene(candidate.currentScene)) throw Error('Unknown saved scene');
    state = restored;
    currentScene = candidate.currentScene;
    return snapshot();
  }
  return {choose,snapshot,save,load};
}
