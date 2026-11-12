#!/usr/bin/env bash
# Downloads the current OpenSky snapshot (every tracked aircraft) to a file.
#
#   fetch-flights.sh <output-file>
#
# Signs in when OPENSKY_CLIENT_ID and OPENSKY_CLIENT_SECRET are set, otherwise
# uses the anonymous quota. The output file is only replaced by a valid snapshot.
set -euo pipefail

output="${1:?usage: fetch-flights.sh <output-file>}"

readonly STATES_URL="https://opensky-network.org/api/states/all"
readonly TOKEN_URL="https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"

auth=()
if [[ -n "${OPENSKY_CLIENT_ID:-}" && -n "${OPENSKY_CLIENT_SECRET:-}" ]]; then
  token="$(
    curl -sS --fail -m 20 -X POST \
      --data-urlencode "grant_type=client_credentials" \
      --data-urlencode "client_id=${OPENSKY_CLIENT_ID}" \
      --data-urlencode "client_secret=${OPENSKY_CLIENT_SECRET}" \
      "$TOKEN_URL" | jq -er '.access_token'
  )"
  # Keeps the token out of the logs when run by GitHub Actions.
  if [[ -n "${GITHUB_ACTIONS:-}" ]]; then echo "::add-mask::${token}"; fi
  auth=(-H "Authorization: Bearer ${token}")
fi

# The "+" form keeps an empty array valid under `set -u` on older bash versions.
curl -sS --fail -m 60 ${auth[@]+"${auth[@]}"} -o "${output}.part" "$STATES_URL"

jq -e '(.time | type == "number") and (.states | length > 0)' "${output}.part" > /dev/null
mv "${output}.part" "$output"

echo "Snapshot of $(jq '.states | length' "$output") aircraft, taken at $(jq '.time' "$output")."
