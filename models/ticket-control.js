const path = require('path');
const fs = require('fs');

class Ticket {
    constructor(numero, escritorio) {
        this.numero = numero;
        this.escritorio = escritorio;
    }
}

class TicketControl {

    constructor() {
        this.ultimo   = 0;
        this.today    = this._todayLocalISO();  // YYYY-MM-DD (local)
        this.tickets  = [];
        this.ultimos4 = [];
        this.init();
    }

    _todayLocalISO() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    _toLocalISO(date) {
        const d = date instanceof Date ? date : new Date(date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    get toJson() {
        return {
            ultimo: this.ultimo,
            date: this.today,
            tickets: this.tickets,
            ultimos4: this.ultimos4
        };
    }

    init() {
        const dbpath = path.join(__dirname, '../db/data.json');

        try {
            if (fs.existsSync(dbpath)) {
                const raw = fs.readFileSync(dbpath, 'utf8');
                const data = JSON.parse(raw);
                const fileDate = typeof data?.date === 'string' ? data.date : null;

                // Preferred: new schema with ISO date
                if (fileDate === this.today) {
                    this.ultimo   = Number(data.ultimo) || 0;
                    this.tickets  = Array.isArray(data.tickets) ? data.tickets : [];
                    this.ultimos4 = Array.isArray(data.ultimos4) ? data.ultimos4 : [];
                    return;
                }

                // Legacy compatibility: if file has old "hoy" (day-of-month) and file mtime is today, accept it and migrate
                if (typeof data?.hoy === 'number') {
                    const stat = fs.statSync(dbpath);
                    const fileLocalDay = this._toLocalISO(stat.mtime);
                    if (fileLocalDay === this.today && data.hoy === new Date().getDate()) {
                        this.ultimo   = Number(data.ultimo) || 0;
                        this.tickets  = Array.isArray(data.tickets) ? data.tickets : [];
                        this.ultimos4 = Array.isArray(data.ultimos4) ? data.ultimos4 : [];
                        // Migrate to new schema with ISO date
                        this.today = this._todayLocalISO();
                        this.guardarDB();
                        return;
                    }
                }
            }
        } catch (e) {
            // Corrupt or unreadable file -> reset below
        }

        // New day or invalid file -> reset
        this.ultimo   = 0;
        this.tickets  = [];
        this.ultimos4 = [];
        this.today    = this._todayLocalISO();
        this.guardarDB();
    }

    guardarDB() {
        const dir    = path.join(__dirname, '../db');
        const dbpath = path.join(dir, 'data.json');
        const tmp    = path.join(dir, 'data.tmp');
        const bak    = path.join(dir, 'data.bak.json');
        const data   = JSON.stringify(this.toJson, null, 2);

        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(tmp, data, 'utf8');

            if (fs.existsSync(bak)) {
                try { fs.unlinkSync(bak); } catch {}
            }
            if (fs.existsSync(dbpath)) {
                fs.renameSync(dbpath, bak);
            }
            fs.renameSync(tmp, dbpath);
        } catch (err) {
            // Rollback if possible
            try {
                if (fs.existsSync(bak)) {
                    if (fs.existsSync(dbpath)) fs.unlinkSync(dbpath);
                    fs.renameSync(bak, dbpath);
                }
            } catch {}
            throw err;
        } finally {
            try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}
        }
    }

    siguiente() {
        this.ultimo += 1;
        const ticket = new Ticket(this.ultimo, null);
        this.tickets.push(ticket);
        this.guardarDB();
        return 'Ticket Creado: ' + ticket.numero;
    }

    atenderTicket(escritorio) {
        if (this.tickets.length === 0) {
            return null;
        }

        const ticket = this.tickets.shift();
        ticket.escritorio = escritorio;

        this.ultimos4.unshift(ticket);
        if (this.ultimos4.length > 4) {
            this.ultimos4.splice(-1, 1);
        }
        this.guardarDB();
        return ticket;
    }

    /**
     * Carga estado desde un objeto validado y persiste.
     * Ignora la fecha del payload y establece la fecha al día actual.
     */
    loadFromObject(payload) {
        if (typeof payload !== 'object' || payload === null) {
            throw new Error('Payload inválido');
        }

        const ultimo = Number(payload.ultimo);
        const tickets = Array.isArray(payload.tickets) ? payload.tickets : [];
        const ultimos4 = Array.isArray(payload.ultimos4) ? payload.ultimos4 : [];

        if (!Number.isFinite(ultimo) || ultimo < 0) {
            throw new Error('Campo "ultimo" inválido');
        }

        const isTicket = (t) =>
            t &&
            typeof t.numero === 'number' &&
            (typeof t.escritorio === 'string' || t.escritorio === null);

        if (!tickets.every(isTicket) || !ultimos4.every(isTicket)) {
            throw new Error('Formato de tickets inválido');
        }

        this.ultimo   = ultimo;
        this.tickets  = tickets.map(t => new Ticket(Number(t.numero), t.escritorio ?? null));
        this.ultimos4 = ultimos4.slice(0, 4).map(t => new Ticket(Number(t.numero), t.escritorio ?? null));

        // Normaliza a día actual
        this.today = this._todayLocalISO();
        this.guardarDB();
        return this.toJson;
    }

}

module.exports = TicketControl;