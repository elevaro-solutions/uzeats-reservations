FROM mongo:7

COPY entrypoint.sh /usr/local/bin/mongo-replica-entrypoint.sh
RUN chmod +x /usr/local/bin/mongo-replica-entrypoint.sh

ENTRYPOINT ["mongo-replica-entrypoint.sh"]
