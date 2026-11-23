import first from '../../../../fixtures/orders/baseline/order-101.json';
import second from '../../../../fixtures/orders/baseline/order-102.json';
import third from '../../../../fixtures/orders/baseline/order-103.json';
import fourth from '../../../../fixtures/orders/current/order-104.json';
import fifth from '../../../../fixtures/orders/current/order-105.json';

export const baselineSamples = [first, second, third].map((value, index) => ({
  name: `order-${101 + index}.json`,
  text: JSON.stringify(value, null, 2),
}));

export const currentSamples = [fourth, fifth].map((value, index) => ({
  name: `order-${104 + index}.json`,
  text: JSON.stringify(value, null, 2),
}));
