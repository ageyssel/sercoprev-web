import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// SERCOPREV does not require persistent ISR caching at this stage.
// The official helper still configures the Cloudflare wrapper, workerd
// conditions, middleware asset resolver and safe dummy cache defaults.
export default defineCloudflareConfig()
