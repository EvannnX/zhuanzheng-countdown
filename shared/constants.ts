export const TICK_MS = 50;
export const SNAPSHOT_EVERY_TICKS = 2;
export const SERVER_PORT = 3001;
/** A dropped player keeps their seat, KPI and tasks this long while their browser reconnects. */
export const RECONNECT_GRACE_MS = 60_000;
/** Sockets are pinged this often; one that misses a round is treated as dropped. */
export const HEARTBEAT_MS = 10_000;

export const TOTAL_DAYS = 5;
/** Longest a day can last; it normally ends sooner, when somebody hits DAY_KPI_TARGET. */
export const DAY_SECONDS = 540;
/** KPI earned in one day that sends everyone home. */
export const DAY_KPI_TARGET = 60;
/** Random events are spread over this much of the working day. */
export const EVENT_WINDOW_SECONDS = 220;
/** The morning rush: wake up at 8:00, work starts at 9:00. */
export const COMMUTE_SECONDS = 165;
export const SUMMARY_SECONDS = 12;
/** Length of the opening film every player watches together before day one. */
export const INTRO_SECONDS = 84;
/** How many of `headcount` interns get a contract at the end. */
export const promoteQuota = (headcount: number): number => Math.max(1, Math.ceil(headcount / 3));
export const MAX_PLAYERS = 8;
export const MAX_NAME_LENGTH = 10;
export const TASK_SLOTS = 3;

export const MAX_WARNINGS = 3;
export const MAX_ENERGY = 100;
export const START_ENERGY = 70;
export const ENERGY_DRAIN_PER_SECOND = 0.35;
export const WORK_ENERGY_COST = 6;
export const TIRED_SPEED_FACTOR = 0.55;
export const TIRED_HOLD_FACTOR = 1.7;

export const PLAYER_SPEED = 4.2;
export const PLAYER_RADIUS = 0.35;
export const EYE_HEIGHT = 1.55;
/** Take-off speed and gravity of a jump: about 0.8 m high, 0.7 s in the air. */
export const JUMP_SPEED = 4.6;
export const GRAVITY = 13;
export const SLIPPER_SPEED_FACTOR = 1.2;
export const GHOST_SPEED_FACTOR = 1.1;
export const MAX_MOVE_SPEED = 8;
export const MOVE_SLACK_METERS = 1.5;

export const INTERACT_RANGE = 1.8;
export const STEAL_RANGE = 1.8;
export const STEAL_KEEP_RANGE = 2.6;
export const STEAL_HALF_ANGLE = 1.0;
export const REPORT_RANGE = 10;
export const REPORT_HALF_ANGLE = 0.45;
export const BLAME_RANGE = 6;
export const BRIBE_RANGE = 2.2;
export const DESK_COVER_RANGE = 2.5;

export const EXPOSE_SECONDS = 0.8;
export const EXPOSURE_DECAY = 0.5;
export const IMMUNE_SECONDS = 6;
export const CLOSE_SIGHT_RANGE = 1.6;
export const HR_STALL_CHECK_RANGE = 5;
export const PRINTER_BLAME_RANGE = 4;

export const NPC_WAIT_SECONDS = 2.5;
export const NPC_SCAN_SPEED = 0.9;
export const INSPECTION_SPEED_FACTOR = 1.7;
export const INSPECTION_RANGE_BONUS = 3;

export const SLACK_RATE = { phone: 5, sleep: 9, stall: 8, bench: 13 } as const;
export const SNACK_ENERGY = 35;
export const TEA_SNACK_ENERGY = 45;

export const REPORT_COOLDOWN = 40;
export const REPORT_REWARD = 6;
export const SUMMON_COOLDOWN = 30;
export const INTEL_SECONDS = 45;
export const FIX_REWARD = 8;
export const REPAIR_REWARD = 8;
export const REPAIRS_NEEDED = 3;
export const TAMPER_REWARD = 22;
export const PRINTER_JAM_CHANCE = 0.25;
export const MINIGAME_MIN_SECONDS = 1.2;
export const SERVER_DOWN_KPI_FACTOR = 0.5;

export const HOLD_SECONDS = {
  wash: 3,
  dress: 2.2,
  breakfast: 2,
  pancake: 2.5,
  stun: 2.2,
  snack: 1.5,
  eat: 1.5,
  tamper: 5,
  blame: 1.5,
  steal: 1.2,
  repair: 3,
  jam: 2,
  assist: 30,
  badge: 1,
  slip: 2.5,
} as const;

