// From: https://forum.unity.com/threads/how-does-unityengine-random-initialize-the-state-parameters-of-xorshift-in-random-initstate.1042252/
const createRNG = (seed) => {
    let a = seed >>> 0;
    let b = (Math.imul(a, 1812433253) + 1);
    let c = (Math.imul(b, 1812433253) + 1);
    let d = (Math.imul(c, 1812433253) + 1);
    
    const next = () => {
        const t1 = a ^ (a << 11);
        const t2 = t1 ^ (t1 >>> 8);
        a = b; b = c; c = d;
        d = d ^ (d >>> 19) ^ t2;
        return d;
    };
    
    const random = () => {
        const value = next() << 9 >>> 0;
        return (value / 4294967295);
    };
    // In Unity, random range uses 1.0 - value for some reason.
    const randomRange = () => {
        return 1.0 - random();
    };
    
    return {
        random,
        randomRange
    };
};

const WIND_PERIOD = 1000 / 8;
const WEATHER_PERIOD = 666;
const DAY_LENGTH = 1800;
const INTRO_TIME = 2040;

const weathers = {
    "Clear": { windMin: 0.1, windMax: 0.6 },
    "Rain": { windMin: 0.5, windMax: 1.0 },
    "Misty": { windMin: 0.1, windMax: 0.3 },
    "ThunderStorm": { windMin: 0.8, windMax: 1.0 },
    "LightRain": { windMin: 0.1, windMax: 0.6 },
    "DeepForest Mist": { windMin: 0.1, windMax: 0.6 },
    "SwampRain": { windMin: 0.1, windMax: 0.3 },
    "SnowStorm": { windMin: 0.8, windMax: 1.0 },
    "Snow": { windMin: 0.1, windMax: 0.6 },
    "Heath clear": { windMin: 0.4, windMax: 0.8 },
    "Twilight Snowstorm": { windMin: 0.7, windMax: 1.0 },
    "Twilight Snow": { windMin: 0.3, windMax: 0.6 },
    "Twilight Clear": { windMin: 0.2, windMax: 0.6 },
    "Ashrain": { windMin: 0.1, windMax: 0.5 },
    "Darklands dark": { windMin: 0.1, windMax: 0.6 }
};

const data = {
    intro: [
        { weight: 1, name: "ThunderStorm" }, 
    ],
    meadows: [
        { weight: 5.0, name: "Clear" },  
        { weight: 0.2, name: "Rain"}, 
        { weight: 0.2, name: "Misty" },
        { weight: 0.2, name: "ThunderStorm" },
        { weight: 0.2, name: "LightRain" },  
    ],
    blackforest: [
        { weight: 2.0, name: "DeepForest Mist" },  
        { weight: 0.1, name: "Rain"}, 
        { weight: 0.1, name: "Misty" },
        { weight: 0.1, name: "ThunderStorm" },
    ],
    swamp: [
        { weight: 1.0, name: "SwampRain" },
    ],
    mountain: [
        { weight: 1.0, name: "SnowStorm" },
        { weight: 5.0, name: "Snow" },
    ],
    plains: [
        { weight: 2.0, name: "Heath clear" },
        { weight: 0.4, name: "Misty" },
        { weight: 0.4, name: "LightRain" },
    ],
    ocean: [
        { weight: 0.1, name: "Rain" },
        { weight: 0.1, name: "LightRain" },
        { weight: 0.1, name: "Misty" },
        { weight: 1.0, name: "Clear" },
        { weight: 0.1, name: "ThunderStorm" },
    ],
    deepnorth: [
        { weight: 0.5, name: "Twilight Snowstorm" },
        { weight: 1.0, name: "Twilight Snow" },
        { weight: 1.0, name: "Twilight Clear" },
    ],
    ashlands: [
        { weight: 1.0, name: "Ashrain" },
    ],
    mistlands: [
        { weight: 1.0, name: "Darklands dark" },
    ],
};

const getWeather = (weathers, roll) => {
    const total = weathers.reduce((prev, curr) => prev + curr.weight, 0);
    const weight = total * roll;
    let sum = 0;
    for (let i = 0; i < weathers.length; i++) {
        sum += weathers[i].weight;
        if (weight < sum) return weathers[i].name;
    }
    return weathers[weathers.length - 1].name;
};

const addOctave = (time, octave, wind) => {
    const period = Math.floor(time / (WIND_PERIOD * 8 / octave));
    const rng = createRNG(period);
    wind.angle += rng.random() * 2 * Math.PI / octave;
    wind.intensity += (rng.random() - 0.5) / octave;
};

const getGlobalWind = (time) => {
    const wind = {
        angle: 0,
        intensity: 0.5,
        from: 0,
    };
    addOctave(time, 1, wind);
    addOctave(time, 2, wind);
    addOctave(time, 4, wind);
    addOctave(time, 8, wind);
    wind.intensity = Math.min(1, Math.max(0, wind.intensity));
    wind.angle = wind.angle * 180 / Math.PI;
    while (wind.angle > 180) wind.angle -= 360;
    wind.from = wind.angle + 180;
    while (wind.from > 180) wind.from -= 360;
    return wind;
};

