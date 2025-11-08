/**
* Pantalla pública (modernizada)
* - Diseño dark-first, TV-friendly
* - Sonido solo al atender (no en sincronización inicial)
* - Control de volumen/mute persistido en localStorage
*/

// Elementos de UI
const heroNumber = document.getElementById('heroNumber');
const heroDesk   = document.getElementById('heroDesk');

const t2 = document.getElementById('t2');
const d2 = document.getElementById('d2');
const t3 = document.getElementById('t3');
const d3 = document.getElementById('d3');
const t4 = document.getElementById('t4');
const d4 = document.getElementById('d4');

// Controles de sonido
const muteBtn  = document.getElementById('muteBtn');
const volRange = document.getElementById('volRange');

// Socket
const socket = io();

// Sonido (solo al servir ticket)
const audio = new Audio('./audio/new-ticket.mp3');
audio.preload = 'auto';

const LS_KEYS = {
 muted: 'public_sound_muted',
 volume: 'public_sound_volume'
};

let isMuted = false;
let volume = 0.3; // 30% por defecto (Profile B)
let initialSynced = false;
let prevTopNumber = null;

// Helpers de estado de sonido
function loadSoundPrefs() {
 try {
   const m = localStorage.getItem(LS_KEYS.muted);
   const v = localStorage.getItem(LS_KEYS.volume);
   if (m !== null) isMuted = m === 'true';
   if (v !== null) {
     const num = Number(v);
     if (Number.isFinite(num)) volume = Math.max(0, Math.min(1, num));
   }
 } catch {}
 applySoundUI();
}

function saveSoundPrefs() {
 try {
   localStorage.setItem(LS_KEYS.muted, String(isMuted));
   localStorage.setItem(LS_KEYS.volume, String(volume));
 } catch {}
}

function applySoundUI() {
 if (volRange) volRange.value = Math.round(volume * 100);
 if (muteBtn) muteBtn.classList.toggle('active', !isMuted);
 audio.muted = isMuted;
 audio.volume = volume;
}

function playServeSound() {
 if (isMuted) return;
 try {
   audio.currentTime = 0;
   audio.volume = volume;
   audio.play().catch(() => {
     // Posible bloqueo de autoplay: no forzar, el usuario puede interactuar con los controles
   });
 } catch {}
}

// UI updates
function setHero(ticket) {
 if (ticket) {
   heroNumber.textContent = `Ticket: ${ticket.numero}`;
   heroDesk.textContent = ticket.escritorio || '—';
   heroNumber.classList.remove('fade-in');
   void heroNumber.offsetWidth; // reflow para reiniciar animación
   heroNumber.classList.add('fade-in');
 } else {
   heroNumber.textContent = '—';
   heroDesk.textContent = '—';
 }
}

function setTile(elNum, elDesk, ticket) {
 if (!elNum || !elDesk) return;
 if (ticket) {
   elNum.textContent = `Ticket: ${ticket.numero}`;
   elDesk.textContent = ticket.escritorio || '—';
 } else {
   elNum.textContent = '—';
   elDesk.textContent = '—';
 }
}

// Eventos de socket
socket.on('estado-actual', (payload) => {
 const [a, b, c, d] = payload || [];

 // Actualizar UI
 setHero(a);
 setTile(t2, d2, b);
 setTile(t3, d3, c);
 setTile(t4, d4, d);

 // Sonido solo si no es la primera sincronización y el top cambió
 const newTop = a?.numero ?? null;
 if (initialSynced && newTop !== null && newTop !== prevTopNumber) {
   playServeSound();
 }
 prevTopNumber = newTop;
 if (!initialSynced) initialSynced = true;
});

// Controles de sonido
if (muteBtn) {
 muteBtn.addEventListener('click', () => {
   isMuted = !isMuted;
   applySoundUI();
   saveSoundPrefs();
 });
}

if (volRange) {
 volRange.addEventListener('input', (e) => {
   const v = Number(e.target.value);
   if (Number.isFinite(v)) {
     volume = Math.max(0, Math.min(1, v / 100));
     applySoundUI();
     saveSoundPrefs();
   }
 });
}

// Cargar preferencias al iniciar
loadSoundPrefs();