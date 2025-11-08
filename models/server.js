const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const { socketController, ticketControl } = require('../sockets/controller');

class server{
    constructor(){
        this.app    = express();
        this.port   = process.env.PORT || 8080;

        // Allowed CORS origins
        this.allowedOrigins = this._parseAllowedOrigins();

        this.server = require('http').createServer(this.app);
        this.io     = require('socket.io')(this.server, {
            cors: {
                origin: (origin, cb) => {
                    // Allow same-origin (no Origin header) and configured allowlist
                    if (!origin || this.allowedOrigins.includes(origin)) {
                        return cb(null, true);
                    }
                    return cb(new Error('CORS Not Allowed'), false);
                },
                methods: ['GET', 'POST'],
                credentials: true
            }
        });
        this.paths  = {};

        // Middleware
        this.middleware();
        // Routes
        this.routes();
        // Socket events
        this.sockets();
    }

    _parseAllowedOrigins(){
        const env = process.env.CORS_ORIGINS;
        const defaults = [
            `http://localhost:${this.port}`,
            `http://127.0.0.1:${this.port}`
        ];
        if (!env || !env.trim()) return defaults;
        return env.split(',').map(s => s.trim()).filter(Boolean);
    }

    async conectarDB(){
        // Placeholder for future DB connection
        return;
    }

    middleware(){
        // Security headers
        this.app.use(helmet());
        // Compression
        this.app.use(compression());
        // JSON body parsing
        this.app.use(express.json({ limit: '1mb' }));
        // CORS (allowlist)
        this.app.use(cors({
            origin: (origin, cb) => {
                if (!origin || this.allowedOrigins.includes(origin)) {
                    return cb(null, true);
                }
                return cb(new Error('CORS Not Allowed'), false);
            },
            credentials: true
        }));
        // Public directory
        this.app.use(express.static('public'));
    }

    routes(){
        // Health endpoint
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', time: new Date().toISOString() });
        });

        // Export current tickets as JSON
        this.app.get('/api/tickets/export', (req, res) => {
            const data = JSON.stringify(ticketControl.toJson, null, 2);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="tickets.json"');
            res.send(data);
        });

        // Import tickets JSON (validated and persisted atomically)
        this.app.post('/api/tickets/import', (req, res) => {
            try {
                const result = ticketControl.loadFromObject(req.body);
                // Broadcast new state to all clients
                this.io.emit('estado-actual', ticketControl.ultimos4);
                this.io.emit('tickets-pendientes', ticketControl.tickets.length);
                this.io.emit('ultimo-ticket', ticketControl.ultimo);
                res.json({ ok: true, data: result });
            } catch (err) {
                res.status(400).json({ ok: false, error: err?.message || 'Invalid payload' });
            }
        });
    }

    sockets(){
        this.io.on('connection', socketController);
    }

    listen(){
        this.server.listen(this.port, () => {
            console.log('App Corriendo en: ', this.port);
        });
    }
}

module.exports = server;