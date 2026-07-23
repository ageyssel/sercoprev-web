#!/usr/bin/env bash
set -euo pipefail
api='https://api.cloudflare.com/client/v4'
auth=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H 'Content-Type: application/json')

curl -sS --max-time 30 "${auth[@]}" "$api/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/sercoprev-web/deployments" -o /tmp/deployments.json
curl -sS --max-time 30 "${auth[@]}" "$api/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/subdomain" -o /tmp/subdomain.json
curl -sS --max-time 30 "${auth[@]}" "$api/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/domains" -o /tmp/domains.json

jq -c '{active_deployment:(if (.result|type)=="array" then .result[0] elif (.result.deployments?|type)=="array" then .result.deployments[0] else null end | {id,created_on,source,strategy,versions}), success, errors}' /tmp/deployments.json
subdomain=$(jq -r '.result.subdomain // empty' /tmp/subdomain.json)
echo "workers_subdomain=$subdomain"
jq -c '{domains:[(.result // [])[]? | {hostname,service,environment}],success,errors}' /tmp/domains.json

if [ -n "$subdomain" ]; then
  workers_url="https://sercoprev-web.$subdomain.workers.dev"
  wh=$(curl -sS --max-time 30 -o /tmp/wh.json -w '%{http_code}' "$workers_url/api/health" || true)
  wv=$(curl -sS --max-time 30 -o /tmp/wv.json -w '%{http_code}' "$workers_url/api/version" || true)
  echo "workers_health_http=$wh workers_version_http=$wv"
  echo -n 'workers_health='; cat /tmp/wh.json 2>/dev/null || true; echo
  echo -n 'workers_version='; cat /tmp/wv.json 2>/dev/null || true; echo
fi

ph=$(curl -sS --max-time 30 -o /tmp/ph.json -w '%{http_code}' 'https://www.sercoprev.cl/api/health' || true)
pv=$(curl -sS --max-time 30 -o /tmp/pv.json -w '%{http_code}' 'https://www.sercoprev.cl/api/version' || true)
echo "public_health_http=$ph public_version_http=$pv"
echo -n 'public_health='; cat /tmp/ph.json 2>/dev/null || true; echo
echo -n 'public_version='; cat /tmp/pv.json 2>/dev/null || true; echo