const getBiome = (biome, weatherPeriod) => weatherPeriod < 3 ? data.intro : data[biome];

const getRng = (seed) => {
    const rng = createRNG(seed);
    return rng.randomRange();
};

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

const MORNING = 0.15; // 03:36
const NIGHT = 0.85;   // 20:24

// Display order: Ocean first, then the land biomes in game progression.
const biomes = [
    { id: "ocean", name: "Ocean", color: "#4a9ad6" },
    { id: "meadows", name: "Meadows", color: "#8fbf4d" },
    { id: "blackforest", name: "Black Forest", color: "#4f9a6a" },
    { id: "swamp", name: "Swamp", color: "#a08a4e" },
    { id: "mountain", name: "Mountain", color: "#c9d6df" },
    { id: "plains", name: "Plains", color: "#e0b94a" },
    { id: "mistlands", name: "Mistlands", color: "#9c88c8" },
    { id: "ashlands", name: "Ashlands", color: "#e0573a" },
    { id: "deepnorth", name: "Deep North", color: "#9fdcef" },
];

const weatherInfo = {
    "Clear": { label: "Clear", icon: "weather/clear-day", tone: "clear" },
    "Rain": { label: "Rain", icon: "weather/rain", tone: "rain" },
    "Misty": { label: "Misty", icon: "weather/mist", tone: "mist" },
    "ThunderStorm": { label: "Thunderstorm", icon: "weather/thunderstorms-rain", tone: "storm" },
    "LightRain": { label: "Light rain", icon: "weather/drizzle", tone: "rain" },
    "DeepForest Mist": { label: "Forest mist", icon: "weather/fog", tone: "forest" },
    "SwampRain": { label: "Swamp rain", icon: "weather/raindrops", tone: "swamp" },
    "SnowStorm": { label: "Snowstorm", icon: "weather/snow", tone: "snowstorm" },
    "Snow": { label: "Snow", icon: "weather/snowflake", tone: "snow" },
    "Heath clear": { label: "Clear", icon: "weather/haze-day", tone: "clear" },
    "Twilight Snowstorm": { label: "Snowstorm", icon: "weather/partly-cloudy-night-hail", tone: "snowstorm" },
    "Twilight Snow": { label: "Snow", icon: "weather/partly-cloudy-night-snow", tone: "snow" },
    "Twilight Clear": { label: "Twilight", icon: "weather/starry-night", tone: "twilight" },
    "Ashrain": { label: "Ash rain", icon: "weather/smoke", tone: "ash" },
    "Darklands dark": { label: "Dark mist", icon: "weather/fog-night", tone: "dark" },
};

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const compass = (deg) => COMPASS[Math.round((deg + 360) / 45) % 8];

const icon = (path, cls = "") => `<img class="ico ${cls}" src="icons/${path}.svg" alt="">`;

const percent = (value) => (100 * value).toFixed(0) + "%";

const clock = (secs) => {
    const realSecs = (secs % DAY_LENGTH) * 24 * 3600 / DAY_LENGTH;
    const hours = Math.floor(realSecs / 3600);
    const minutes = Math.floor((realSecs - 3600 * hours) / 60);
    return hours.toString().padStart(2, "0") + ":" + minutes.toString().padStart(2, "0");
};

const timeLabel = (secs) => secs < INTRO_TIME ? "Intro" : clock(secs);

const dayPhase = (secs) => {
    if (secs < INTRO_TIME) return { icon: "day/midnight", cls: "intro", name: "Intro" };
    const f = (secs % DAY_LENGTH) / DAY_LENGTH;
    if (f < MORNING || f >= NIGHT) return { icon: "day/midnight", cls: "night", name: "Night" };
    if (f < 0.35) return { icon: "day/sunrise", cls: "dawn", name: "Morning" };
    if (f < 0.65) return { icon: "day/noon", cls: "day", name: "Day" };
    return { icon: "day/sunset", cls: "dusk", name: "Evening" };
};

// Hue goes from cold blue (calm) to ember red (gale).
const windHue = (value) => Math.round(200 - 190 * value);

// Arrow on a compass dial pointing where the wind blows to, north up.
// The arrow image itself points south-east, hence the -135°.
const windArrow = (deg) => `<span class="compass"><img class="arrow" src="icons/wind/arrow.svg" alt="" style="transform:rotate(${(deg - 135).toFixed(1)}deg)"></span>`;

// Wind strength shown on the Beaufort scale icons (0-12).
const gustIcon = (value) => icon("wind/wind-beaufort-" + Math.round(value * 12), "gust");

