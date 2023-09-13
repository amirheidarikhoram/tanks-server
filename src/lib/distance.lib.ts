import { Position2D, World } from "src/ts";
import Flatten from "@flatten-js/core";

export const pointToLine = (point: Position2D, line: [Position2D, Position2D]) => {
    const _point = Flatten.point(...point);
    const _segment = Flatten.segment(...line[0], ...line[1]);

    return _point.distanceTo(_segment)[0];
};

export const pointToWorld = (point: Position2D, world: World) => {
    const { southeast, northwest } = world;

    const southwest = [northwest[0], southeast[1]] as Position2D;
    const northeast = [southwest[0], northwest[1]] as Position2D;

    const _point = Flatten.point(...point);
    const _box = new Flatten.Box(southwest[0], southeast[1], northeast[0], northeast[1]);
    const _polygon = new Flatten.Polygon();

    _polygon.addFace(_box);

    return _point.on(_polygon) ? -1 : _point.distanceTo(_polygon)[0];
};
