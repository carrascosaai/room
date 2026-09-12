set -e
B=localhost:3111
CODE=$(curl -s -X POST $B/api/rooms -d '{"nickname":"Fer","lang":"en"}' | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.code+' '+j.playerId)})")
ROOM=$(echo $CODE | cut -d' ' -f1); HOST=$(echo $CODE | cut -d' ' -f2)
echo "room=$ROOM host=$HOST"
declare -a PIDS=("$HOST")
for n in Ana Pablo Carlos Maria; do
  PID=$(curl -s -X POST $B/api/rooms/$ROOM/join -d "{\"nickname\":\"$n\",\"lang\":\"en\"}" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).playerId))")
  PIDS+=("$PID")
done
echo "players: ${PIDS[@]}"
curl -s -X POST $B/api/rooms/$ROOM/start -d "{\"playerId\":\"$HOST\"}" | node -e "process.stdin.on('data',d=>console.log('start phase:',JSON.parse(d).view.phase))"

for i in $(seq 1 80); do
  V=$(curl -s "$B/api/rooms/$ROOM?pid=$HOST")
  PHASE=$(echo $V | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).view.phase))")
  if [ "$PHASE" = "FINAL_REPORT" ]; then echo "REACHED FINAL_REPORT at step $i"; break; fi
  if [ "$PHASE" = "PRIVATE_DECISION" ]; then
    for PID in "${PIDS[@]}"; do
      OPT=$(curl -s "$B/api/rooms/$ROOM?pid=$PID" | node -e "process.stdin.on('data',d=>{const v=JSON.parse(d).view;const o=v.round&&v.round.myOptions&&v.round.myOptions[0];console.log(o?o.id:'')})")
      if [ -n "$OPT" ]; then curl -s -X POST $B/api/rooms/$ROOM/answer -d "{\"playerId\":\"$PID\",\"optionId\":\"$OPT\"}" > /dev/null; fi
    done
  fi
  curl -s -X POST $B/api/rooms/$ROOM/advance -d "{\"playerId\":\"$HOST\"}" > /dev/null
  sleep 0.15
done
curl -s "$B/api/rooms/$ROOM?pid=$HOST" | node -e "process.stdin.on('data',d=>{const v=JSON.parse(d).view;console.log('final phase:',v.phase);console.log('rounds:',v.aiMessages.length,'ai msgs');console.log('hypotheses tested:',v.report&&v.report.hypothesesTested);console.log('winner:',v.report&&v.report.gameWinnerId);console.log('standings:',JSON.stringify(v.report&&v.report.standings));}) "
