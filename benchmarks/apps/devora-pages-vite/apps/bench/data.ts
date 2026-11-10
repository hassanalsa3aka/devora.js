// Same 100 items in every framework's benchmark app.
export function getItems() {
  return Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}`, price: ((i * 37) % 1000) / 10 }));
}
