#!/bin/sh

export API_BASE_URL=$(echo $API_URL | sed 's/\/api$//')

envsubst '${API_URL} ${BITSAVE_API_KEY} ${SHOW_DEMO}' \
  < /usr/share/nginx/html/assets/config-template.json \
  > /usr/share/nginx/html/assets/config.json

envsubst '${API_BASE_URL}' \
  < /usr/share/nginx/html/index.html \
  > /usr/share/nginx/html/index.tmp && mv /usr/share/nginx/html/index.tmp /usr/share/nginx/html/index.html

exec nginx -g "daemon off;"