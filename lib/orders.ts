export type Order = {
  id: string;
  term: string;
  amount: number;
  yield: number;
  createdAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var ordersStore: Order[] | undefined;
}

export function getOrders() {
  globalThis.ordersStore ||= [];
  return globalThis.ordersStore;
}
