#!/usr/bin/env bash
set -euo pipefail

REPLICA_SET="${MONGO_REPLICA_SET:-rs0}"
REPLICA_HOST="${MONGO_REPLICA_HOST:-localhost:27017}"
INIT_MARKER="/data/db/.replica_initialized"

init_replica_set() {
  if [[ -f "$INIT_MARKER" ]]; then
    return 0
  fi

  echo ">> Configuring single-node replica set ${REPLICA_SET} (${REPLICA_HOST})"

  mongod --replSet "$REPLICA_SET" --bind_ip_all --fork --logpath /tmp/mongod-init.log

  for _ in $(seq 1 30); do
    if mongosh --quiet --eval "db.adminCommand({ ping: 1 })" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  mongosh --quiet --eval "
    try {
      rs.status();
      print('Replica set already configured');
    } catch (err) {
      rs.initiate({
        _id: '${REPLICA_SET}',
        members: [{ _id: 0, host: '${REPLICA_HOST}' }]
      });
      print('Replica set initiated');
    }
  "

  for _ in $(seq 1 30); do
    if mongosh --quiet --eval "rs.isMaster().ismaster" 2>/dev/null | grep -q true; then
      break
    fi
    sleep 1
  done

  mongod --shutdown
  touch "$INIT_MARKER"
  echo ">> Replica set ${REPLICA_SET} ready"
}

init_replica_set

exec docker-entrypoint.sh mongod --replSet "$REPLICA_SET" --bind_ip_all
