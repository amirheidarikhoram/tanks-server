import { Player } from "./player.type";
import { Position2D } from "./transform.type";

export interface World {
    id: string;
    northwest: [number, number];
    southeast: [number, number];
    address: string;
}

export interface HitPointPlayer {
    point: Position2D;
    player: Player;
}