// Every wind or weather change starts a new column.
const buildTimeline = (day) => {
    const steps = [];
    const endTime = (day + 1) * DAY_LENGTH;
    for (let time = Math.max(INTRO_TIME - WIND_PERIOD, day * DAY_LENGTH); time < endTime;) {
        const windPeriod = Math.floor(time / WIND_PERIOD);
        const weatherPeriod = Math.floor(time / WEATHER_PERIOD);
        const weatherStart = steps.length > 0 && steps[steps.length - 1].weatherPeriod !== weatherPeriod;
        steps.push({ time, weatherPeriod, weatherStart, roll: getRng(weatherPeriod), wind: getGlobalWind(time) });
        if (time < INTRO_TIME) time = INTRO_TIME;
        else time = Math.min((windPeriod + 1) * WIND_PERIOD, (weatherPeriod + 1) * WEATHER_PERIOD);
    }
    return steps;
};

const renderHead = (day, steps) => {
    const times = steps.map(({ time, weatherStart }) => {
        const phase = dayPhase(time);
        return `<th class="time ${phase.cls}${weatherStart ? " wx-start" : ""}" title="${phase.name}">${icon(phase.icon, phase.cls)}<span>${timeLabel(time)}</span></th>`;
    }).join("");

    const directions = steps.map(({ wind, weatherStart }) => {
        const to = compass(wind.angle);
        const from = compass(wind.from);
        const title = `From ${from} (${wind.from.toFixed(0)}°) to ${to} (${wind.angle.toFixed(0)}°)`;
        return `<td class="direction${weatherStart ? " wx-start" : ""}" title="${title}">${windArrow(wind.angle)}<span class="dir-text">${from}&rarr;${to}</span></td>`;
    }).join("");

    const strengths = steps.map(({ wind, weatherStart }) => {
        return `<td class="strength${weatherStart ? " wx-start" : ""}" style="--h:${windHue(wind.intensity)};--v:${wind.intensity.toFixed(3)}" title="Global wind ${percent(wind.intensity)}">${gustIcon(wind.intensity)}<span>${percent(wind.intensity)}</span></td>`;
    }).join("");

    return `
        <thead>
            <tr class="row-time"><th class="label corner">Day <b>${day}</b></th>${times}</tr>
            <tr class="row-direction"><th class="label">Wind direction</th>${directions}</tr>
            <tr class="row-strength"><th class="label">Wind strength</th>${strengths}</tr>
        </thead>`;
};

const renderBiome = (biome, steps) => {
    // Consecutive steps in the same weather period merge into one cell.
    const groups = [];
    steps.forEach((step) => {
        const last = groups[groups.length - 1];
        if (last && last.weatherPeriod === step.weatherPeriod) last.span++;
        else groups.push({ ...step, span: 1 });
    });

    const weatherCells = groups.map((group, i) => {
        const name = getWeather(getBiome(biome.id, group.weatherPeriod), group.roll);
        const info = weatherInfo[name];
        const next = groups[i + 1];
        const until = next ? timeLabel(next.time) : "24:00";
        const title = `${info.label} (${name}), ${timeLabel(group.time)} – ${until}`;
        const size = group.span === 1 ? " narrow" : group.span === 2 ? " short" : "";
        return `<td class="weather${group.weatherStart ? " wx-start" : ""}${size}" colspan="${group.span}" title="${title}"><span class="wx-time">${timeLabel(group.time)}</span><div class="wx">${icon(info.icon)}<span class="wx-name">${info.label}</span></div></td>`;
    }).join("");

    const windCells = steps.map(({ weatherPeriod, weatherStart, roll, wind }) => {
        const name = getWeather(getBiome(biome.id, weatherPeriod), roll);
        const { windMin, windMax } = weathers[name];
        const intensity = windMin + (windMax - windMin) * wind.intensity;
        return `<td class="wind${weatherStart ? " wx-start" : ""}" style="--h:${windHue(intensity)};--v:${intensity.toFixed(3)}" title="${biome.name} wind ${percent(intensity)}"><span class="pct">${percent(intensity)}</span><span class="bar"><i style="width:${percent(intensity)}"></i></span></td>`;
    }).join("");

    return `
        <tbody class="biome" style="--biome:${biome.color}">
            <tr class="row-weather"><th class="label biome-label" rowspan="2">${icon("biomes/" + biome.id, "biome-ico")}<span>${biome.name}</span></th>${weatherCells}</tr>
            <tr class="row-wind">${windCells}</tr>
        </tbody>`;
};

const forecast = () => {
    const day = Math.max(1, Math.floor(Number($("#day").val())) || 1);
    $("#day").val(day);
    const steps = buildTimeline(day);
    const cols = `<colgroup><col class="col-label">${"<col>".repeat(steps.length)}</colgroup>`;
    $("#forecast").html(cols + renderHead(day, steps) + biomes.map((biome) => renderBiome(biome, steps)).join(""));
};

const changeDay = (delta) => {
    $("#day").val(Math.max(1, (Number($("#day").val()) || 1) + delta));
    forecast();
};

$(document).ready(function () {
    $("#run").on('click', forecast);
    $("#day").on('change', forecast);
    $("#prev").on('click', () => changeDay(-1));
    $("#next").on('click', () => changeDay(1));
    forecast();
});
