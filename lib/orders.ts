export type Order = {
  id: string;
  term: string;
  amount: number;
  yield: number;
  createdAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var demoOrders: Order[] | undefined;
}

export function getDemoOrders() {
  globalThis.demoOrders ||= [];
  return globalThis.demoOrders;
}
