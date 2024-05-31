export let CONSTANTS = {
	TICK_TIME: 1000 / 20,
	SUCTION_RADIUS: 75,
	RAIL_RADIUS: 8,
    SUCTION_RADIUS: 75,
    TICK_TIME: 1000 / 20,
    TRANSPORT_PIXELS_PER_MS: 0.03,
    RESOURCE_COLLECTION_COOLDOWN_TICKS: 100,
    FIELD_COOLDOWN_TICKS: 400,
    TREE_RADIUS: 5,
    MAX_RAIL_LENGTH: 250,
    TRANSPORT_SIZE: 16
};

CONSTANTS.STATION_COST = CONSTANTS.SUCTION_RADIUS;
CONSTANTS.DISTANCE_PER_TICK = CONSTANTS.TICK_TIME * CONSTANTS.TRANSPORT_PIXELS_PER_MS;
CONSTANTS.MIN_DISTANCE_BETWEEN_CITIES = CONSTANTS.SUCTION_RADIUS;

export const LIST_FROM_RESOURCE = {
    "STONE": "mountains",
    "CORN": "fields",
    "WATER": "water",
    "SNOW": "snow"
};

export function isIndustry (position, size) {
    if (!size) size = 1;

    for (var i = 0; i < worldState.industries.length; i++) {
        if (distance(worldState.industries[i].position, position) < size)
            return true;
    }

    return false;
}

export function isField (position, size) {
    if (!size) size = 0;

    for (var i = 0; i < worldState.fields.length; i++) {
        if (distance(worldState.fields[i].position, position) < worldState.fields[i].size + size)
            return true;
    }

    return false;
}

export function isWater (position, size) {
    if (!size) size = 0;

    for (var i = 0; i < worldState.water.length; i++) {
        if (distance(worldState.water[i].position, position) < worldState.water[i].size + size)
            return true;
    }

    return false;
}

export function isMountain (position, size) {
    if (!size) size = 0;

    for (var i = 0; i < worldState.mountains.length; i++) {
        let mountain = worldState.mountains[i];
        if (distance(mountain.position, position) < mountain.size + size)
            return true;
    }

    return false;
}

export function isSnow (position, size) {
    if (!size) size = 0;
    for (var i = 0; i < worldState.snow.length; i++) {
        if (distance(worldState.snow[i].position, position) < worldState.snow[i].size + size)
            return true;
    }

    return false;
}

export function isOccupied (position, size) {
    return isWater(position, size) || isMountain(position, size) || isSnow(position, size) || isCity(position, size) || isField(position, size) || isIndustry(position, size);
}

export function validNewStation (point) {
    if (isCity(point)) return true;
    if (isWater(point) || (isMountain(point) && !isSnow(point))) return false;
    if (getStation(point, MIN_DISTANCE_BETWEEN_CITIES)) return false;
    return true;
}

export function validNewRail (from, to) {
    let fromIsStation = isStation(from);
    let toIsStation = isStation(to);
    let length = distance(from, to);

    if (length > MAX_RAIL_LENGTH) return false;
    if (!fromIsStation && !validNewStation(from)) return false;
    if (!toIsStation && !validNewStation(to)) return false;

    return true;
}

export function tryAddRail (from, to) {
    from = snapToStationOrCity(from);
    to = snapToStationOrCity(to);

    if (!validNewRail(from, to)) return;

    if (clientState.railBudget < 1) return;

    let fromStation = getOrCreateStation(from);
    let toStation = getOrCreateStation(to);

    if (isConnected(fromStation, toStation)) return;

    var newLength = worldState.rails.push({ from: fromStation, to: toStation });
    fromStation.rails.push(worldState.rails[newLength - 1]);
    toStation.rails.push(worldState.rails[newLength - 1]);
    graph.addLink(nodeName(fromStation), nodeName(toStation), { distance: distance(fromStation.position, toStation.position )});
    clientState.railBudget -= 1;
}

export class Station {
    constructor (position) {
        this.position = position;
        this.rails = [];
        this.lastResourceGathered = -RESOURCE_COLLECTION_COOLDOWN_TICKS;
    }
}

export class Industry {
    constructor (position, requests, offers) {
        this.position = position;
        this.requests = requests;
        this.offers = offers;
    }
}

export function distance (p1, p2) {
    let a = p1.x - p2.x;
    let b = p1.y - p2.y;
    return Math.sqrt(a * a + b * b);
}

export function isCity (point) {
    for (let i = 0; i < worldState.cities.length; i++) {
        if (distance(point, worldState.cities[i].position) < 1) return true;
    }

    return false;
}

export function isStation (point) {
    for (let i = 0; i < worldState.stations.length; i++) {
        if (distance(point, worldState.stations[i].position) < 1) return true;
    }

    return false;
}

export function getStation (point, within) {
    for (let i = 0; i < worldState.stations.length; i++) {
        let station = worldState.stations[i];
        if (distance(point, station.position) < (within || 1)) return station;
    }
}

export function getOrCreateStation (point) {
    for (let i = 0; i < worldState.stations.length; i++) {
        let station = worldState.stations[i];
        if (distance(point, station.position) < 1) return station;
    }

    let station = new Station(point);
    worldState.stations.push(station);
    graph.addNode(nodeName(station), station);
    return station;
}

export function getCity (position, within) {
    for (let i = 0; i < worldState.cities.length; i++) {
        let city = worldState.cities[i];
        if (distance(position, city.position) < (within || 1)) return city;
    }
}

export function snapToStationOrCity (point) {
    for (let i = 0; i < worldState.stations.length; i++) {
        let station = worldState.stations[i];
        if (distance(station.position, point) < RAIL_RADIUS * 2) { return station.position; }
    }

    for (let i = 0; i < worldState.cities.length; i++) {
        let city = worldState.cities[i];
        if (distance(city.position, point) < city.renderSize() + RAIL_RADIUS) { return city.position; }
    }
    
    return point;
}

export function nodeName (station) {
    return station.position.x + "x" + station.position.y;
}