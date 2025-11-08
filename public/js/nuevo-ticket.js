// Nuevo Ticket (modernizado)
const lblNuevoTicket = document.querySelector('#lblNuevoTicket');
const btnCrear = document.querySelector('#btnCrear') || document.querySelector('button');
const statusEl = document.querySelector('#status');

const socket = io();

function setStatus(text) {
  if (statusEl) statusEl.textContent = text || '';
}

function setDisabled(disabled) {
  if (btnCrear) btnCrear.disabled = disabled;
}

socket.on('connect', () => {
  setDisabled(false);
  setStatus('Conectado');
  setTimeout(() => setStatus(''), 1000);
});

socket.on('disconnect', () => {
  setDisabled(true);
  setStatus('Sin conexión…');
});

socket.on('ultimo-ticket', (ultimo) => {
  lblNuevoTicket.innerText = 'Ultimo Ticket: ' + ultimo;
});

if (btnCrear) {
  btnCrear.addEventListener('click', () => {
    if (btnCrear.disabled) return;
    setDisabled(true);
    setStatus('Generando…');

    socket.emit('siguiente-ticket', null, (ticket) => {
      lblNuevoTicket.innerText = ticket;
      setStatus('Listo');
      setTimeout(() => setStatus(''), 800);
      setDisabled(false);
    });
  });
}

