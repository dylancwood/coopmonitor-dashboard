'use strict';

var config = require('config');
var hapi = require('hapi');
var good = require('good');
var m2x = require('m2x');
var wreck = require('wreck');
var url = require('url');
var socketio = require('socket.io');

var m2xClient = new m2x(config.get('m2x.apiKey'));
var apiKey = config.get('m2x.apiKey');

var server = new hapi.Server();

server.connection({ port: 3000 });

var options = {
    reporters: [{
        reporter: require('good-console'),
        args:[{ log: '*', request: '*', response: '*' }]
    }]
};

server.register({
    register: require('good'),
    options: options
}, function (err) {
    if (err) {
        console.error(err);
    } else {
        server.start(function () {
            console.log('Server running at:', server.info.uri);
        });
    }
});

var io = socketio(server.listener);

var ioHandler = function (socket) {
    socket.emit('welcome', {
        message: 'Hello from Hapi!',
        version: hapi.version
    });

    // simple echo service
    var pingHandler = function(data) {
        socket.emit('pong', data)
    };

    // handle door open and close messages
    var handleDoorActionRequest = function(data) {
        console.log('doorChangePlease received');
        console.dir(data);
        socket.broadcast('doorChangePlease', data);
    };

    //handle state change notice
    var handleStateChangeNotice = function(data) {
        console.log('coopStateChanged received');
        socket.broadcast('coopStateChanged', {});
    };

    socket.on('ping', pingHandler);
    socket.on('doorChangePlease', handleDoorActionRequest);
    socket.on('coopStateChanged', handleStateChangeNotice);
};

io.on('connection', ioHandler)

server.route(
    [
        {
            method: 'GET',
            path: '/{param*}',
            handler: {
                directory: {
                    path: 'public'
                }
            }

        },
        {
            method: 'GET',
            path: '/m2x/{param*}',
            handler: {
                proxy: {
                    mapUri: function(request, callback) {
                        var urlObj = {
                            protocol: 'https',
                            host: 'api-m2x.att.com',
                            pathname: 'v2' + request.path.replace(/^\/m2x/, ''),
                            query: request.query
                        };
                        
                        var uri = url.format(urlObj);
                        var headers = { 'X-M2X-KEY': apiKey };
                        callback(null, uri, headers);
                    }
                }
            }
        },
        {
            method: 'GET',
            path: '/m2xConfig',
            handler: function(request, reply) {
                var m2xConfig = {
                    deviceId: config.get('m2x.deviceId'),
                    streams: config.get('m2x.streams'),
                    urlSeed: config.get('m2x.urlSeed')
                }
                reply(JSON.stringify(m2xConfig));
            }
        }
    ]
);

