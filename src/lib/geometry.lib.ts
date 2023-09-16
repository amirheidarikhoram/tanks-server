import { Direction2D, HitPointPlayer, Position2D, World } from "src/ts";
import Flatten from "@flatten-js/core";
import { Player } from "src/ts/player.type";

export const pointToLine = (point: Position2D, line: [Position2D, Position2D]) => {
    const _point = Flatten.point(...point);
    const _segment = Flatten.segment(...line[0], ...line[1]);

    return _point.distanceTo(_segment)[0];
};

export const pointToWorld = (point: Position2D, world: World) => {
    const { southeast, northwest } = world;

    const southwest = [northwest[0], southeast[1]] as Position2D;
    const northeast = [southeast[0], northwest[1]] as Position2D;

    const _point = Flatten.point(...point);
    const _box = new Flatten.Box(southwest[0], southwest[1], northeast[0], northeast[1]);
    const _polygon = new Flatten.Polygon();

    _polygon.addFace(_box);

    return _point.on(_polygon) ? -1 : _point.distanceTo(_polygon)[0];
};

export const isInWorld = (point: Position2D, world: World) => {
    const { southeast, northwest } = world;

    const southwest = [northwest[0], southeast[1]] as Position2D;
    const northeast = [southeast[0], northwest[1]] as Position2D;

    const _point = Flatten.point(...point);
    const _box = new Flatten.Box(southwest[0], southwest[1], northeast[0], northeast[1]);
    const _polygon = new Flatten.Polygon();

    _polygon.addFace(_box);

    // console.log({
    //     southwest,
    //     northeast,
    //     point,
    //     isOn: _point.on(_polygon),
    // });

    return _point.on(_polygon);
};

export const bulletHitsPlayers = (
    firePosition: Position2D,
    fireDirection: Direction2D,
    players: Player[]
): HitPointPlayer | undefined => {
    const firePoint = new Flatten.Point(...firePosition);
    const norm = [-1 * fireDirection[1], fireDirection[0]];
    const ray = new Flatten.Ray(new Flatten.Point(...firePosition), new Flatten.Vector(...norm));

    const hitPlayers = players
        .map((player) => {
            const playerPosition = player.transform.position;

            const matrix = new Flatten.Matrix();

            matrix.translate(...playerPosition);
            matrix.rotate(player.transform.rotation[2]);

            const playerObject = new Flatten.Box(
                playerPosition[0] - 1,
                playerPosition[1] - 1.5,
                playerPosition[0] + 1,
                playerPosition[1] + 1.5
            );

            playerObject.transform(matrix);

            const intersectionPoints = ray.intersect(playerObject);
            intersectionPoints.sort((intPoint1, intPoint2) => {
                return intPoint1.distanceTo(firePoint) >= intPoint2.distanceTo(firePoint) ? 1 : -1;
            });

            // console.log(ray);
            // console.log(playerObject);
            // console.log(intersectionPoints);

            return {
                player,
                point: intersectionPoints.at(0),
            };
        })
        .filter((hitpoint) => !!hitpoint.point);

    hitPlayers.sort((hp1, hp2) => {
        return hp1.point.distanceTo(firePoint) >= hp2.point.distanceTo(firePoint) ? 1 : -1;
    });

    const hitPointPlayer = hitPlayers.at(0);

    return hitPointPlayer
        ? {
              player: hitPointPlayer.player,
              point: [hitPointPlayer.point.x, hitPointPlayer.point.y],
          }
        : undefined;
};
