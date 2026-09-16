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

const MORNING = 0.15;   // 03:36, "Day N" popup, the sky begins to lighten
const DAYLIGHT = 0.25;  // 06:00, full daylight
const DUSK = 0.75;      // 18:00, the sky begins to darken
const NIGHT = 0.85;     // 20:24, "You feel cold"
const SUNRISE = MORNING * DAY_LENGTH; // Seconds from midnight to the "Day N" popup.

const sunriseOf = (day) => day * DAY_LENGTH + SUNRISE;

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

// Weather, day cycle and Beaufort icons are animated; icons/static/ holds frozen copies (see icons/make-static.js).
const ANIMATION_KEY = "valheim-weather-animated-icons";
const ANIMATED_ICON = /^icons\/(?:static\/)?((?:weather|day|wind\/wind-beaufort)[\w\/-]*\.svg)$/;

const loadAnimatedIcons = () => {
    try {
        const saved = localStorage.getItem(ANIMATION_KEY);
        if (saved !== null) return saved === "1";
    } catch (e) { /* Storage unavailable: fall back to the system setting. */ }
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

let animatedIcons = loadAnimatedIcons();

const iconSrc = (file) => {
    const match = ("icons/" + file).match(ANIMATED_ICON);
    return match ? (animatedIcons ? "icons/" : "icons/static/") + match[1] : "icons/" + file;
};

const icon = (path, cls = "") => `<img class="ico ${cls}" src="${iconSrc(path + ".svg")}" alt="">`;

// Switches every icon already on the page, including the ones written in index.html.
const applyIconAnimation = () => {
    $("img").each(function () {
        const match = this.getAttribute("src").match(ANIMATED_ICON);
        if (match) this.setAttribute("src", iconSrc(match[1]));
    });
    $("#anim-toggle").attr("aria-pressed", String(animatedIcons));
};

const toggleIconAnimation = () => {
    animatedIcons = !animatedIcons;
    try { localStorage.setItem(ANIMATION_KEY, animatedIcons ? "1" : "0"); } catch (e) { /* Not remembered. */ }
    applyIconAnimation();
};

const percent = (value) => (100 * value).toFixed(0) + "%";

const clock = (secs) => {
    const realSecs = (secs % DAY_LENGTH) * 24 * 3600 / DAY_LENGTH;
    const hours = Math.floor(realSecs / 3600);
    const minutes = Math.floor((realSecs - 3600 * hours) / 60);
    return hours.toString().padStart(2, "0") + ":" + minutes.toString().padStart(2, "0");
};

const timeLabel = (secs) => secs < INTRO_TIME ? "Intro" : clock(secs);

// Real time as m:ss, with a sign when asked (for time relative to sunrise).
const duration = (secs, signed = false) => {
    const total = Math.floor(Math.abs(secs));
    const text = Math.floor(total / 60) + ":" + (total % 60).toString().padStart(2, "0");
    if (!signed) return text;
    return (secs < 0 ? "&minus;" : "+") + text;
};

const dayPhase = (secs) => {
    if (secs < INTRO_TIME) return { icon: "day/midnight", cls: "intro", name: "Intro" };
    const f = (secs % DAY_LENGTH) / DAY_LENGTH;
    if (f < MORNING || f >= NIGHT) return { icon: "day/midnight", cls: "night", name: "Night" };
    if (f < DAYLIGHT) return { icon: "day/sunrise", cls: "dawn", name: "Sunrise" };
    if (f < DUSK) return { icon: "day/noon", cls: "day", name: "Day" };
    return { icon: "day/sunset", cls: "dusk", name: "Sunset" };
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
    const times = steps.map(({ time, weatherStart }, col) => {
        const phase = dayPhase(time);
        const since = time - sunriseOf(day);
        const title = `${phase.name}, ${duration(since)} real time ${since < 0 ? "before" : "after"} sunrise`;
        return `<th class="time ${phase.cls}${weatherStart ? " wx-start" : ""}" data-col="${col}" title="${title}">${icon(phase.icon, phase.cls)}<span>${timeLabel(time)}</span><span class="since">${duration(since, true)}</span></th>`;
    }).join("");

    const directions = steps.map(({ wind, weatherStart }, col) => {
        const to = compass(wind.angle);
        const from = compass(wind.from);
        const title = `From ${from} (${wind.from.toFixed(0)}°) to ${to} (${wind.angle.toFixed(0)}°)`;
        return `<td class="direction${weatherStart ? " wx-start" : ""}" data-col="${col}" title="${title}">${windArrow(wind.angle)}<span class="dir-text">${from}&rarr;${to}</span></td>`;
    }).join("");

    const strengths = steps.map(({ wind, weatherStart }, col) => {
        return `<td class="strength${weatherStart ? " wx-start" : ""}" data-col="${col}" style="--h:${windHue(wind.intensity)};--v:${wind.intensity.toFixed(3)}" title="Global wind ${percent(wind.intensity)}">${gustIcon(wind.intensity)}<span>${percent(wind.intensity)}</span></td>`;
    }).join("");

    return `
        <thead>
            <tr class="row-time"><th class="label corner">Day <b>${day}</b><span class="since-label">since sunrise</span></th>${times}</tr>
            <tr class="row-direction"><th class="label">Wind direction</th>${directions}</tr>
            <tr class="row-strength"><th class="label">Wind strength</th>${strengths}</tr>
        </thead>`;
};

const renderBiome = (biome, steps) => {
    // Consecutive steps in the same weather period merge into one cell.
    const groups = [];
    steps.forEach((step, col) => {
        const last = groups[groups.length - 1];
        if (last && last.weatherPeriod === step.weatherPeriod) last.span++;
        else groups.push({ ...step, col, span: 1 });
    });

    const weatherCells = groups.map((group, i) => {
        const name = getWeather(getBiome(biome.id, group.weatherPeriod), group.roll);
        const info = weatherInfo[name];
        const next = groups[i + 1];
        const until = next ? timeLabel(next.time) : "24:00";
        const title = `${info.label} (${name}), ${timeLabel(group.time)} – ${until}`;
        const size = group.span === 1 ? " narrow" : group.span === 2 ? " short" : "";
        return `<td class="weather${group.weatherStart ? " wx-start" : ""}${size}" colspan="${group.span}" data-col="${group.col}" data-end="${group.col + group.span - 1}" title="${title}"><span class="wx-time">${timeLabel(group.time)}</span><div class="wx">${icon(info.icon)}<span class="wx-name">${info.label}</span></div></td>`;
    }).join("");

    const windCells = steps.map(({ weatherPeriod, weatherStart, roll, wind }, col) => {
        const name = getWeather(getBiome(biome.id, weatherPeriod), roll);
        const { windMin, windMax } = weathers[name];
        const intensity = windMin + (windMax - windMin) * wind.intensity;
        return `<td class="wind${weatherStart ? " wx-start" : ""}" data-col="${col}" style="--h:${windHue(intensity)};--v:${intensity.toFixed(3)}" title="${biome.name} wind ${percent(intensity)}"><span class="pct">${percent(intensity)}</span><span class="bar"><i style="width:${percent(intensity)}"></i></span></td>`;
    }).join("");

    return `
        <tbody class="biome" style="--biome:${biome.color}">
            <tr class="row-weather"><th class="label biome-label" rowspan="2">${icon("biomes/" + biome.id, "biome-ico")}<span>${biome.name}</span></th>${weatherCells}</tr>
            <tr class="row-wind">${windCells}</tr>
        </tbody>`;
};

let shown = { day: 0, steps: [], column: -1 };

const selectedDay = () => Math.max(1, Math.floor(Number($("#day").val())) || 1);

const forecast = () => {
    const day = selectedDay();
    $("#day").val(day);
    const steps = buildTimeline(day);
    const cols = `<colgroup><col class="col-label">${"<col>".repeat(steps.length)}</colgroup>`;
    $("#forecast").html(cols + renderHead(day, steps) + biomes.map((biome) => renderBiome(biome, steps)).join(""));
    shown = { day, steps, column: -1 };
    updateTracker();
};

const changeDay = (delta) => {
    $("#day").val(selectedDay() + delta);
    forecast();
};

// ---------------------------------------------------------------------------
// Live tracker: follows the game clock in real time from a known sunrise.
// ---------------------------------------------------------------------------

const TRACKER_KEY = "valheim-weather-tracker";

// { anchorReal: ms timestamp, anchorWorld: game seconds at that moment, paused, pausedWorld }
let tracker = null;
let trackedDay = null;

const loadTracker = () => {
    try { return JSON.parse(localStorage.getItem(TRACKER_KEY)); } catch (e) { return null; }
};

const saveTracker = () => {
    try {
        if (tracker) localStorage.setItem(TRACKER_KEY, JSON.stringify(tracker));
        else localStorage.removeItem(TRACKER_KEY);
    } catch (e) { /* Storage unavailable: tracking still works until reload. */ }
};

const worldNow = () => tracker.paused ? tracker.pausedWorld : tracker.anchorWorld + (Date.now() - tracker.anchorReal) / 1000;

const startTracking = (world) => {
    tracker = { anchorReal: Date.now(), anchorWorld: world, paused: false };
    trackedDay = null;
    saveTracker();
    tick();
};

// Sleeping wakes you at the next sunrise, which may still be ahead on the same calendar day (after midnight).
const sleptToNextDay = () => {
    const next = Math.floor((worldNow() - SUNRISE) / DAY_LENGTH) + 1;
    startTracking(sunriseOf(next));
};

const togglePause = () => {
    if (tracker.paused) tracker = { anchorReal: Date.now(), anchorWorld: tracker.pausedWorld, paused: false };
    else tracker = { ...tracker, paused: true, pausedWorld: worldNow() };
    saveTracker();
    tick();
};

const stopTracking = () => {
    tracker = null;
    trackedDay = null;
    saveTracker();
    updateTracker();
};

// Moves the tracker to a given game time, keeping it paused or running as it was.
const setWorldTime = (world) => {
    if (tracker.paused) tracker = { ...tracker, pausedWorld: world };
    else tracker = { anchorReal: Date.now(), anchorWorld: world, paused: false };
    saveTracker();
    updateTracker();
};

// Game time under a horizontal position in the table (pixels from the table's left edge).
const timeAtX = (x) => {
    const ths = $("#forecast th.time").get();
    const { day, steps } = shown;
    if (x <= ths[0].offsetLeft) return steps[0].time;
    for (let i = 0; i < ths.length; i++) {
        const th = ths[i];
        if (x < th.offsetLeft + th.offsetWidth) {
            const start = steps[i].time;
            const end = i + 1 < steps.length ? steps[i + 1].time : (day + 1) * DAY_LENGTH;
            return start + (end - start) * (x - th.offsetLeft) / th.offsetWidth;
        }
    }
    // Stay within the shown day so the table doesn't jump to the next one.
    return (day + 1) * DAY_LENGTH - 1;
};

// The handle and the strip above the table both set the time: press to jump, drag to scrub.
const bindNowHandle = () => {
    const scroll = document.querySelector(".scroll");
    const setFromPointer = (e) => setWorldTime(timeAtX(e.clientX - scroll.getBoundingClientRect().left + scroll.scrollLeft));
    document.querySelectorAll(".now-handle, .time-rail").forEach((el) => {
        el.addEventListener("pointerdown", (e) => {
            if (!tracker) return;
            e.preventDefault();
            el.setPointerCapture(e.pointerId);
            $("#now-line").addClass("dragging");
            setFromPointer(e);
        });
        el.addEventListener("pointermove", (e) => {
            if (tracker && el.hasPointerCapture(e.pointerId)) setFromPointer(e);
        });
        el.addEventListener("lostpointercapture", () => $("#now-line").removeClass("dragging"));
    });
};

const tick = () => {
    if (!tracker) return;
    const day = Math.floor(worldNow() / DAY_LENGTH);
    // Follow the game into the next day, but let the user browse other days in between.
    if (day !== trackedDay) {
        trackedDay = day;
        $("#day").val(day);
        forecast();
    } else {
        updateTracker();
    }
};

const setColumnState = (current) => {
    if (shown.column === current) return;
    shown.column = current;
    $("#forecast [data-col]").each(function () {
        const col = Number(this.dataset.col);
        const end = this.dataset.end === undefined ? col : Number(this.dataset.end);
        this.classList.toggle("past", current >= 0 && end < current);
        this.classList.toggle("now", current >= 0 && col <= current && current <= end);
    });
};

const updateTracker = () => {
    const $line = $("#now-line");
    $("#slept, #pause").prop("disabled", !tracker);
    $("#pause").text(tracker && tracker.paused ? "Resume" : "Pause");
    $("#start").toggleClass("stop", !!tracker).html(tracker ? "&#9632; Stop" : "&#9654; Start day")
        .attr("title", tracker ? "Stop the live tracker" : "Press when the “Day N” popup appears for the selected day");
    $("#tracker").toggleClass("running", !!tracker).toggleClass("paused", !!(tracker && tracker.paused));
    $(".scroll").toggleClass("tracking", !!tracker);
    $("#now-layer").css("width", $("#forecast").outerWidth() + "px");

    if (!tracker) {
        setColumnState(-1);
        $line.prop("hidden", true);
        $("#tracker-status").html(`<b>Live tracker</b> &mdash; choose the day, then press <b>Start day</b> when the &ldquo;Day N&rdquo; popup appears in game.`);
        return;
    }

    const now = worldNow();
    const day = Math.floor(now / DAY_LENGTH);
    const since = now - sunriseOf(day);
    const nextWeather = (Math.floor(now / WEATHER_PERIOD) + 1) * WEATHER_PERIOD - now;
    const nextWind = (Math.floor(now / WIND_PERIOD) + 1) * WIND_PERIOD - now;
    const elsewhere = shown.day !== day ? `<button id="goto-now" type="button" class="link">Show day ${day}</button>` : "";
    $("#tracker-status").html(
        `<span class="live-dot"></span><span class="now-clock">Day ${day} &middot; <span class="num clock-num">${clock(now)}</span></span>` +
        `<span class="chip"><b class="num since-num">${duration(since, true)}</b> since sunrise</span>` +
        `<span class="chip">Weather roll in <b class="num">${duration(nextWeather)}</b></span>` +
        `<span class="chip">Wind change in <b class="num wind-num">${duration(nextWind)}</b></span>` +
        (tracker.paused ? `<span class="chip paused-chip">Paused</span>` : "") + elsewhere);

    const steps = shown.steps;
    let current = -1;
    if (shown.day === day) {
        steps.forEach((step, i) => { if (step.time <= now) current = i; });
    }
    setColumnState(current);

    const th = $(`#forecast th.time[data-col="${current}"]`).get(0);
    if (!th) {
        $line.prop("hidden", true);
        return;
    }
    const start = steps[current].time;
    const end = current + 1 < steps.length ? steps[current + 1].time : (day + 1) * DAY_LENGTH;
    $line.prop("hidden", false).css("left", th.offsetLeft + th.offsetWidth * Math.min(1, (now - start) / (end - start)) + "px");
};

$(document).ready(function () {
    $("#run").on('click', forecast);
    $("#day").on('change', forecast);
    $("#prev").on('click', () => changeDay(-1));
    $("#next").on('click', () => changeDay(1));
    $("#start").on('click', () => tracker ? stopTracking() : startTracking(sunriseOf(selectedDay())));
    $("#slept").on('click', sleptToNextDay);
    $("#pause").on('click', togglePause);
    $("#tracker").on('click', '#goto-now', () => { trackedDay = null; tick(); });
    bindNowHandle();
    $("#anim-toggle").on('click', toggleIconAnimation);
    applyIconAnimation();

    tracker = loadTracker();
    forecast();
    tick();
    setInterval(tick, 250);
});
