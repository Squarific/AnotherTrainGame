const WebSocket = require('ws');
const createGraph = require('ngraph.graph');
const ngraphPath = require('ngraph.path');

let CONSTANTS = {
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

const LIST_FROM_RESOURCE = {
    "STONE": "mountains",
    "CORN": "fields",
    "WATER": "water",
    "SNOW": "snow"
};

function isIndustry (position, size) {
    if (!size) size = 1;

    for (var i = 0; i < worldState.industries.length; i++) {
        if (distance(worldState.industries[i].position, position) < size)
            return true;
    }

    return false;
}

function isField (position, size) {
    if (!size) size = 0;

    for (var i = 0; i < worldState.fields.length; i++) {
        if (distance(worldState.fields[i].position, position) < worldState.fields[i].size + size)
            return true;
    }

    return false;
}

function isWater (position, size) {
    if (!size) size = 0;

    for (var i = 0; i < worldState.water.length; i++) {
        if (distance(worldState.water[i].position, position) < worldState.water[i].size + size)
            return true;
    }

    return false;
}

function isMountain (position, size) {
    if (!size) size = 0;

    for (var i = 0; i < worldState.mountains.length; i++) {
        let mountain = worldState.mountains[i];
        if (distance(mountain.position, position) < mountain.size + size)
            return true;
    }

    return false;
}

function isSnow (position, size) {
    if (!size) size = 0;
    for (var i = 0; i < worldState.snow.length; i++) {
        if (distance(worldState.snow[i].position, position) < worldState.snow[i].size + size)
            return true;
    }

    return false;
}

function isOccupied (position, size) {
    return isWater(position, size) || isMountain(position, size) || isSnow(position, size) || isCity(position, size) || isField(position, size) || isIndustry(position, size);
}

function validNewStation (point) {
    if (isCity(point)) return true;
    if (isWater(point) || (isMountain(point) && !isSnow(point))) return false;
    if (getStation(point, MIN_DISTANCE_BETWEEN_CITIES)) return false;
    return true;
}

class Station {
    constructor (position) {
        this.position = position;
        this.rails = [];
        this.lastResourceGathered = -RESOURCE_COLLECTION_COOLDOWN_TICKS;
    }
}

class Industry {
    constructor (position, requests, offers) {
        this.position = position;
        this.requests = requests;
        this.offers = offers;
    }
}

function isCity (point) {
    for (let i = 0; i < worldState.cities.length; i++) {
        if (distance(point, worldState.cities[i].position) < 1) return true;
    }

    return false;
}

function isStation (point) {
    for (let i = 0; i < worldState.stations.length; i++) {
        if (distance(point, worldState.stations[i].position) < 1) return true;
    }

    return false;
}

function getStation (point, within) {
    for (let i = 0; i < worldState.stations.length; i++) {
        let station = worldState.stations[i];
        if (distance(point, station.position) < (within || 1)) return station;
    }
}

function getOrCreateStation (point) {
    for (let i = 0; i < worldState.stations.length; i++) {
        let station = worldState.stations[i];
        if (distance(point, station.position) < 1) return station;
    }

    let station = new Station(point);
    worldState.stations.push(station);
    graph.addNode(nodeName(station), station);
    return station;
}

function getCity (position, within) {
    for (let i = 0; i < worldState.cities.length; i++) {
        let city = worldState.cities[i];
        if (distance(position, city.position) < (within || 1)) return city;
    }
}

function nodeName (station) {
    return station.position.x + "x" + station.position.y;
}

let graph = createGraph();
let pathFinder = ngraphPath.nba(graph, {
	distance(fromNode, toNode, link) {
		return link.data.distance;
	},
	heuristic(fromNode, toNode) {
		return distance(fromNode.data.position, toNode.data.position);
	}
});

/* State management */
let worldState = {
	speed: 1,
	rails: [],
	trees: [],
	water: [],
	cities: [],
	mountains: [],
	snow: [],
	stations: [],
	transports: [],
	forests: [],
	fields: [],
	industries: [],

	lastTick: Date.now(),
	tick: 0
};

/* Functions to add to the state */
function addTree (position) { worldState.trees.push({ position }); clientState.redrawBackground = true; }
function addWater (position, size) { worldState.water.push({ position, size }); }
function addMountain (position, size) { worldState.mountains.push({ position, size }); }
function addSnow (position, size) { worldState.snow.push({ position, size }); }
function addCity (position, size) { worldState.cities.push({ position, size, requests: [], offers: []}); }
function addIndustry (position, requests, offers) { worldState.industries.push(new Industry(position, requests, offers)); }
function addField (position, size) { worldState.fields.push({ position, size, lastResourceGathered: -CONSTANTS.FIELD_COOLDOWN_TICKS }); }

/* Loops and stuff */
function update () {
	let diff = Date.now() - worldState.lastTick;
	let started = Date.now();
	let ticked = false;

	while (diff >= CONSTANTS.TICK_TIME && Date.now() - started < 100) {
		for (var i = 0; i < worldState.speed; i++) updateTick();
		
		worldState.lastTick += CONSTANTS.TICK_TIME;
		diff -= CONSTANTS.TICK_TIME;
		ticked = true;
	}

	if (diff >= 1000) console.log("We have fallen more than 1s behind, remaining deficit: ", Date.now() - worldState.lastTick, "ms");
	return ticked;
}

function updateTick () {
	worldState.tick++;

	worldState.cities.forEach(cityTick);
	worldState.transports.forEach(transport => transport.tick());

	// Remove delivered transports
	for (var i = 0; i < worldState.transports.length; i++) {
		if (worldState.transports[i].delivered) {
			worldState.transports.splice(i, 1);
			i--;
		}
	}
}

function loop () {
	if (update()) {
		let worldStateText = JSON.stringify(worldState);
		wss.clients.forEach(function each(client) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(worldStateText);
			}
		});
	}
	
	setTimeout(loop, 0);
}

