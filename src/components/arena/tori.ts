/**
 * Tori's tutorial script, transcribed line-for-line from the concept deck.
 * Stored only — the tutorial overlay is intentionally NOT wired up yet.
 */

export type ToriPin = {
  /** Which element the arrow points at, or null for a centered line. */
  target:
    | null
    | "gamemode"
    | "warriors"
    | "playerIcon"
    | "news"
    | "currency"
    | "settings"
    | "truaero"
    | "seasonPass"
    | "roads"
    | "event"
    | "play"
    | "attacks"
    | "healthBar"
    | "timer"
    | "eliminationBar"
    | "fovArrows";
  text: string;
  /** Tori's face for this beat. */
  face?: "smile" | "happy" | "sad";
  /** Only on the very first line. */
  choices?: [string, string];
};

export const TORI_LOBBY_SCRIPT: ToriPin[] = [
  {
    target: null,
    text: "You look new here… Hi, I'm Tori. I can guide you around if you want!",
    choices: ["Yes, please!", "No, thanks!"],
  },
  { target: null, text: "Okay! Lets go!", face: "happy" },
  { target: null, text: "The first thing you need to know is how to play. Press 1 or 2 to select an attack, and hold to aim with your cursor." },
  { target: null, text: "If you do it right, you should see a little gray space where your attack is going to go. Also, you can auto aim by clicking anywhere!" },
  { target: null, text: "Release to attack!" },
  { target: null, text: "Now that you know how to play… Let's move on to the menus!", face: "happy" },
  { target: "gamemode", text: "Ok, lets move on… This right here is the gamemode menu! Choose the gamemode you want to play right here." },
  { target: "warriors", text: "Here, you can select warriors like me! You can also upgrade them with noodles and noodle packets!", face: "happy" },
  { target: "playerIcon", text: "Right here is your player icon! By default, your player icon will be the first letter of your username." },
  { target: "news", text: "Right here is the news button! Find sneek peeks and other things here!" },
  { target: "currency", text: "This is the currency bar! It shows How much currency you currently have." },
  { target: "settings", text: "Right here is the settings button. Change settings like Volume and FOV for a better playing experience." },
  { target: "truaero", text: "Here is the TruAero button! To all people who played Aero before May 21nd, 2026, Thank you! Sign up freebies and more!" },
  { target: "seasonPass", text: "Right here is the Season Pass! You progress via EXP. Buy the Plus pass for better rewards.\nIf you want the best rewards, Go pro." },
  { target: null, text: "The friends tab is where you can view your friends." },
  { target: null, text: "Make friends by typing in their user id, or giving them a qr code!" },
  { target: null, text: "Once thats done, you can challenge them, view their tabs in world, and more!" },
  { target: null, text: "We aren't quite finished with this part yet… so hang tight!", face: "sad" },
  { target: "roads", text: "Moving on to the roads! Those two buttons right there show your progress visually! Reaching certain points will give you rewards!" },
  { target: "event", text: "This is the event button! It switches depending on the current event! It will show you details and activities happening at this time." },
  { target: "play", text: "Finally, this is the play button! Go ahead and give it a shot! I'll be guiding you in the arena!" },
];

export const TORI_MATCH_SCRIPT: ToriPin[] = [
  { target: null, text: "Ok! Now that you are in the arena, here is how to play." },
  { target: "attacks", text: "Right there are your two attacks." },
  { target: "attacks", text: "Select one by pressing 1 or 2." },
  { target: "attacks", text: "After an attack is selected, you can aim it by moving your cursor and clicking. In case you are in a tight situation, click to auto aim." },
  { target: null, text: "Press WASD or the arrow keys to move." },
  { target: "healthBar", text: "Here is the health bar!\nIt shows the amount of health you have at that moment." },
  { target: "fovArrows", text: "These arrows right here show where your teammates are off-screen. Increase your FOV to see more of the map." },
  { target: "timer", text: "This is the ingame timer. If no one wins within this time, either the team closest to winning will win, or it will be a draw." },
  { target: "eliminationBar", text: "This is the elimination bar! It shows who has eliminated someone and who got eliminated." },
];
