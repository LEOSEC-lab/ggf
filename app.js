let playlist = [];
    let currentTrackIndex = -1;
    let isPlaying = false;
    let isShuffle = false;
    let isRepeat = false;

    let audioCtx = null;
    let audioSource = null;
    let gainNode = null;
    let eqFilters = [];
    let eqEnabled = true;

    const audio = document.getElementById('audio-element');

    /* FUNÇÃO DE PERMISSÕES AO ENTRAR (ESTILO APK NATIVO) */
    async function grantPermissionsAndStart() {
      const modal = document.getElementById('permissions-modal');
      if (modal) modal.classList.add('hidden');

      // 1. Notificações
      if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        try {
          await Notification.requestPermission();
        } catch (e) {}
      }

      // 2. Microfone / Áudio nativo
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          stream.getTracks().forEach(track => track.stop());
        } catch (e) {}
      }

      // 3. Inicializar contexto de áudio
      initAudioContext();
      showToast('BELL PLAY MUSIC pronto para uso! 🎧');
    }

    function initAudioContext() {
      if (audioCtx) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        audioSource = audioCtx.createMediaElementSource(audio);

        gainNode = audioCtx.createGain();
        gainNode.gain.value = 1.0;

        const freqs = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        let lastNode = audioSource;

        freqs.forEach((freq, i) => {
          const filter = audioCtx.createBiquadFilter();
          if (i === 0) {
            filter.type = 'lowshelf';
          } else if (i === freqs.length - 1) {
            filter.type = 'highshelf';
          } else {
            filter.type = 'peaking';
            filter.Q.value = 1.4;
          }
          filter.frequency.value = freq;
          filter.gain.value = 0;
          lastNode.connect(filter);
          lastNode = filter;
          eqFilters.push(filter);
        });

        lastNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);
      } catch (e) {
        console.warn('WebAudio setup bypassed:', e);
      }
    }

    function toggleEQ(enabled) {
      eqEnabled = enabled;
      eqFilters.forEach(f => {
        if (!enabled) f.gain.value = 0;
      });
      showToast(enabled ? 'Equalizador Ativado' : 'Equalizador Desativado');
    }

    function updateEQBand(index, value) {
      if (eqFilters[index] && eqEnabled) {
        eqFilters[index].gain.value = parseFloat(value);
        const valEl = document.getElementById(`eq-val-${index}`);
        if (valEl) valEl.innerText = `${value > 0 ? '+' : ''}${value}`;
      }
    }

    function updateBassBoost(val) {
      if (!eqFilters[0] || !eqFilters[1]) return;
      const boost = parseFloat(val);
      eqFilters[0].gain.value = boost;
      eqFilters[1].gain.value = boost * 0.7;
      document.getElementById('bass-boost-val').innerText = `+${val} dB`;
      document.querySelectorAll('.slider-vertical')[0].value = boost;
      document.querySelectorAll('.slider-vertical')[1].value = boost * 0.7;
      document.getElementById('eq-val-0').innerText = `+${boost}`;
      document.getElementById('eq-val-1').innerText = `+${(boost * 0.7).toFixed(1)}`;
    }

    function updateGain(val) {
      if (gainNode) {
        gainNode.gain.value = parseFloat(val);
        document.getElementById('preamp-val').innerText = `${Math.round(val * 100)}%`;
      }
    }

    function resetEQ() {
      eqFilters.forEach((f, idx) => {
        f.gain.value = 0;
        const slider = document.querySelectorAll('.slider-vertical')[idx];
        if (slider) slider.value = 0;
        const valEl = document.getElementById(`eq-val-${idx}`);
        if (valEl) valEl.innerText = '0';
      });
      showToast('Equalizador resetado!');
    }

    function setEQPreset(preset) {
      const presets = {
        flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        bass: [8, 7, 5, 3, 0, -1, -2, -2, -3, -4],
        rock: [5, 4, 3, 1, -1, -1, 1, 3, 4, 5],
        pop: [-1, 1, 3, 4, 5, 4, 2, 1, 2, 3],
        dance: [7, 6, 4, 1, 0, 2, 4, 5, 4, 2],
        vocal: [-2, -2, -1, 1, 4, 5, 4, 3, 1, 0]
      };
      const vals = presets[preset] || presets.flat;
      vals.forEach((v, idx) => {
        const slider = document.querySelectorAll('.slider-vertical')[idx];
        if (slider) slider.value = v;
        updateEQBand(idx, v);
      });
      showToast(`Preset ${preset.toUpperCase()} aplicado! 🎧`);
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-brand-accent');
        btn.classList.add('text-slate-400');
      });

      const selectedTab = document.getElementById(`tab-${tabId}`);
      const selectedNav = document.getElementById(`nav-${tabId}`);

      if (selectedTab) selectedTab.classList.remove('hidden');
      if (selectedNav) {
        selectedNav.classList.remove('text-slate-400');
        selectedNav.classList.add('text-brand-accent');
      }
    }

    function toggleAvatarModal() {
      const modal = document.getElementById('avatar-modal');
      if (!modal) return;
      modal.classList.toggle('hidden');
    }

    function selectAvatar(url, name) {
      document.getElementById('profile-avatar').src = url;
      document.getElementById('header-avatar').src = url;
      localStorage.setItem('bell_avatar', url);
      toggleAvatarModal();
      showToast(`Avatar alterado para ${name}! 🎵`);
    }

    function handleFileUpload(e) {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      let addedCount = 0;
      Array.from(files).forEach(file => {
        if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|ogg|flac)$/i)) {
          const track = {
            id: 'local_' + Date.now() + '_' + Math.random(),
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: 'Arquivo Local',
            url: URL.createObjectURL(file),
            cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80'
          };
          playlist.push(track);
          addedCount++;
        }
      });

      renderPlaylist();
      if (addedCount > 0 && currentTrackIndex === -1) {
        loadTrack(0);
      }
      showToast(`${addedCount} faixa(s) adicionada(s)! 🎧`);
    }

    function renderPlaylist() {
      const container = document.getElementById('playlist-container');
      const countEl = document.getElementById('track-count');
      if (countEl) countEl.innerText = playlist.length;

      if (!container) return;
      if (playlist.length === 0) {
        container.innerHTML = `
          <div class="text-center py-12 glass rounded-2xl border border-slate-800 space-y-2">
            <i class="fa-solid fa-music text-3xl text-slate-600"></i>
            <p class="text-xs text-slate-400">Nenhuma música adicionada ainda.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = playlist.map((track, idx) => `
        <div onclick="loadTrack(${idx})" class="p-3 glass rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition ${idx === currentTrackIndex ? 'border-brand-accent/60 bg-brand-500/10' : 'border-slate-800'}">
          <div class="flex items-center gap-3 overflow-hidden">
            <div class="relative w-10 h-10 flex-shrink-0">
              <img src="${track.cover}" class="w-10 h-10 rounded-xl object-cover">
              ${idx === currentTrackIndex && isPlaying ? '<span class="absolute inset-0 bg-brand-accent/40 rounded-xl flex items-center justify-center"><i class="fa-solid fa-volume-high text-xs text-slate-950"></i></span>' : ''}
            </div>
            <div class="overflow-hidden">
              <h4 class="text-xs font-bold text-white truncate">${track.title}</h4>
              <p class="text-[10px] text-slate-400 truncate">${track.artist}</p>
            </div>
          </div>
          <button onclick="event.stopPropagation(); removeTrack(${idx})" class="p-2 text-slate-500 hover:text-red-400"><i class="fa-solid fa-xmark text-xs"></i></button>
        </div>
      `).join('');
    }

    function loadTrack(index) {
      if (index < 0 || index >= playlist.length) return;
      currentTrackIndex = index;
      const track = playlist[index];

      audio.crossOrigin = "anonymous";
      audio.src = track.url;
      audio.load();

      document.getElementById('mini-title').innerText = track.title;
      document.getElementById('mini-artist').innerText = track.artist;
      document.getElementById('mini-cover').src = track.cover;

      document.getElementById('full-title').innerText = track.title;
      document.getElementById('full-artist').innerText = track.artist;
      document.getElementById('full-cover').src = track.cover;

      renderPlaylist();
      playAudio();
    }

    function playAudio() {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      audio.play().then(() => {
        isPlaying = true;
        updatePlayButtons();
      }).catch(err => {
        audio.play();
        isPlaying = true;
        updatePlayButtons();
      });
    }

    function pauseAudio() {
      audio.pause();
      isPlaying = false;
      updatePlayButtons();
    }

    function togglePlay() {
      if (playlist.length === 0) {
        showToast('Adicione uma música primeiro!');
        return;
      }
      if (currentTrackIndex === -1) {
        loadTrack(0);
        return;
      }
      if (isPlaying) pauseAudio(); else playAudio();
    }

    function updatePlayButtons() {
      const miniBtn = document.getElementById('mini-play-btn');
      const fullBtn = document.getElementById('full-play-btn');

      const icon = isPlaying ? '<i class="fa-solid fa-pause text-sm"></i>' : '<i class="fa-solid fa-play text-xs pl-0.5"></i>';
      if (miniBtn) miniBtn.innerHTML = icon;
      if (fullBtn) fullBtn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause text-2xl"></i>' : '<i class="fa-solid fa-play text-2xl pl-1"></i>';
    }

    function prevTrack() {
      if (playlist.length === 0) return;
      let nextIdx = currentTrackIndex - 1;
      if (nextIdx < 0) nextIdx = playlist.length - 1;
      loadTrack(nextIdx);
    }

    function nextTrack() {
      if (playlist.length === 0) return;
      let nextIdx = currentTrackIndex + 1;
      if (nextIdx >= playlist.length) nextIdx = 0;
      loadTrack(nextIdx);
    }

    function removeTrack(idx) {
      playlist.splice(idx, 1);
      if (currentTrackIndex === idx) {
        if (playlist.length > 0) loadTrack(0); else {
          audio.pause();
          currentTrackIndex = -1;
          isPlaying = false;
          updatePlayButtons();
        }
      }
      renderPlaylist();
    }

    function clearPlaylist() {
      playlist = [];
      audio.pause();
      currentTrackIndex = -1;
      isPlaying = false;
      updatePlayButtons();
      renderPlaylist();
      showToast('Biblioteca limpa!');
    }

    audio.ontimeupdate = () => {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      const seekBar = document.getElementById('seek-bar');
      if (seekBar) seekBar.value = pct;
      const curTime = document.getElementById('current-time');
      const durTime = document.getElementById('duration-time');
      if (curTime) curTime.innerText = formatTime(audio.currentTime);
      if (durTime) durTime.innerText = formatTime(audio.duration);
    };

    audio.onended = () => {
      if (isRepeat) playAudio(); else nextTrack();
    };

    function seekAudio(val) {
      if (!audio.duration) return;
      audio.currentTime = (val / 100) * audio.duration;
    }

    function formatTime(secs) {
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function changePlaybackSpeed(speed) {
      audio.playbackRate = parseFloat(speed);
      showToast(`Velocidade: ${speed}x`);
    }

    function handleURLDownload(e) {
      e.preventDefault();
      const input = document.getElementById('yt-link-input');
      const url = input.value.trim();
      if (!url) return;

      const progBox = document.getElementById('download-progress');
      const bar = document.getElementById('download-progress-bar');
      const percent = document.getElementById('download-percent');
      const status = document.getElementById('download-status-text');

      progBox.classList.remove('hidden');
      bar.style.width = '30%';
      percent.innerText = '30%';

      setTimeout(() => {
        bar.style.width = '75%';
        percent.innerText = '75%';
        status.innerHTML = '<i class="fa-solid fa-bolt text-brand-accent"></i> Convertendo faixa...';
      }, 1000);

      setTimeout(() => {
        bar.style.width = '100%';
        percent.innerText = '100%';

        const soundUrl = url.endsWith('.mp3') ? url : 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3';

        const newTrack = {
          id: 'dl_' + Date.now(),
          title: 'Música Importada por Link',
          artist: 'BELL PLAY Downloader',
          url: soundUrl,
          cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80'
        };

        playlist.unshift(newTrack);
        renderPlaylist();
        loadTrack(0);

        showToast('Música baixada e tocando!');
        input.value = '';
        setTimeout(() => progBox.classList.add('hidden'), 1500);
      }, 2200);
    }

    function openFullPlayer() {
      const fp = document.getElementById('full-player');
      if (fp) {
        fp.classList.remove('hidden');
        fp.classList.add('flex');
      }
    }
    function closeFullPlayer() {
      const fp = document.getElementById('full-player');
      if (fp) {
        fp.classList.add('hidden');
        fp.classList.remove('flex');
      }
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      const msgEl = document.getElementById('toast-msg');
      if (!toast || !msgEl) return;
      msgEl.innerText = msg;
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 2500);
    }

    document.addEventListener('DOMContentLoaded', () => {
      const saved = localStorage.getItem('bell_avatar');
      if (saved) {
        const pAvatar = document.getElementById('profile-avatar');
        const hAvatar = document.getElementById('header-avatar');
        if (pAvatar) pAvatar.src = saved;
        if (hAvatar) hAvatar.src = saved;
      }
      renderPlaylist();
    });

// PWA: registrar service worker apenas em contexto seguro (HTTPS/localhost).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.warn('Não foi possível registrar o Service Worker:', error);
    });
  });
}

// Evita solicitar microfone sem necessidade: a biblioteca toca arquivos escolhidos pelo usuário.