setTimeout(loop, 0);

/* Cities and stuff */

function cityTick (city) {
	// Requests
	if (worldState.tick % 20 == 0 && city.requests.length > 0) {
		for (var i = 0; i < city.requests.length; i++) {
			if (collectResource(city, city.requests[i])) break;
		}
	}

	if (city.requests.filter(r => r == "🌽").length < 3 && Math.random() < 0.005 * Math.log2(city.size) / 3)
		city.requests.push("🌽");

	// Deliver offers
	if (worldState.tick % 20 == 0 && city.offers.length > 0) {
		for (var i = 0; i < city.offers.length; i++) {
			if (deliverOffer(city, city.offers[i])) break;
		}
	}
}

function collectResource (city, resource) {
	var path =
		resource == "🌳" ?
		findAndCutTree(city.position) :
		resource == "💧" ?
		findWater(city.position) :
		resource == "🏔️" ?
		findStone(city.position) : 
		resource == "🌽" ?
		findCorn(city.position) : [];

	if (!path || path.length == 0) return false;
	createTransport(resource, path, city);
	city.requests.splice(city.requests.indexOf(resource), 1);
}

class Transport {
	constructor (type, path, target, reverse) {
		this.type = type;
		this.path = path;
		this.target = target;
		this.time = 0;
		this.position = { x: path[reverse ? path.length - 1 : 0].data.position.x, y: path[reverse ? path.length - 1 : 0].data.position.y};
		this.delivered = false;
		this.reverse = reverse;
	}

	tick () {
		if (this.delivered) return;

		if (!this.nextStop()) {
			this.target.deliver(this.type);
			this.delivered = true;
			return;
		}

		let nextStop = this.nextStop();
		let distanceLeft = distance(this.position, nextStop.data.position);
		let ratio = CONSTANTS.DISTANCE_PER_TICK / distanceLeft;

		if (ratio >= 1) this.removeNextStop();
		else {
			this.position.x += (nextStop.data.position.x - this.position.x) * ratio;
			this.position.y += (nextStop.data.position.y - this.position.y) * ratio;
		}
	}

	removeNextStop () {
		let pathElement = this.reverse ? this.path.pop() : this.path.shift();
	}

	nextStop () {
		return this.reverse ? this.path[this.path.length - 2] : this.path[1];
	}
}

/* Adding bigger objects made out of smaller objects */
function addForest (forestPosition, size) {
	worldState.forests.push({ position: forestPosition })
	
	for (let i = 0; i < size; i++) {
		addTreeInForest(forestPosition, i, size);
	}
}

function addTreeInForest (forestPosition, treeIndex, maxSize) {
	let offset = 1.5 * 150 * (treeIndex / maxSize);

	let position = {
		x: Math.round(50 + forestPosition.x + (Math.random() - 0.5) * offset),
		y: Math.round(50 + forestPosition.y + (Math.random() - 0.5) * offset),
	};

	if (!isOccupied(position, CONSTANTS.TREE_RADIUS * 2)) {
		addTree(position);
	}
}

function addSnowedMountain (clusterCenter, sizeModifier) {
	let mountainAmount = 10 + sizeModifier * 20;
	for (let i = 0; i < mountainAmount; i++) {
		let position = {
			x: Math.round(clusterCenter.x + (Math.random() - 0.5) * i * 2),
			y: Math.round(clusterCenter.y + (Math.random() - 0.5) * i * 3),
		};

		let size = mountainAmount / 1.5 - (i / 2);
		if (!isWater(position, size) && !isCity(position, size) && !isField(position, size) && !isIndustry(position, size)) {
			addMountain(position, size);
		}
	}

	let snowAmount = sizeModifier * 10;
	for (let i = 0; i < snowAmount; i++) {
		let position = {
			x: Math.round(clusterCenter.x + (Math.random() - 0.5) * i * 3),
			y: Math.round(clusterCenter.y + (Math.random() - 0.5) * i * 4.5),
		};

		let size = (snowAmount / 1.5) - (i / 2) + Math.random() * 5;

		if (!isWater(position, size) && !isCity(position, size) && !isField(position, size) && !isIndustry(position, size) && isMountain(position, size)) {
			addSnow(position, size);
		}
	}
}

