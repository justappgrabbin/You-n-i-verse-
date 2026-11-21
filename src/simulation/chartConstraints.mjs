// Additive chart constraint evaluator. Chart definitions and rules must be supplied from verified source data.
// Never convert symbolic chart interpretation into an asserted psychological fact.
export function evaluateChartConstraints({charts, action, context = {}, rules}) {
  if (!Array.isArray(charts) || charts.length !== 4) throw new Error("Exactly four chart records are required");
  if (!Array.isArray(rules) || !rules.length) throw new Error("Verified, source-attributed rules are required");
  if (!action || typeof action !== "object" || !action.id) throw new Error("Action with id required");
  const ids = new Set();
  for (const chart of charts) {
    if (!chart || !chart.id || !chart.system || !chart.address) throw new Error("Chart id, system and address required");
    if (ids.has(chart.id)) throw new Error("Duplicate chart id");
    ids.add(chart.id);
  }
  const trace = [];
  let allowed = true;
  for (const rule of rules) {
    if (!rule.id || !rule.source || !rule.chartId || !rule.actionId || !["allow","deny"].includes(rule.effect)) {
      throw new Error("Incomplete source-attributed constraint rule");
    }
    if (!ids.has(rule.chartId)) throw new Error("Rule references unknown chart");
    if (rule.actionId !== action.id) continue;
    const chart = charts.find(c => c.id === rule.chartId);
    if (rule.address !== chart.address) continue;
    // Context predicates are literal equality only; no invented semantic interpretation.
    if (rule.when && Object.entries(rule.when).some(([key,value]) => context[key] !== value)) continue;
    trace.push({ruleId:rule.id,chartId:chart.id,effect:rule.effect,source:rule.source});
    if (rule.effect === "deny") allowed = false;
  }
  // No matching rule means unresolved, not permission.
  return {status:trace.length ? (allowed ? "allowed" : "denied") : "unresolved", trace};
}
