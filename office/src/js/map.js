/* ---------------- campus map ----------------
   One indoor building on a 44 x 44 tile grid (1 tile = 24px, true 2:1 isometric).
   Rooms sit at fixed spots by department slot; the departments table fills in each room's name,
   colour and whether it's staffed (planned rooms are dimmed with a HIRING sign). */
const U = 24, N = 44;
const ROOMS = {
  0:{x:28,y:8,w:8,d:8, door:[31.3,32.7], seats:[[29.5,14.25],[31.5,14.25],[33.5,14.25]]},
  1:{x:6,y:24,w:8,d:8, door:[9.3,10.7], seats:[[7.5,28.05],[10,28.05],[12.5,28.05]]},
  2:{x:9,y:1.5,w:7,d:5, door:[11.8,13.2], seats:[[10.1,4.85],[11.85,4.85],[13.6,4.85]]},
  3:{x:4,y:8,w:10,d:8, door:[8.3,9.7], seats:[[5.5,11.65],[9,11.65],[12.5,11.65]]},
  4:{x:16.5,y:15.5,w:11,d:12, open:true},
  5:{x:28,y:28,w:8,d:8, door:[31.3,32.7], seats:[[29.7,33.65],[31.8,33.65],[33.9,33.65]]},
  6:{x:24,y:36.5,w:6,d:5.5, door:[26.3,27.7], seats:[[25,38.65],[26.8,38.65],[28.6,38.65]]},
  7:{x:37.5,y:36,w:6,d:6, door:[39.8,41.2], seats:[[38.5,38.25],[40.3,38.25],[42.1,38.25]]},
  8:{x:30,y:18,w:8,d:8, door:[33.3,34.7], seats:[[31.5,21.85],[35.1,21.85],[31.5,25.05]]},
  9:{x:4,y:16,w:5,d:5, door:[5.8,7.2], noBack:true, rightFrom:17},
  10:{x:10,y:34,w:8,d:7, door:[13.3,14.7], leftGap:[35.6,38.4]},
  11:{x:37.5,y:8.5,w:6,d:7, door:[39.8,41.2]}
};
const EXTRA_ROOMS = [{key:'huddle', label:'HUDDLE', x:23.5,y:1.5,w:6,d:5.5, door:[25.8,27.2], color:'#9A6A2E', role:'A glass meeting pod where a lead meets their workers.'},
  {key:'terrace', label:'TERRACE', x:1.5,y:35,w:8.2,d:7.6, outdoor:true, color:'#E8C66A', role:'The one outdoor spot: a deck off the café with patio tables and string lights.'}];
const P = {
  mail:{x:6.4,y:18.6}, bins:{x:31,y:30.4}, exec:{x:30.6,y:9.5}, cafe:{x:15.4,y:36.7}, cafe2:{x:12.6,y:38.9},
  lounge1:{x:39.4,y:13.3}, lounge2:{x:41.3,y:12.6}, deskDrop:{x:21.9,y:22.8}, you:{x:21.9,y:19.7}
};
const TRAYS = {act:{x:20.4,y:21.1}, review:{x:21.9,y:21.1}, fyi:{x:23.4,y:21.1}};
const PLANTS = [[2.4,13],[2.4,19.5],[6.5,3.2],[19,6.4],[33,4.5],[40,4],[42,6.6],[42.2,18.4],[42,28.5],[42,32.5],[33.5,40],[19.6,41.6],[17,31],[25.5,34]];
const LOOK = { // hair colour and one accessory per agent, so everyone reads at a glance
  executive:['#3A2148','bun'], amex:['#5A3418','cap'], inbox:['#C98A2E','phones'], auditor:['#1E1A18','glasses'], controller:['#7A3B12','tie'],
  spend:['#8A4B2A','cap'], 'bills-lead':['#2A1C14','tie'], 'portfolio-analyst':['#C9A44C','glasses']
};
const HAIRS = ['#2A1C14','#5A3418','#8A4B2A','#C98A2E','#1E1A18','#7A3B12'];

