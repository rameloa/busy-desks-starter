# Office Floor Rules

How agents behave on the Busy Desks office page. Any change to the page (office/src/, built into office/index.html) follows these.

## 1. The floor is never still
- Every live agent is always doing something: working a real run, or on a small errand between runs.
- Between errands an agent waits 1.5–5 seconds, then picks the next one. With reduced motion turned on, about every 15 seconds.
- Errands: stroll around their room, coffee in the café (☕), sit in the lounge (🎵), water the nearest plant (🌱), stretch at the desk (🙆), wave at a coworker who isn't working (👋), or desk time: sit at their own screens for 6–12 seconds (no emote, no bubble). No errand repeats twice in a row.

## 2. Real work always wins
- A real event cancels the errand in progress at once. The agent starts the job from wherever they are standing.
- Errands never count as "busy": they never delay a run, a replay, or the next run in the queue.
- Only real work gets the busy ring under an agent's feet.

## 3. Errands never pretend to be work
- Errands show icon emotes only, never words. Speech bubbles carry real event messages only.
- Errands never pick up, carry or drop items, never touch the trays, and never write to the caption or the event stream.
- Planned agents don't appear on the floor; their desk shows a HIRING sign.

## 3b. Robot vacuums
- Two little robot vacuums (one white, one charcoal) are floor life, like errands. They are not agents: no name, no words, no events, never busy, never carry items or touch the trays, can't be tapped.
- They roam the open floor, stop and give way to people and to each other, and people step around them. Same solid floor as people: they route around walls and furniture and get hidden behind whatever is in front of them.
- When the battery runs low (amber light) they drive back to their dock and charge (blue light) before heading out again. Docks: the corridor south of your desk, and the corridor outside the lounge.
- With reduced motion turned on they stay on their docks.

## 4. Readable at a glance
- One action at a time per agent, so you can follow the story.
- Name tag under every agent; the selected agent's tag is outlined. A team lead's tag, and the Executive's, carries a gold star.
- Seated at their own desk, people face their screens (back to you), legs tucked under the desk. Seated anywhere else, they face you.
- Desk screens are on only for a live agent; an empty or paused desk has dark screens.
- Items move only along the chain: worker → boss's desk → Iris → your trays.

## 5. The floor is solid
- What you see is what blocks. Every wall, glass partition, desk, counter, table, planter, shelf and rack drawn below head height blocks people. The walkable map is built from the drawing itself, so it can't drift from what's on screen.
- People are bodies, not points: they keep a shoulder's width from walls, turn corners without cutting them, and only pass through real door gaps.
- Every step is re-checked against what's solid. A person can't be routed, pushed or slid into a wall or a piece of furniture; when blocked they slide along it or find another way.
- If somewhere can't be reached (a room with no way in), they walk to the closest spot they can reach. They never walk straight through.
- Personal space: people step aside for each other, keep right when meeting head-on, and never stand inside one another. Seated people stay put.
- Real pace: they speed up from a standstill and ease off before stopping.
- Walls and furniture really cover people. Whatever is nearer the camera (a wall, a counter, a shelf, the mezzanine overhead) hides the part of a person behind it, and nearer people draw in front of farther ones. Glass and chairs never hide anyone. Name tags and bubbles stay visible.
- Cutaway: zooming into a room fades the walls and tall things between you and that room, so you can see who's inside. Panning or going back to Campus brings them back; zooming in or out by hand keeps the room you focused.
- Chairs don't block (people sit in them). HIRING banners hang above the glass so they never block a corridor.
- Any new room or furniture must leave every desk, station and door reachable. Check with the route test (`node office/dev/check.mjs routes`) before publishing.

