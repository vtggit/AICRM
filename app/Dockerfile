FROM nginx:1.25-alpine

# Copy static frontend files into nginx document root
COPY . /usr/share/nginx/html

# Use custom nginx config that sets API base from env
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
