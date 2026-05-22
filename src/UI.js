import { DIFFICULTIES, GAME_MODES, WEAPON } from './config.js';
import { formatPercent } from './utils.js';

const modeDescriptions = {
  static: '가만히 있는 봇을 빠르게 맞춥니다.',
  moving: '좌우로 움직이는 봇을 추적합니다.',
  peek: '엄폐물 뒤에서 나오는 봇을 상대합니다.',
  duel: '봇 한 명과 실전처럼 싸웁니다.',
  wave: '계속 등장하는 봇을 처치합니다.',
  nightmare: '가장 어려운 봇과 생존 대결을 합니다.'
};

const difficultyDescriptions = {
  easy: '반응이 느리고 명중률이 낮습니다.',
  normal: '기본 연습용 난이도입니다.',
  hard: '반응이 빠르고 압박이 강합니다.',
  nightmare: '매우 빠르게 반응하고 예측 사격을 합니다.'
};

export class UI {
  constructor(root) {
    this.root = root;
    this.selectedMode = 'static';
    this.selectedDifficulty = 'normal';
    this.callbacks = {};
    this.render();
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  emit(event, payload) {
    this.callbacks[event]?.(payload);
  }

  render() {
    this.root.innerHTML = `
      <div class="game-shell">
        <div id="menu" class="overlay">
          <div class="menu-panel">
            <div class="brand-row">
              <div>
                <h1>Vector Range</h1>
                <p>브라우저에서 바로 플레이하는 오리지널 3D FPS 에임 연습장입니다.</p>
              </div>
              <div class="status-chip">Three.js WebGL</div>
            </div>
            <div class="menu-grid">
              <section>
                <h2 class="section-title">훈련 모드</h2>
                <div class="mode-list">
                  ${Object.entries(GAME_MODES).map(([id, mode]) => `
                    <button class="mode-button ${id === this.selectedMode ? 'active' : ''}" data-mode="${id}">
                      <strong>${mode.label}</strong>
                      <span>${modeDescriptions[id]}</span>
                    </button>
                  `).join('')}
                </div>
              </section>
              <section>
                <h2 class="section-title">난이도</h2>
                <div class="difficulty-list">
                  ${Object.entries(DIFFICULTIES).map(([id, difficulty]) => `
                    <button class="difficulty-button ${id === this.selectedDifficulty ? 'active' : ''}" data-difficulty="${id}">
                      <strong>${difficulty.label}</strong>
                      <span>${difficultyDescriptions[id]}</span>
                    </button>
                  `).join('')}
                </div>
              </section>
            </div>
            <section style="margin-top: 22px;">
              <h2 class="section-title">조작법</h2>
              <div class="controls-grid">
                <div><span class="key">W A S D</span>이동</div>
                <div><span class="key">마우스</span>시점 이동</div>
                <div><span class="key">Space</span>점프</div>
                <div><span class="key">Shift</span>걷기 / 달리기 전환</div>
                <div><span class="key">R</span>재장전</div>
                <div><span class="key">1-7</span>무기 교체</div>
                <div><span class="key">좌클릭</span>발사</div>
                <div><span class="key">우클릭</span>정조준</div>
                <div><span class="key">ESC</span>메뉴</div>
              </div>
            </section>
            <div class="actions">
              <button id="start-button" class="primary-button">훈련 시작</button>
            </div>
            <p class="hint-text">시작하면 마우스가 게임 화면에 고정됩니다. 1-7번으로 소총, 저격소총, 권총을 교체합니다.</p>
          </div>
        </div>

        <div id="hud" class="hud hidden">
          <div class="hud-top">
            <div class="hud-group">
              <div class="hud-tile"><span>모드</span><strong id="hud-mode">-</strong></div>
              <div class="hud-tile"><span>난이도</span><strong id="hud-difficulty">-</strong></div>
              <div class="hud-tile"><span>시간</span><strong id="hud-time">0</strong></div>
            </div>
            <div class="hud-group">
              <div class="hud-tile"><span>처치</span><strong id="hud-kills">0</strong></div>
              <div class="hud-tile"><span>사망</span><strong id="hud-deaths">0</strong></div>
            </div>
          </div>
          <div class="crosshair"></div>
          <div id="scope-overlay" class="scope-overlay hidden">
            <div class="scope-shade top"></div>
            <div class="scope-shade bottom"></div>
            <div class="scope-shade left"></div>
            <div class="scope-shade right"></div>
            <div class="scope-view">
              <div class="scope-cross vertical"></div>
              <div class="scope-cross horizontal"></div>
              <div class="scope-dot"></div>
              <div class="scope-mark top"></div>
              <div class="scope-mark bottom"></div>
              <div class="scope-mark left"></div>
              <div class="scope-mark right"></div>
            </div>
          </div>
          <div id="message" class="message hidden"></div>
          <div id="mobile-controls" class="mobile-controls">
            <div class="touch-pad" aria-label="이동 버튼">
              <button class="touch-button touch-up" data-touch="forward">▲</button>
              <button class="touch-button touch-left" data-touch="left">◀</button>
              <button class="touch-button touch-right" data-touch="right">▶</button>
              <button class="touch-button touch-down" data-touch="backward">▼</button>
            </div>
            <div class="touch-actions" aria-label="전투 버튼">
              <button class="touch-button action secondary" data-touch-tap="weapon">무기</button>
              <button class="touch-button action secondary" data-touch-tap="reload">장전</button>
              <button class="touch-button action secondary" data-touch="jump">점프</button>
              <button class="touch-button action aim" data-touch="ads">정조준</button>
              <button class="touch-button action fire" data-touch="fire">발사</button>
            </div>
          </div>
          <div class="hud-bottom">
            <div class="hud-group">
              <div class="hud-tile"><span>체력</span><strong id="hud-health">150</strong></div>
              <div class="hud-tile"><span>탄약</span><strong id="hud-ammo">25 / 150</strong></div>
              <div class="hud-tile"><span>무기</span><strong id="hud-weapon">소총</strong></div>
            </div>
            <div class="hud-group">
              <div class="hud-tile"><span>명중률</span><strong id="hud-accuracy">0%</strong></div>
              <div class="hud-tile"><span>헤드샷</span><strong id="hud-headshot">0%</strong></div>
            </div>
          </div>
        </div>

        <div id="results" class="overlay hidden">
          <div class="result-panel">
            <h2>훈련 결과</h2>
            <div id="result-stats" class="stats-grid"></div>
            <div class="actions">
              <button id="restart-button" class="primary-button">다시 시작</button>
              <button id="menu-button" class="ghost-button">메인 메뉴</button>
            </div>
          </div>
        </div>
      </div>
    `;
    this.bind();
  }

  bind() {
    this.root.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        this.selectedMode = button.dataset.mode;
        this.updateSelections();
      });
    });
    this.root.querySelectorAll('[data-difficulty]').forEach((button) => {
      button.addEventListener('click', () => {
        this.selectedDifficulty = button.dataset.difficulty;
        this.updateSelections();
      });
    });
    this.root.querySelector('#start-button').addEventListener('click', () => this.emit('start', {
      mode: this.selectedMode,
      difficulty: this.selectedDifficulty
    }));
    this.root.querySelector('#restart-button').addEventListener('click', () => this.emit('restart'));
    this.root.querySelector('#menu-button').addEventListener('click', () => this.showMenu());
  }

  mountCanvas(canvas) {
    this.root.querySelector('.game-shell').prepend(canvas);
  }

  updateSelections() {
    this.root.querySelectorAll('[data-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === this.selectedMode);
    });
    this.root.querySelectorAll('[data-difficulty]').forEach((button) => {
      button.classList.toggle('active', button.dataset.difficulty === this.selectedDifficulty);
    });
  }

  showMenu() {
    this.root.querySelector('#menu').classList.remove('hidden');
    this.root.querySelector('#hud').classList.add('hidden');
    this.root.querySelector('#results').classList.add('hidden');
    this.emit('menu');
  }

  showHud(mode, difficulty) {
    this.root.querySelector('#menu').classList.add('hidden');
    this.root.querySelector('#results').classList.add('hidden');
    this.root.querySelector('#hud').classList.remove('hidden');
    this.root.querySelector('#hud-mode').textContent = mode.label;
    this.root.querySelector('#hud-difficulty').textContent = difficulty.label;
  }

  updateHud({ player, weapon, stats, remaining, weaponName, scoped, message }) {
    this.root.querySelector('#hud-health').textContent = player.dead ? '리스폰' : Math.ceil(player.health);
    this.root.querySelector('#hud-ammo').textContent = weapon.reloadTimer > 0
      ? '재장전'
      : `${weapon.ammo} / ${weapon.reserve}`;
    this.root.querySelector('#hud-weapon').textContent = weaponName;
    this.root.querySelector('#hud-time').textContent = Math.max(0, Math.ceil(remaining));
    this.root.querySelector('#hud-kills').textContent = stats.kills;
    this.root.querySelector('#hud-deaths').textContent = stats.deaths;
    this.root.querySelector('#hud-accuracy').textContent = formatPercent(stats.hits, stats.shots);
    this.root.querySelector('#hud-headshot').textContent = formatPercent(stats.headshots, stats.hits);
    this.root.querySelector('#scope-overlay').classList.toggle('hidden', !scoped);
    this.root.querySelector('.crosshair').classList.toggle('hidden', scoped);
    const msg = this.root.querySelector('#message');
    if (message) {
      msg.textContent = message;
      msg.classList.remove('hidden');
    } else {
      msg.classList.add('hidden');
    }
  }

  showResults(stats, now) {
    this.root.querySelector('#hud').classList.add('hidden');
    this.root.querySelector('#results').classList.remove('hidden');
    const avg = stats.averageSurvival(now);
    const rows = [
      ['총 발사', stats.shots],
      ['명중', stats.hits],
      ['명중률', formatPercent(stats.hits, stats.shots)],
      ['헤드샷', stats.headshots],
      ['헤드샷률', formatPercent(stats.headshots, stats.hits)],
      ['처치', stats.kills],
      ['사망', stats.deaths],
      ['평균 생존', `${avg.toFixed(1)}초`],
      ['최종 점수', stats.score(now)]
    ];
    this.root.querySelector('#result-stats').innerHTML = rows.map(([label, value]) => `
      <div class="stat-card"><span>${label}</span><strong>${value}</strong></div>
    `).join('');
  }
}
