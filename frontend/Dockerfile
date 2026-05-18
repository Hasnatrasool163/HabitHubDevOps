FROM nginx:alpine
LABEL maintainer="Hasnatrasool163"
LABEL description="HabitHub Frontend"
COPY nginx.conf /etc/nginx/nginx.conf
COPY public/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
