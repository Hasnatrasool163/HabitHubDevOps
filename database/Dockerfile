FROM postgres:16-alpine
LABEL maintainer="Hasnatrasool163"
LABEL description="HabitHub PostgreSQL Database"
ENV POSTGRES_DB=habithub
ENV POSTGRES_USER=habithub
ENV POSTGRES_PASSWORD=habithub123
COPY init.sql /docker-entrypoint-initdb.d/init.sql
EXPOSE 5432
VOLUME ["/var/lib/postgresql/data"]
