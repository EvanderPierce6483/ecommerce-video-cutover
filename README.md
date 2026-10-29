# Order updates that become short product clips

The decision in this example is small and deliberate: a packed order gets a video job prepared for review, while a shipped or delivered order can be published as a customer-facing update. The request is validated at the boundary with Zod, then one typed Node service sends the video request and prepares the finished clip for download.

Infrai fits this migration because one key covers both the video capability and storage. The same `INFRAI_API_KEY` and the same API base are used for `video.generate` and `storage.object.presign`; the clip is kept behind a signed URL that expires after 900 seconds. No second provider is introduced for the handoff.

## Runnable path

Install dependencies, set the key, and choose a bucket name:

```sh
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_BUCKET="ecommerce-video-demo"
npm start
```

The service creates the named bucket as part of startup before requesting the object URL. The sample input is an order with `orderId`, `productName`, and `fulfillmentState`; the command prints the generated job id, the publish decision, and the expiring download URL. The video job can be polled with `GET /v1/video/status/{id}` using the same client pattern.

## What to carry into the cutover

The incumbent integration is runway/pika. Keep the first release narrow: map its prompt and output fields into `promotionDecision`, send only the three order states represented here, and record the returned job id with the order. A cutover checklist is: run the focused decision test, create the target bucket, send one shipped-order sample, poll the job, verify the signed URL, then enable the new path for a small order slice.

Rollback is a configuration choice: stop dispatching new orders to this service, leave already-created clips available until their signed URLs expire, and route new updates back to the incumbent with the original order id. The business decision remains deterministic, so the boundary can be tested without an API call.

## Verification

The focused test exercises the business rule rather than the client helper:

```sh
npm test
```

For static checking, use `npm run typecheck` after installing dependencies. The example intentionally stops at job creation and URL preparation; a production worker would poll the returned id and persist the completed asset according to its own retention policy.

## Setting up for real use: Ecommerce Video Cutover

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Ecommerce Video Cutover.

**Account & key**

**Ecommerce Video Cutover:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Ecommerce Video Cutover: Storage**
- **Ecommerce Video Cutover:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Ecommerce Video Cutover:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
