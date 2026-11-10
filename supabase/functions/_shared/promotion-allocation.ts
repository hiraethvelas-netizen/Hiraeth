export type ScopedDiscount = { discount: number; eligibleItems: number[] };

type Edge = { to: number; reverse: number; capacity: number };
const cents = (value: number) =>
  Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;

/**
 * Add discounts calculated from the original eligible subtotals, while each
 * item can absorb at most its own price. All arithmetic uses integer cents.
 *
 * Start with proportional shares. Residual paths can move a broad offer onto
 * another eligible item so a narrower offer still fits. A simple greedy cap
 * would lose valid discounts depending on the order of overlapping offers.
 */
export function allocateScopedDiscounts(
  itemSubtotals: number[],
  offers: ScopedDiscount[],
  maximumDiscount = Number.POSITIVE_INFINITY,
) {
  const capacities = itemSubtotals.map(cents);
  const demands = offers.map((offer) => cents(offer.discount));
  const limit = Number.isFinite(maximumDiscount)
    ? cents(maximumDiscount)
    : capacities.reduce((sum, value) => sum + value, 0);
  const source = 0;
  const itemStart = 1 + offers.length;
  const sink = itemStart + capacities.length;
  const graph: Edge[][] = Array.from({ length: sink + 1 }, () => []);

  function addEdge(from: number, to: number, capacity: number) {
    const forward: Edge = { to, reverse: graph[to]!.length, capacity };
    const backward: Edge = { to: from, reverse: graph[from]!.length, capacity: 0 };
    graph[from]!.push(forward);
    graph[to]!.push(backward);
    return forward;
  }
  function send(from: number, edge: Edge, amount: number) {
    edge.capacity -= amount;
    graph[edge.to]![edge.reverse]!.capacity += amount;
  }

  const supplies = demands.map((demand, index) => addEdge(source, 1 + index, demand));
  const outputs = capacities.map((capacity, index) => addEdge(itemStart + index, sink, capacity));
  const links = offers.map((offer, offerIndex) =>
    capacities.map((capacity, itemIndex) =>
      offer.eligibleItems.includes(itemIndex)
        ? addEdge(1 + offerIndex, itemStart + itemIndex, capacity)
        : null,
    ),
  );
  let total = 0;

  // Keep the existing proportional display whenever all requested offers fit.
  for (let index = 0; index < offers.length; index++) {
    const available = outputs.map((edge, itemIndex) =>
      links[index]![itemIndex] ? edge.capacity : 0,
    );
    const capacity = available.reduce((sum, value) => sum + value, 0);
    const amount = Math.min(demands[index]!, capacity, limit - total);
    if (amount <= 0) continue;
    const shares = available.map((value, itemIndex) => {
      const exact = (amount * value) / capacity;
      return { itemIndex, value: Math.floor(exact), fraction: exact - Math.floor(exact) };
    });
    let remainder = amount - shares.reduce((sum, share) => sum + share.value, 0);
    for (const share of [...shares].sort((a, b) => b.fraction - a.fraction)) {
      if (!remainder) break;
      if (share.value < available[share.itemIndex]!) {
        share.value++;
        remainder--;
      }
    }
    send(source, supplies[index]!, amount);
    for (const share of shares) {
      if (!share.value) continue;
      send(1 + index, links[index]![share.itemIndex]!, share.value);
      send(itemStart + share.itemIndex, outputs[share.itemIndex]!, share.value);
    }
    total += amount;
  }

  while (total < limit) {
    const previous: Array<{ from: number; edge: Edge } | undefined> = Array(graph.length);
    const visited = new Set([source]);
    const queue = [source];
    for (let head = 0; head < queue.length && !visited.has(sink); head++) {
      const from = queue[head]!;
      for (const edge of graph[from]!) {
        if (edge.capacity <= 0 || visited.has(edge.to)) continue;
        visited.add(edge.to);
        previous[edge.to] = { from, edge };
        queue.push(edge.to);
        if (edge.to === sink) break;
      }
    }
    if (!visited.has(sink)) break;
    let amount = limit - total;
    for (let node = sink; node !== source;) {
      const step = previous[node]!;
      amount = Math.min(amount, step.edge.capacity);
      node = step.from;
    }
    for (let node = sink; node !== source;) {
      const step = previous[node]!;
      send(step.from, step.edge, amount);
      node = step.from;
    }
    total += amount;
  }

  return {
    discounts: supplies.map((edge, index) => (demands[index]! - edge.capacity) / 100),
    allocations: links.map((row) =>
      row.map((edge) => (edge ? graph[edge.to]![edge.reverse]!.capacity / 100 : 0)),
    ),
    discount: total / 100,
  };
}
