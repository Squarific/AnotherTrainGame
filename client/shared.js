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