/* State manipulation */
function cutAllTreesNearCity (city) {
	city.size += cutTreesNear(city.position, CONSTANTS.SUCTION_RADIUS);
}

function cutTreesNear (position, radius) {
	let count = 0;
	for (let i = 0; i < worldState.trees.length; i++) {
		let tree = worldState.trees[i];
		if (distance(tree.position, position) < radius) {
			worldState.trees.splice(i, 1);
			i--;
			count++;
		}
	}
	return count;
}


function createTransport (type, path, target, reverse) {
	worldState.transports.push(new Transport(type, path, target, reverse));
}

function isConnected (station1, station2) {
	if (station1 == station2) return true;
	for (var i = 0; i < station1.rails.length; i++) {
		var rail = station1.rails[i];
		if (rail.from == station1 && rail.to == station2 ||
			rail.from == station2 && rail.to == station1) return true;
	}

	return false;
}

function getConnectedStations (station) {
	let stations = [];

	for (var i = 0; i < station.rails.length; i++) {
		if (station.rails[i].from == station) stations.push(station.rails[i].to);
		else if (station.rails[i].to == station) stations.push(station.rails[i].from);
	}

	return stations;
}

function getPath (fromStation, toStation) {
	if (!isStation(fromStation.position) || !isStation(toStation.position))
		throw new Error(`Argument should be a station, was: ${fromStation} and ${toStation}`);

	if (fromStation == toStation) return [{ data: fromStation }];

	return pathFinder.find(nodeName(fromStation), nodeName(toStation));
}

function findFunCity (position) {
	if (!isStation(position)) return;

	let originalStation = getOrCreateStation(position);
	let checked = new Set();
	let toCheck = [originalStation];

	while (toCheck.length > 0) {
		var station = toCheck.shift();
		// Distance check cause original cityStation should not count
		if (distance(station.position, position) > 1 && cityNearStation(station)) return getPath(originalStation, station);
		checked.add(station);
		toCheck.push(...getConnectedStations(station).filter(s => !checked.has(s)))
	}

	return false;
}

function findResource (resource, position, remove, targetHasCooldown) {
	if (!isStation(position)) return;

	let originalStation = getOrCreateStation(position);
	let checked = new Set();
	let toCheck = [originalStation];

	while (toCheck.length > 0) {
		var station = toCheck.shift();
		if (resourceNearStation(resource, station, remove, targetHasCooldown)) return getPath(originalStation, station);
		checked.add(station);
		toCheck.push(...getConnectedStations(station).filter(s => !checked.has(s)))
	}

	return false;
}

function resourceNearStation (resource, station, remove, targetHasCooldown) {
	if (worldState.tick - station.lastResourceGathered < CONSTANTS.RESOURCE_COLLECTION_COOLDOWN_TICKS) return;

	let resourceList = worldState[LIST_FROM_RESOURCE[resource]];

	for (let i = 0; i < resourceList.length; i++) {
		let target = resourceList[i];
		let available = !targetHasCooldown || worldState.tick - field.lastResourceGathered > CONSTANTS.FIELD_COOLDOWN_TICKS;
		if (available && distance(target.position, station.position) < CONSTANTS.SUCTION_RADIUS + (target.size || 0)) {
			station.lastResourceGathered = worldState.tick;
			if (targetHasCooldown) target.lastResourceGathered = worldState.tick;
			if (remove) resourceList.splice(i, 1);
			return target;
		}
	}
}

function cityNearStation (station) {
	if (worldState.tick - station.lastResourceGathered < CONSTANTS.RESOURCE_COLLECTION_COOLDOWN_TICKS) return;
	if (isCity(station.position)) {
		station.lastResourceGathered = worldState.tick;
		return true;
	}
}

/* Websocket stuff */
function handleMessage (message) {
	if (this.readyState === WebSocket.OPEN) {
		this.send("messageBack");
	}
}
 
wss = new WebSocket.Server({
	port: 8080,
	maxPayload: 1024
});
 
wss.on('connection', function connection(ws, req) {
	ws.ip = req.socket.remoteAddress;
	ws.isAlive = true;
	ws.on('pong', () => ws.isAlive = true);
	ws.on('message', handleMessage);
	ws.lastSent = 0;
	console.log("New connection", ws.ip);
	ws.send(JSON.stringify(CONSTANTS));
});
 
interval = setInterval(function ping () {
	wss.clients.forEach(function each(ws) {
		if (ws.isAlive === false) return ws.terminate();
		ws.isAlive = false;
		ws.ping();
	});
}, 30000);
 
wss.on('close', function close() {
	clearInterval(interval);
});

function distance (p1, p2) {
	let a = p1.x - p2.x;
	let b = p1.y - p2.y;
	return Math.sqrt(a * a + b * b);
}