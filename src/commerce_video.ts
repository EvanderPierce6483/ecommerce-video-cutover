import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

export const OrderRequest = z.object({
  orderId: z.string().min(1),
  productName: z.string().min(1),
  fulfillmentState: z.enum(["packed", "shipped", "delivered"]),
});
export type OrderRequest = z.infer<typeof OrderRequest>;

export function promotionDecision(order: OrderRequest) {
  const ending = order.fulfillmentState === "delivered" ? "Thank the customer and invite a review." : "Show the order update and the next delivery step.";
  return { prompt: `Create a short ecommerce product clip for ${order.productName}. Order ${order.orderId}: ${ending}`, shouldPublish: order.fulfillmentState !== "packed" };
}

export async function createOrderClip(raw: unknown, client: InfraiClient, bucket: string) {
  const order = OrderRequest.parse(raw);
  const decision = promotionDecision(order);
  const job = await client.generateVideo({ prompt: decision.prompt, model: "auto", resolution: "1080p", duration_seconds: 8, aspect_ratio: "9:16" });
  await client.ensureBucket(bucket);
  const signed = await client.presignClip(bucket, `orders/${order.orderId}.mp4`);
  return { orderId: order.orderId, jobId: job.id, shouldPublish: decision.shouldPublish, downloadUrl: signed.url };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example.");
  const sample = { orderId: "order-1042", productName: "linen travel bag", fulfillmentState: "shipped" };
  console.log(await createOrderClip(sample, new InfraiClient(key), process.env.INFRAI_BUCKET ?? "ecommerce-video-demo"));
}