export const EVENT_SECONDS = {
  inspection: 30,
  serverDown: 45,
  meeting: 28,
  fireDrill: 30,
  teaTime: 30,
  rush: 30,
} as const;
export const EVENT_SLOTS = [0.3, 0.65] as const;
export const EVENT_JITTER = 0.05;
export const SERVER_DOWN_PENALTY = 8;
export const MEETING_REWARD = 8;
export const MEETING_ENERGY_COST = 10;
export const DRILL_FIRST_REWARD = 10;
export const DRILL_REWARD = 5;
export const DRILL_PENALTY = 8;

// ---- morning rush and commute ----
export const HOME_ENERGY = 45;
export const BREAKFAST_ENERGY = 40;
export const PANCAKE_ENERGY = 25;
export const BREAKFAST_SHARE = 0.6;
/** Seconds the train takes once its doors have closed; everyone aboard steps off together. */
export const RIDE_SECONDS = 8;
/** How close to an open train door (along the platform, and back from the edge) counts as stepping aboard. */
export const BOARD_HALF_WIDTH = 0.9;
export const BOARD_DEPTH = 0.75;
/** Share of riders who can get a seat. */
export const SEAT_ENERGY = 18;
/** How often a sacked intern turned floor monitor may write somebody up. */
export const CATCH_COOLDOWN = 15;
export const FIRST_ARRIVAL_REWARD = 8;
export const ON_TIME_REWARD = 4;
export const LATE_PENALTY = 8;
export const UNWASHED_PENALTY = 4;
export const PAJAMAS_PENALTY = 6;
export const HIT_ENERGY_COST = 10;
export const HIT_KPI_COST = 3;
export const HIT_SAFE_SECONDS = 1.5;
export const HIT_PUSH_METERS = 1.3;
export const RUSH_KPI_FACTOR = 2;

// ---- being chased ----
export const CHASE_SECONDS = 8;
export const CHASE_SPEED = 4.0;
export const CHASE_CATCH_RANGE = 1.3;
export const CHASE_REPATH_SECONDS = 0.4;
export const ESCAPE_REWARD = 3;

// ---- intern versus intern ----
export const SHOVE_RANGE = 1.9;
export const SHOVE_HALF_ANGLE = 1.0;
export const SHOVE_PUSH_METERS = 2.6;
export const SHOVE_STEP_METERS = 0.2;
export const SHOVE_STUN_SECONDS = 0.9;
export const SHOVE_COOLDOWN = 6;
export const SHOVE_ENERGY_COST = 4;
export const TRAP_RADIUS = 0.75;
export const TRAP_STUN_SECONDS = 2.2;
export const MAX_BANANAS = 3;
export const MAX_TRAPS = 24;
export const CHAMPION_REWARD = 6;

/** How close you must stand to a colleague to hand them something to sign. */
export const FACE_TO_FACE_RANGE = 2.4;
/** Seconds in a stall before the restroom gives up one of its stories (once a day). */
export const STALL_STORY_SECONDS = 4;
export const STALL_TIP_KPI = 5;
export const STALL_NO_PAPER_SECONDS = 2.5;

// ---- cooperation ----
/** Tasks each intern must contribute to the department goal, per day. */
export const OKR_PER_PLAYER = [2, 2, 3, 3, 3] as const;
export const OKR_REWARD = 6;
export const OKR_PENALTY = 5;
export const ASSIST_REWARD = 8;

// ---- tower lobby, lifts and the away-day shuttle ----
/** How often the turnstile ignores a perfectly good badge. */
export const BADGE_FAIL_CHANCE = 0.35;
/** How far past the turnstile line an unbadged intern gets before the guard objects. */
export const LOBBY_GATE_SLACK = 0.7;
export const LIFT_CAPACITY = 4;
/** Every third lift the director and his guests take most of the car. */
export const LIFT_BOSS_EVERY = 3;
export const LIFT_BOSS_CAPACITY = 1;
/** Seconds between the lift doors closing and opening on the destination floor. */
export const LIFT_RIDE_SECONDS = 7;
export const LIFT_TALKS = 2;
/** The shuttle waits this long for stragglers once somebody takes the wheel. */
export const VAN_WAIT_SECONDS = 8;
export const VAN_TRIP_SECONDS = 12;
export const VAN_SHORTCUT_SECONDS = 5;
export const VAN_DETOUR_SECONDS = 4;
export const VAN_MAX_DETOURS = 2;
export const VAN_MIN_REMAINING = 1.5;
export const VAN_DRIVER_REWARD = 3;
export const VAN_SEATS = 8;
