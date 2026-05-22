export class StatsTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.shots = 0;
    this.hits = 0;
    this.headshots = 0;
    this.kills = 0;
    this.deaths = 0;
    this.damage = 0;
    this.survivalRuns = [];
    this.spawnTime = performance.now() / 1000;
    this.startedAt = performance.now() / 1000;
  }

  recordShot() {
    this.shots += 1;
  }

  recordHit({ headshot, damage }) {
    this.hits += 1;
    this.damage += damage;
    if (headshot) this.headshots += 1;
  }

  recordKill() {
    this.kills += 1;
  }

  recordDeath(now) {
    this.deaths += 1;
    this.survivalRuns.push(Math.max(0, now - this.spawnTime));
    this.spawnTime = now;
  }

  averageSurvival(now) {
    const runs = [...this.survivalRuns];
    if (this.deaths === 0) runs.push(Math.max(0, now - this.spawnTime));
    if (!runs.length) return 0;
    return runs.reduce((sum, value) => sum + value, 0) / runs.length;
  }

  score(now) {
    const accuracy = this.shots ? this.hits / this.shots : 0;
    const headRate = this.hits ? this.headshots / this.hits : 0;
    const survival = this.averageSurvival(now);
    return Math.round(this.kills * 900 + this.damage * 4 + accuracy * 1800 + headRate * 1200 + survival * 18 - this.deaths * 450);
  }
}
