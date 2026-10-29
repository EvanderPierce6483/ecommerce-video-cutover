import { strict as assert } from "node:assert";
import { promotionDecision } from "./commerce_video.ts";

const decision = promotionDecision({ orderId: "o-1", productName: "linen travel bag", fulfillmentState: "packed" });
assert.equal(decision.shouldPublish, false);
assert.match(decision.prompt, /next delivery step/);
console.log("order update decision: packed orders stay in review until shipment");
