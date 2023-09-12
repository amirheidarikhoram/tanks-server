import { Position2D, Rotation3D } from "./transform.type";

export type Player = {
    id: string;
    hp: number;
    transform: {
        position: Position2D;
        rotation: Rotation3D;
    };
    lastFireTS: number;
};
