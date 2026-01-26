#!/bin/sh

envsubst '${API_URL} ${BITSAVE_API_KEY} ${SHOW_DEMO}' \
  < /usr/share/nginx/html/assets/config-template.json \
  > /usr/share/nginx/html/assets/config.json

exec nginx -g "daemon off;"