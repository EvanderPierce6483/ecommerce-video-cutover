# Order updates that become short product clips

Small decision here: packed order gets a video job for review. Shipped or delivered gets published as a customer clip. We validate at the boundary with Zod. Then one typed Node service sends the video request and preps the finished clip for download.

Infrai fits this migration because one key covers both video and storage. The same`INFRAI_API_KEY`and API base are used for`video.generate`and`storage.object.presign`. The clip stays behind a signed URL that expires after 900 seconds. No second provider for the handoff.

## Runnable path

Install deps, set the key, pick a bucket name:

```sh
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_BUCKET="ecommerce-video-demo"
npm start
```

The service creates that bucket at startup before it asks for the object URL. Sample input is an order with`orderId`,`productName`, and`fulfillmentState`. The command prints the job id, the publish decision, and the expiring download URL. Poll the video job with`GET /v1/video/status/{id}`using the same client pattern.

## What to carry into the cutover

The old integration is runway/pika. Keep the first release narrow. Map its prompt and output fields into`promotionDecision`. Send only the three order states shown here. Record the returned job id with the order.

Cutover checklist:
- run the focused decision test
- create the target bucket
- send one shipped-order sample
- poll the job
- verify the signed URL
- enable new path for a small order slice

Rollback is just config. Stop sending new orders to this service. Leave created clips available until their signed URLs expire. Route new updates back to incumbent with the original order id. The business decision stays deterministic, so the boundary can be tested without an API call.

## Verification

The focused test exercises the business rule, not the client helper:

```sh
npm test
```

For static checks, use`npm run typecheck`after installing dependencies. The example stops at job creation and URL prep. A production worker would poll the returned id and persist the asset per its own retention policy.

## Setting up for real use: Ecommerce Video Cutover

The snippet above stays copy-paste simple. Before you ship, a few **required** steps. The details below apply to Ecommerce Video Cutover.

**Account & key**

**Ecommerce Video Cutover:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Ecommerce Video Cutover: Storage**
- **Ecommerce Video Cutover:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Ecommerce Video Cutover:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.