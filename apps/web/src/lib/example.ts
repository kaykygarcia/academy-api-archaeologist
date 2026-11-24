import first from '../../../../fixtures/orders/baseline/order-101.json';
import second from '../../../../fixtures/orders/baseline/order-102.json';
import third from '../../../../fixtures/orders/baseline/order-103.json';

export const exampleSamples = [first, second, third].map((value, index) => ({
  name: `order-${101 + index}.json`,
  text: JSON.stringify(value, null, 2),
}));
