#!/usr/bin/env bash
# Backup and restore drill: dump a database, restore the dump into a new,
# empty database, and compare row counts table by table. A backup that has
# never been restored is only a hope.
#
# Usage: SOURCE_URL=postgresql://... SCRATCH_URL=postgresql://.../postgres scripts/restore-drill.sh
#   SOURCE_URL   the database to back up (read-only access is enough)
#   SCRATCH_URL  a server where a temporary database may be created and dropped
set -euo pipefail
: "${SOURCE_URL:?set SOURCE_URL}" "${SCRATCH_URL:?set SCRATCH_URL}"

DUMP="$(mktemp -d)/backup.dump"
DRILL_DB="restore_drill_$(date +%s)"
TABLES="public.profiles public.mentor_profiles public.bookings public.availability_rules public.notifications"

echo "1/4 Dumping (custom format, compressed)..."
pg_dump --format=custom --no-owner --no-privileges --file="$DUMP" "$SOURCE_URL"
ls -lh "$DUMP" | awk '{print "    size: " $5}'

echo "2/4 Creating $DRILL_DB..."
psql "$SCRATCH_URL" -q -c "create database $DRILL_DB"
RESTORE_URL="$(python3 -c "import sys,urllib.parse as u; p=u.urlsplit(sys.argv[1]); print(u.urlunsplit(p._replace(path='/' + sys.argv[2])))" "$SCRATCH_URL" "$DRILL_DB")"

echo "3/4 Restoring..."
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$RESTORE_URL" "$DUMP" 2> restore.log || {
  echo "    restore failed, see restore.log"; exit 1; }

echo "4/4 Comparing row counts..."
status=0
for table in $TABLES; do
  before=$(psql "$SOURCE_URL" -tA -c "select count(*) from $table")
  after=$(psql "$RESTORE_URL" -tA -c "select count(*) from $table")
  printf "    %-28s %6s -> %6s\n" "$table" "$before" "$after"
  [ "$before" = "$after" ] || status=1
done

psql "$SCRATCH_URL" -q -c "drop database $DRILL_DB"
rm -f restore.log
[ $status -eq 0 ] && echo "Drill passed." || echo "Drill FAILED: counts differ."
exit $status
