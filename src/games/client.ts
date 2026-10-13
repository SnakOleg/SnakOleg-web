export type GameTab = "word" | "reaction" | "garden" | "capsule";
export const GAMES: GameTab[] = ["word", "reaction", "garden", "capsule"];
export const gameHref = (g?: GameTab) => (g ? `/games/${g}` : "/games");
export const openGames = (g?: GameTab) => location.assign(gameHref(g));
